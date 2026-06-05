const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { seedPlatform } = require('./scripts/seed-platform');
const { fastify, pool } = require('./services/api-gateway/server');

function request(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: 4003,
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
          resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: body });
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

async function runManualTest() {
  console.log('=== TESTING NEWLY IMPLEMENTED ENDPOINTS ===\n');
  let allPassed = true;

  try {
    // 1. Seed Platform
    console.log('[Test] Seeding database...');
    await seedPlatform();
    console.log('[Test] Seeding completed.\n');

    // 2. Start Gateway Server
    console.log('[Test] Booting Fastify API Gateway on port 4003...');
    process.env.PORT = 4003;
    await fastify.listen({ port: 4003, host: '0.0.0.0' });
    console.log('[Test] Server is online.\n');

    // 3. Test POST /api/v1/auth/login
    console.log('[Test 1] Testing Auth Login (POST /api/v1/auth/login)...');
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: 'admin@foreclosurefinder.ai',
      password: 'securepassword123'
    });

    if (loginRes.statusCode === 200 && loginRes.data.token && loginRes.data.user) {
      console.log('  ... SUCCESS: Retrieved JWT Token and User Profile.');
      console.log(`     Token Signature preview: ${loginRes.data.token.slice(-30)}`);
      console.log(`     User role: ${loginRes.data.user.role}`);
    } else {
      console.error(`  ... FAILED: Status code ${loginRes.statusCode}`, loginRes.data);
      allPassed = false;
    }
    console.log('');

    // 4. Test POST /api/v1/saved-searches
    console.log('[Test 2] Testing Saved Searches (POST /api/v1/saved-searches)...');
    const searchRes = await request('POST', '/api/v1/saved-searches', {
      searchName: 'High Opportunity Florida Pre-foreclosures',
      emailNotifications: true,
      webhookNotifications: false,
      filterCriteria: {
        countyCode: 'FL_MIAMIDADE',
        filingType: 'LIS_PENDENS',
        minEquityPercentage: 35.0,
        minScore: 70
      }
    });

    if (searchRes.statusCode === 201 && searchRes.data.success && searchRes.data.searchId) {
      console.log('  ... SUCCESS: Saved search query criteria.');
      console.log(`     Saved Search ID: ${searchRes.data.searchId}`);
    } else {
      console.error(`  ... FAILED: Status code ${searchRes.statusCode}`, searchRes.data);
      allPassed = false;
    }
    console.log('');

    // 5. Test GET /api/v1/leads/export
    console.log('[Test 3] Testing CSV Leads Export (GET /api/v1/leads/export)...');
    const exportRes = await request('GET', '/api/v1/leads/export?format=csv');

    if (exportRes.statusCode === 200 && exportRes.headers['content-type'].includes('text/csv')) {
      console.log('  ... SUCCESS: Retrieved CSV Export Stream.');
      console.log(`     Content-Disposition: ${exportRes.headers['content-disposition']}`);
      
      const csvLines = exportRes.data.trim().split('\n');
      console.log(`     CSV Headers: ${csvLines[0]}`);
      console.log(`     CSV Total rows returned: ${csvLines.length - 1}`);
      
      if (csvLines.length > 1) {
        console.log(`     First Lead Record: ${csvLines[1].slice(0, 100)}...`);
      }
    } else {
      console.error(`  ... FAILED: Status code ${exportRes.statusCode}`, exportRes.data);
      allPassed = false;
    }
    console.log('');

    // 6. Test POST /api/v1/ingestion/trigger
    console.log('[Test 4] Testing Manual Ingestion Trigger (POST /api/v1/ingestion/trigger)...');
    const triggerRes = await request('POST', '/api/v1/ingestion/trigger', {});

    if (triggerRes.statusCode === 200 && triggerRes.data.success) {
      console.log('  ... SUCCESS: Ingestion scan initiated in background.');
      console.log(`     API Response: ${JSON.stringify(triggerRes.data)}`);
    } else {
      console.error(`  ... FAILED: Status code ${triggerRes.statusCode}`, triggerRes.data);
      allPassed = false;
    }
    console.log('');

  } catch (err) {
    console.error('... FATAL ERROR DURING MANUAL VERIFICATION:', err);
    allPassed = false;
  } finally {
    console.log('[Test] Tearing down test server...');
    await fastify.close().catch(() => {});
    await pool.end().catch(() => {});
    console.log('[Test] Teardown complete.\n');
  }

  if (allPassed) {
    console.log('🎉 ALL NEW ENDPOINTS SUCCESSFULLY VALIDATED!');
    process.exit(0);
  } else {
    console.error('... MIGRATION AND ENDPOINTS VALIDATION ENCOUNTERED FAILURES');
    process.exit(1);
  }
}

runManualTest();
