const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { seedPlatform } = require('../scripts/seed-platform');
const { runWorker } = require('../services/scrapers/worker');
const { fastify, pool } = require('../services/api-gateway/server');

// Helper to make local GET / POST / PATCH requests in tests
function request(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: 4002, // Test port to avoid conflict
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) {
      req.write(postData);
    }
    req.end();
  });
}

async function runE2ETest() {
  console.log('==================================================');
  console.log('RUNNING FORECLOSUREFINDER AI E2E INTEGRATION TEST');
  console.log('==================================================\n');

  let testPassed = true;

  try {
    // 1. Reset and Seed Database
    console.log('[E2E Test] Step 1: Booting and Seeding Database Schema...');
    await seedPlatform();
    console.log('  ✅ Database initialized and seeded successfully.');
    console.log('');

    // 2. Start Fastify Web Server on Test Port (4002)
    console.log('[E2E Test] Step 2: Launching API Gateway Web Server...');
    process.env.PORT = 4002;
    await fastify.listen({ port: 4002, host: '0.0.0.0' });
    console.log('  ✅ API Gateway is online and listening on port 4002.');
    console.log('');

    // 3. Trigger Scraper Worker
    console.log('[E2E Test] Step 3: Triggering Daily Scrapers Ingestion Worker...');
    await runWorker();
    console.log('  ✅ Scraper worker completed. Records ingested and scores calculated.');
    console.log('');

    // 4. Query Leads API
    console.log('[E2E Test] Step 4: Querying Ingested Leads from REST API...');
    const listResponse = await request('GET', '/api/v1/leads?limit=10');
    
    if (listResponse.statusCode !== 200) {
      throw new Error(`GET /api/v1/leads returned status ${listResponse.statusCode}`);
    }

    const result = listResponse.data;
    console.log(`  - Total records reported: ${result.total}`);
    console.log(`  - Page limit: ${result.limit}`);
    
    if (result.leads.length === 0) {
      throw new Error('No leads returned in list query.');
    }

    const lead = result.leads[0];
    console.log(`  - Lead Case: ${lead.caseNumber} in ${lead.countyCode}`);
    console.log(`  - Property Address: ${lead.propertyAddress}`);
    console.log(`  - Coordinates: Longitude ${lead.coordinates.lng}, Latitude ${lead.coordinates.lat}`);
    console.log(`  - Valuation: Value: $${lead.valuation.estimatedValue}, Equity: $${lead.valuation.estimatedEquity} (${lead.valuation.equityPercentage}%)`);
    console.log(`  - Scoring: Opp Score: ${lead.opportunityScore}, Tier: ${lead.tier}`);
    
    if (!lead.id || !lead.valuation.estimatedValue || !lead.opportunityScore || !lead.tier) {
      throw new Error('Required lead elements or calculations are missing/empty.');
    }
    console.log('  ✅ Lead list querying andOpportunity Scoring validation PASSED.');
    console.log('');

    // 5. Query Single Lead Details
    console.log('[E2E Test] Step 5: Querying Detailed Lead Profile...');
    const detailResponse = await request('GET', `/api/v1/leads/${lead.id}`);
    
    if (detailResponse.statusCode !== 200) {
      throw new Error(`GET /api/v1/leads/${lead.id} returned status ${detailResponse.statusCode}`);
    }

    const detail = detailResponse.data;
    console.log(`  - Enrichment data: Property Type: "${detail.enrichment.propertyType}", Built: ${detail.enrichment.yearBuilt}, Tenure: ${detail.enrichment.ownershipLengthYears} years`);
    console.log(`  - Scoring Sub-scores: Equity: ${detail.score.equityScore}/100, Distress: ${detail.score.distressScore}/100, Tenure: ${detail.score.tenureScore}/100, Vacancy: ${detail.score.vacancyScore}/100`);
    
    if (detail.id !== lead.id || !detail.enrichment.propertyType || detail.score.equityScore === undefined) {
      throw new Error('Lead details profile contains missing or invalid nested information.');
    }
    console.log('  ✅ Lead profile querying validation PASSED.');
    console.log('');

    // 6. User CRM Pipeline Ingestion
    console.log('[E2E Test] Step 6: Testing CRM Pipeline Progression...');
    
    // Add to CRM
    const crmAddRes = await request('POST', '/api/v1/crm/pipeline', {
      leadId: lead.id,
      status: 'NEW'
    });

    if (crmAddRes.statusCode !== 200 || !crmAddRes.data.success) {
      throw new Error(`POST /api/v1/crm/pipeline returned status ${crmAddRes.statusCode}`);
    }
    const crmRecordId = crmAddRes.data.crmRecordId;
    console.log(`  - Added lead to CRM pipeline. Record ID: ${crmRecordId}`);

    // Update CRM status & notes
    const crmUpdateRes = await request('PATCH', `/api/v1/crm/pipeline/${crmRecordId}`, {
      status: 'CONTACTED',
      notes: 'Mailed foreclosure details. Awaiting callback.',
      offerAmount: 265000.00
    });

    if (crmUpdateRes.statusCode !== 200 || !crmUpdateRes.data.success) {
      throw new Error(`PATCH /api/v1/crm/pipeline/${crmRecordId} returned status ${crmUpdateRes.statusCode}`);
    }
    console.log(`  - Progressed CRM Pipeline to: ${crmUpdateRes.data.status}`);

    // Query active pipeline list
    const crmListRes = await request('GET', '/api/v1/crm/pipeline');
    if (crmListRes.statusCode !== 200 || crmListRes.data.pipeline.length === 0) {
      throw new Error('Failed to retrieve active CRM pipeline list.');
    }
    
    const crmRecord = crmListRes.data.pipeline.find(item => item.crmRecordId === crmRecordId);
    if (!crmRecord || crmRecord.status !== 'CONTACTED' || !crmRecord.notes.includes('foreclosure')) {
      throw new Error('CRM record fields were not persisted or updated correctly.');
    }
    console.log('  ✅ CRM pipeline progression validation PASSED.');
    console.log('');

  } catch (err) {
    console.error('  ❌ E2E TEST FAILED:', err.message);
    testPassed = false;
  } finally {
    // 7. Cleanup Connections and Server
    console.log('[E2E Test] Step 7: Tearing down test environment...');
    await fastify.close().catch(() => {});
    await pool.end().catch(() => {});
    console.log('  ✅ Server closed and pool released.');
  }

  console.log('\n==================================================');
  if (testPassed) {
    console.log('ALL FORECLOSUREFINDER AI E2E TESTS PASSED');
    console.log('==================================================');
    process.exit(0);
  } else {
    console.error('FORECLOSUREFINDER AI E2E TESTS FAILED');
    console.log('==================================================');
    process.exit(1);
  }
}

runE2ETest().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
