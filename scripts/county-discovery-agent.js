/**
 * ForeclosureFinder AI — Southern County Discovery Agent
 * Discovers public records portals for target Southern metropolitan counties.
 */

const { Pool } = require('pg');

const METRO_COUNTIES = [
  // TENNESSEE
  { state: 'TN', county: 'Davidson', portal: 'Register of Deeds', url: 'https://www.davidsonportal.com', type: 'Recorder', status: 'Production', score: 95 },
  { state: 'TN', county: 'Rutherford', portal: 'Chancery Court Clerk', url: 'https://rutherfordcountytn.gov/chancery-court', type: 'Court Record', status: 'Production', score: 92 },
  { state: 'TN', county: 'Williamson', portal: 'Register of Deeds', url: 'https://williamsoncounty-tn.gov/recorder', type: 'Recorder', status: 'Production', score: 94 },
  { state: 'TN', county: 'Wilson', portal: 'Register of Deeds', url: 'https://wilsoncounty-tn.gov/deeds', type: 'Recorder', status: 'Production', score: 90 },
  { state: 'TN', county: 'Shelby', portal: 'Chancery Court Clerk', url: 'https://chancery.shelbycoprobate.org', type: 'Court Record', status: 'Discovered', score: 85 },
  { state: 'TN', county: 'Fayette', portal: 'Register of Deeds', url: 'https://fayettecountytn.gov/register', type: 'Recorder', status: 'Discovered', score: 80 },
  { state: 'TN', county: 'Tipton', portal: 'Clerk of Court', url: 'https://tiptonclerkofcourt.com', type: 'Court Record', status: 'Discovered', score: 82 },
  { state: 'TN', county: 'Hamilton', portal: 'Register of Deeds', url: 'https://hamiltontn.gov/deeds', type: 'Recorder', status: 'Researching', score: 88 },
  { state: 'TN', county: 'Bradley', portal: 'Chancery Court', url: 'https://bradleycountytn.gov/chancery', type: 'Court Record', status: 'Discovered', score: 78 },
  { state: 'TN', county: 'Knox', portal: 'Register of Deeds', url: 'https://knoxcounty.org/register', type: 'Recorder', status: 'Testing', score: 89 },
  
  // TEXAS
  { state: 'TX', county: 'Harris', portal: 'County Clerk Search', url: 'https://cclerk.hctx.net', type: 'Recorder', status: 'Production', score: 96 },
  { state: 'TX', county: 'Fort Bend', portal: 'County Clerk Search', url: 'https://fortbendcountytx.gov/clerk', type: 'Recorder', status: 'Production', score: 91 },
  { state: 'TX', county: 'Montgomery', portal: 'County Clerk Search', url: 'https://montgomerytx.gov/clerk', type: 'Recorder', status: 'Discovered', score: 85 },
  { state: 'TX', county: 'Brazoria', portal: 'County Clerk Search', url: 'https://brazoriacountytx.gov/clerk', type: 'Recorder', status: 'Discovered', score: 82 },
  { state: 'TX', county: 'Dallas', portal: 'District Clerk Portal', url: 'https://dallascounty.org/clerk', type: 'Court Record', status: 'Researching', score: 89 },
  { state: 'TX', county: 'Collin', portal: 'County Clerk Search', url: 'https://collincountytx.gov/clerk', type: 'Recorder', status: 'Discovered', score: 84 },
  { state: 'TX', county: 'Denton', portal: 'County Clerk Search', url: 'https://dentoncountytx.gov/clerk', type: 'Recorder', status: 'Discovered', score: 83 },
  { state: 'TX', county: 'Tarrant', portal: 'County Clerk Search', url: 'https://tarrantcountytx.gov/clerk', type: 'Recorder', status: 'Testing', score: 87 },
  { state: 'TX', county: 'Travis', portal: 'County Clerk Search', url: 'https://traviscountytx.gov/clerk', type: 'Recorder', status: 'Discovered', score: 88 },
  { state: 'TX', county: 'Bexar', portal: 'County Clerk Search', url: 'https://bexarcountytx.gov/clerk', type: 'Recorder', status: 'Discovered', score: 86 },

  // LOUISIANA
  { state: 'LA', county: 'Orleans', portal: 'Civil Sheriff Division', url: 'https://opcso.org/civil-division', type: 'Sheriff', status: 'Production', score: 93 },
  { state: 'LA', county: 'Jefferson', portal: 'Second Parish Court Clerk', url: 'https://jpclerkofcourt.us/second-parish', type: 'Probate', status: 'Production', score: 91 },
  { state: 'LA', county: 'St Bernard', portal: 'Clerk of Court Search', url: 'https://stbclerk.org', type: 'Recorder', status: 'Discovered', score: 80 },
  { state: 'LA', county: 'St Tammany', portal: 'Clerk of Court Search', url: 'https://sttammanyclerk.org', type: 'Recorder', status: 'Discovered', score: 84 },
  { state: 'LA', county: 'East Baton Rouge', portal: 'Clerk of Court Search', url: 'https://ebrclerkofcourt.org', type: 'Recorder', status: 'Researching', score: 86 },
  
  // GEORGIA
  { state: 'GA', county: 'Fulton', portal: 'Deeds & Land Records', url: 'https://fultonclerk.org/land-deeds', type: 'Recorder', status: 'Production', score: 94 },
  { state: 'GA', county: 'Cobb', portal: 'Clerk of Superior Court', url: 'https://cobbcounty.org/clerk', type: 'Recorder', status: 'Discovered', score: 85 },
  { state: 'GA', county: 'Gwinnett', portal: 'Clerk of Superior Court', url: 'https://gwinnettcounty.org/clerk', type: 'Recorder', status: 'Discovered', score: 83 },
  { state: 'GA', county: 'DeKalb', portal: 'Clerk of Superior Court', url: 'https://dekalbcounty.org/clerk', type: 'Recorder', status: 'Testing', score: 88 },

  // FLORIDA
  { state: 'FL', county: 'Hillsborough', portal: 'Tax Collector Search', url: 'https://hillsborough.realtaxcollect.com', type: 'Tax', status: 'Production', score: 95 },
  { state: 'FL', county: 'Pinellas', portal: 'Clerk of Court Search', url: 'https://pinellasclerk.org', type: 'Recorder', status: 'Discovered', score: 84 },
  { state: 'FL', county: 'Pasco', portal: 'Clerk of Court Search', url: 'https://pascoclerk.com', type: 'Recorder', status: 'Discovered', score: 82 },
  { state: 'FL', county: 'Orange', portal: 'Clerk of Court Search', url: 'https://myorangeclerk.com', type: 'Recorder', status: 'Researching', score: 87 },
  { state: 'FL', county: 'Miami-Dade', portal: 'Clerk of Courts Search', url: 'https://miamidadeclerk.com', type: 'Recorder', status: 'Testing', score: 90 },

  // ALABAMA
  { state: 'AL', county: 'Jefferson', portal: 'Probate Court Search', url: 'https://jeffcoprobatecourt.com', type: 'Probate', status: 'Researching', score: 82 },
  { state: 'AL', county: 'Madison', portal: 'Probate Court Search', url: 'https://madisoncoprobate.org', type: 'Probate', status: 'Discovered', score: 80 },

  // MISSISSIPPI
  { state: 'MS', county: 'Hinds', portal: 'Chancery Court Clerk', url: 'https://hindscountyms.com/chancery', type: 'Court Record', status: 'Discovered', score: 76 },

  // NORTH CAROLINA
  { state: 'NC', county: 'Mecklenburg', portal: 'Register of Deeds', url: 'https://meckrod.org', type: 'Recorder', status: 'Researching', score: 88 },
  { state: 'NC', county: 'Wake', portal: 'Register of Deeds', url: 'https://wakemetrod.org', type: 'Recorder', status: 'Discovered', score: 85 },

  // SOUTH CAROLINA
  { state: 'SC', county: 'Richland', portal: 'Register of Deeds', url: 'https://richlandcountysc.gov/rod', type: 'Recorder', status: 'Discovered', score: 79 },
  { state: 'SC', county: 'Charleston', portal: 'Register of Deeds', url: 'https://charlestoncountysc.gov/rod', type: 'Recorder', status: 'Researching', score: 84 },

  // ARKANSAS
  { state: 'AR', county: 'Pulaski', portal: 'Circuit Clerk Search', url: 'https://pulaskiclerk.com', type: 'Recorder', status: 'Discovered', score: 82 },

  // KENTUCKY
  { state: 'KY', county: 'Jefferson', portal: 'County Clerk Search', url: 'https://jeffersoncountyclerk.org', type: 'Recorder', status: 'Discovered', score: 81 },

  // VIRGINIA
  { state: 'VA', county: 'Chesterfield', portal: 'Circuit Court Clerk', url: 'https://chesterfield.gov/clerk', type: 'Court Record', status: 'Discovered', score: 83 }
];

async function runDiscovery(pool) {
  console.log(`[DiscoveryAgent] Starting discovery across ${METRO_COUNTIES.length} target Southern counties...`);
  const client = await pool.connect();
  let added = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const c of METRO_COUNTIES) {
      // Check if entry already exists in registry
      const dupCheck = await client.query(
        `SELECT id FROM county_discovery_registry WHERE state = $1 AND county = $2 AND portal_name = $3`,
        [c.state, c.county, c.portal]
      );

      // Map captcha/ocr requirement based on platform types
      const captchaRequired = c.type === 'Court Record';
      const ocrRequired = c.type === 'Court Record' || c.type === 'Probate';
      const apiAvailable = c.status === 'Production';

      if (dupCheck.rows.length === 0) {
        // Insert new entry
        await client.query(
          `INSERT INTO county_discovery_registry (
            state, county, portal_name, url, platform_type, 
            captcha_required, ocr_required, search_method, 
            api_available, authentication_required, data_quality_score, connector_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            c.state, c.county, c.portal, c.url, c.type,
            captchaRequired, ocrRequired, c.type === 'Recorder' ? 'Name Index' : 'Case Search',
            apiAvailable, captchaRequired, c.score, c.status.toLowerCase()
          ]
        );
        added++;
      } else {
        // Update existing entry
        await client.query(
          `UPDATE county_discovery_registry 
           SET url = $1, platform_type = $2, api_available = $3, data_quality_score = $4, connector_status = $5
           WHERE id = $6`,
          [c.url, c.type, apiAvailable, c.score, c.status.toLowerCase(), dupCheck.rows[0].id]
        );
        updated++;
      }
    }

    await client.query('COMMIT');
    console.log(`[DiscoveryAgent] Discovery complete. Added: ${added}, Updated: ${updated}`);
    return { added, updated };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DiscoveryAgent] Discovery transaction failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  // Run directly if called
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  const pool = new Pool({ connectionString: databaseUrl });
  runDiscovery(pool).then(() => pool.end());
}

module.exports = {
  runDiscovery
};
