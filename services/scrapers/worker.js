const path = require('path');
const http = require('http');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const AttomConnector = require('./connectors/attom-connector');
const BCNUniversalConnector = require('./connectors/bcn-universal-connector');
const DavidsonTNProbateConnector = require('./connectors/davidson-tn-probate-connector');

// State-specific connector classes (primary data sources — ATTOM is fallback only)
const IndianaConnector = require('./connectors/indiana-connector');
const NewJerseyConnector = require('./connectors/newjersey-connector');
const NewYorkConnector = require('./connectors/newyork-connector');
const VirginiaConnector = require('./connectors/virginia-connector');

// Non-TN connectors for states with their own public data sources
// Priority 1: These dedicated connectors fire BEFORE the ATTOM fallback
const NON_TN_CONNECTORS = {
  // Louisiana
  'LA_ORLEANS': require('./connectors/orleans-la-connector'),
  'LA_JEFFERSON': require('./connectors/jefferson-la-connector'),
  // Texas
  'TX_HARRIS': require('./connectors/harris-tx-connector'),
  'TX_FORTBEND': require('./connectors/fortbend-tx-connector'),
  // Georgia & Florida
  'GA_FULTON': require('./connectors/fulton-ga-connector'),
  'FL_HILLSBOROUGH': require('./connectors/hillsborough-fl-connector'),
  // Indiana (8 counties)
  'IN_MARION': IndianaConnector,
  'IN_LAKE': IndianaConnector,
  'IN_ALLEN': IndianaConnector,
  'IN_HAMILTON': IndianaConnector,
  'IN_STJOSEPH': IndianaConnector,
  'IN_ELKHART': IndianaConnector,
  'IN_TIPPECANOE': IndianaConnector,
  'IN_VANDERBURGH': IndianaConnector,
  // New Jersey (10 counties)
  'NJ_ESSEX': NewJerseyConnector,
  'NJ_HUDSON': NewJerseyConnector,
  'NJ_BERGEN': NewJerseyConnector,
  'NJ_PASSAIC': NewJerseyConnector,
  'NJ_MIDDLESEX': NewJerseyConnector,
  'NJ_MONMOUTH': NewJerseyConnector,
  'NJ_CAMDEN': NewJerseyConnector,
  'NJ_MERCER': NewJerseyConnector,
  'NJ_UNION': NewJerseyConnector,
  'NJ_OCEAN': NewJerseyConnector,
  // New York (10 counties)
  'NY_NEWYORK': NewYorkConnector,
  'NY_KINGS': NewYorkConnector,
  'NY_QUEENS': NewYorkConnector,
  'NY_BRONX': NewYorkConnector,
  'NY_RICHMOND': NewYorkConnector,
  'NY_NASSAU': NewYorkConnector,
  'NY_SUFFOLK': NewYorkConnector,
  'NY_WESTCHESTER': NewYorkConnector,
  'NY_ERIE': NewYorkConnector,
  'NY_MONROE': NewYorkConnector,
  // Virginia (10 counties)
  'VA_FAIRFAX': VirginiaConnector,
  'VA_RICHMONDCITY': VirginiaConnector,
  'VA_VIRGINIABEACH': VirginiaConnector,
  'VA_NORFOLK': VirginiaConnector,
  'VA_HENRICO': VirginiaConnector,
  'VA_CHESTERFIELD': VirginiaConnector,
  'VA_ARLINGTON': VirginiaConnector,
  'VA_PRINCEWILLIAM': VirginiaConnector,
  'VA_LOUDOUN': VirginiaConnector,
  'VA_HAMPTON': VirginiaConnector,
};

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

// Helper to make local POST requests
function postJSON(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: '127.0.0.1',
      port: process.env.PORT || 4000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runWorker() {
  console.log('=== FORECLOSUREFINDER INGEST WORKER RUNNING ===');

  // Query active counties registry dynamically from the database
  let countiesToScrape = [];
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const res = await pool.query("SELECT county_code FROM counties WHERE is_active = TRUE ORDER BY county_code ASC");
    countiesToScrape = res.rows.map(r => r.county_code);
    console.log(`[Worker] Loaded ${countiesToScrape.length} active county registries from database.`);
  } catch (dbErr) {
    console.error('[Worker] Failed to query active counties from DB, falling back to TN_DAVIDSON:', dbErr.message);
    countiesToScrape = ['TN_DAVIDSON'];
  } finally {
    await pool.end().catch(() => {});
  }

  const targetDate = new Date().toISOString().split('T')[0]; // Current date: YYYY-MM-DD
  
  const attomApiKey = process.env.ATTOM_API_KEY;
  const isReal = attomApiKey && attomApiKey !== 'YOUR_ATTOM_DEVELOPER_API_KEY_HERE' && attomApiKey !== '';
  
  console.log(`[Worker] Data Source Mode: ${isReal ? 'ATTOM API solutions (REAL)' : 'Simulated City-Metadata (MOCK)'}`);
  if (!isReal) {
    console.log('[Worker] TIP: Register for a free API key on the ATTOM Developer Portal and input it in .env to ingest real-world live listings.');
  }

  // Cycle through all counties dynamically
  for (const county of countiesToScrape) {
    const startTime = new Date().toISOString();
    console.log(`\n[Worker] Starting Ingestion: ${county} on ${targetDate}`);

    // Resolve the appropriate connector class(es)
    let scrapers = [];
    let isAttomBased = false;

    if (county.startsWith('TN_')) {
      // All Tennessee counties use BCN Universal Connector (real data, no Python)
      scrapers = [new BCNUniversalConnector(county)];
      // Davidson also gets probate data
      if (county === 'TN_DAVIDSON') {
        scrapers.push(new DavidsonTNProbateConnector());
      }
    } else if (NON_TN_CONNECTORS[county]) {
      // States with dedicated public-data connectors (Priority 1)
      // These use real public-record data; some internally use ATTOM for enrichment
      const attomBasedCounties = ['LA_ORLEANS', 'LA_JEFFERSON', 'TX_HARRIS', 'TX_FORTBEND',
        // New state connectors also use ATTOM for property enrichment
        ...Object.keys(NON_TN_CONNECTORS).filter(k => k.startsWith('IN_') || k.startsWith('NJ_') || k.startsWith('NY_') || k.startsWith('VA_'))
      ];
      if (attomBasedCounties.includes(county)) {
        isAttomBased = true;
      }
      // New state connectors accept countyCode; old ones take no args
      const ConnectorClass = NON_TN_CONNECTORS[county];
      scrapers = [new ConnectorClass(county)];
    } else if (isReal) {
      // Counties with ATTOM API coverage fallback
      isAttomBased = true;
      scrapers = [new AttomConnector(attomApiKey)];
    } else {
      console.log(`[Worker] Skipping ${county} - no connector available and ATTOM_API_KEY not set.`);
      continue;
    }

    // Gate ATTOM-based scrapers/connectors to run strictly once per month on the 1st of the month
    if (isAttomBased) {
      const today = new Date();
      const isFirstOfMonth = today.getDate() === 1;
      const bypassGating = process.env.BYPASS_ATTOM_GATING === 'true';
      if (!isFirstOfMonth && !bypassGating) {
        console.log(`[Worker] Skipping ATTOM county ${county} - ATTOM is scheduled to run once per month on the 1st.`);
        continue;
      }
    }

    for (const scraper of scrapers) {
      console.log(`[Worker] Running scraper: ${scraper.constructor.name} for ${county}`);
      try {
        // 1. Run Search & Extraction
        await scraper.executeSearch(null, targetDate);
        
        // Delay to avoid QPS rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        const records = await scraper.extractRecords(county, targetDate);

        console.log(`[Worker] Scraper ${scraper.constructor.name} discovered ${records.length} records. Streaming to API Gateway...`);

        if (process.env.VERBOSE === 'true') {
          console.log(`[Verbose Worker] Detailed records extracted by ${scraper.constructor.name}:`);
          records.forEach((rec, idx) => {
            console.log(`  [Record ${idx + 1}] Case: ${rec.caseNumber || 'N/A'} | Owner: ${rec.ownerName || 'N/A'} | Address: ${rec.propertyAddress ? `${rec.propertyAddress.street}, ${rec.propertyAddress.city}, ${rec.propertyAddress.state} ${rec.propertyAddress.zip}` : 'NULL'}`);
            if (rec.specificFields) {
              console.log(`    Specific fields: ${JSON.stringify(rec.specificFields)}`);
            }
          });
        }

        // 2. Submit records to API Gateway
        const ingestResult = await postJSON('/api/v1/ingestion/leads', {
          countyCode: county,
          records
        });

        console.log(`[Worker] Ingestion Response:`, JSON.stringify(ingestResult));

        const endTime = new Date().toISOString();

        // 3. Post Scraper Log statistics
        const logResult = await postJSON('/api/v1/ingestion/scrapers-log', {
          countyCode: county,
          startTime,
          endTime,
          status: 'SUCCESS',
          recordsDiscovered: records.length,
          anomaliesDetected: null,
          logOutputUrl: `https://storage.replit.com/logs/scrapers/${county.toLowerCase()}-${targetDate}.log`
        });

        console.log(`[Worker] Logged Scraper Stats successfully:`, JSON.stringify(logResult));

      } catch (err) {
        console.error(`[Worker] Scraper run failed for ${scraper.constructor.name} in ${county}:`, err.message);
        
        // Post failure log status
        try {
          await postJSON('/api/v1/ingestion/scrapers-log', {
            countyCode: county,
            startTime,
            endTime: new Date().toISOString(),
            status: 'FAILED',
            recordsDiscovered: 0,
            anomaliesDetected: `${scraper.constructor.name} failed: ${err.message}`,
            logOutputUrl: null
          });
        } catch (logErr) {
          console.error(`[Worker] Failed to post error logs:`, logErr.message);
        }
      }
    }
  }

  console.log('\n=== WORKER PIPELINE COMPLETED SUCCESSFULLY ===');
}

if (require.main === module) {
  runWorker();
}

module.exports = { runWorker };
