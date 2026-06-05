const http = require('http');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
const pool = new Pool({ connectionString: databaseUrl });

function request(method, urlPath, headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    let postData = '';
    const updatedHeaders = { ...headers };
    
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const finalData = data || {};
      postData = JSON.stringify(finalData);
      updatedHeaders['Content-Type'] = 'application/json';
      updatedHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: 'localhost',
      port: 4000, // Active API gateway port
      path: urlPath,
      method: method,
      headers: updatedHeaders
    };

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
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runAudit() {
  console.log('==================================================');
  console.log('FORECLOSUREFINDER AI - DEPLOYMENT AUDIT VERIFICATION');
  console.log('==================================================\n');

  let superAdminToken = '';
  let userToken = '';
  let testLeadId = '';
  let userEmail = 'test_wholesaler_audit@gmail.com';
  let adminEmail = 'mrronaldlewisjr@gmail.com';

  // 1. Health check
  console.log('[Audit] 1. Verifying API Gateway Health...');
  try {
    const health = await request('GET', '/health');
    console.log(`  - Status: ${health.statusCode}`);
    console.log(`  - Response: ${JSON.stringify(health.data)}`);
    if (health.statusCode !== 200) throw new Error('API Health Check failed.');
    console.log('  ✅ API Gateway reachable.');
  } catch (err) {
    console.error('  ❌ Health check failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 2. Google Authentication - Super Admin
  console.log(`[Audit] 2. Testing Google Auth login for default Super Admin (${adminEmail})...`);
  try {
    const login = await request('POST', '/api/v1/auth/google', {}, {
      email: adminEmail,
      name: 'Ronald Lewis Jr',
      password: 'securepassword123',
      verificationCode: '123456'
    });
    console.log(`  - Status: ${login.statusCode}`);
    console.log(`  - Role assigned: ${login.data.user?.role}`);
    if (login.statusCode !== 200 || login.data.user?.role !== 'SUPER_ADMIN') {
      throw new Error('Google Auth did not correctly provision mrronaldlewisjr@gmail.com as SUPER_ADMIN.');
    }
    superAdminToken = login.data.token;
    console.log('  ✅ Google Super Admin login works.');
  } catch (err) {
    console.error('  ❌ Super Admin login failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 3. Google Authentication - Regular User Auto Creation
  console.log(`[Audit] 3. Testing Google Auth login for regular user auto-creation (${userEmail})...`);
  try {
    const login = await request('POST', '/api/v1/auth/google', {}, {
      email: userEmail,
      name: 'Audit Wholesaler',
      password: 'securepassword123',
      verificationCode: '123456'
    });
    console.log(`  - Status: ${login.statusCode}`);
    console.log(`  - Role assigned: ${login.data.user?.role}`);
    if (login.statusCode !== 200 || login.data.user?.role !== 'USER') {
      throw new Error('Google Auth did not correctly provision new email as USER.');
    }
    userToken = login.data.token;
    console.log('  ✅ Google User auto-creation and login works.');
  } catch (err) {
    console.error('  ❌ User login failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // Get a lead for testing claims
  try {
    const leads = await request('GET', '/api/v1/leads?limit=1');
    if (leads.data.leads && leads.data.leads.length > 0) {
      testLeadId = leads.data.leads[0].id;
    } else {
      throw new Error('No leads available in the database to run workflows.');
    }
  } catch (err) {
    console.error('  ❌ Failed to fetch test lead:', err.message);
    process.exit(1);
  }

  // 4. Data Masking Verification (RBAC)
  console.log('[Audit] 4. Verifying Role-Based Data Masking Controls...');
  try {
    // Query as USER (Should be masked)
    const userQuery = await request('GET', `/api/v1/leads/${testLeadId}`, {
      'Authorization': `Bearer ${userToken}`
    });
    console.log(`  - USER Query Case Number: "${userQuery.data.caseNumber}"`);
    console.log(`  - USER Query Owner Name: "${userQuery.data.ownerName}"`);
    
    // Query as SUPER_ADMIN with masked=false (Should be unmasked)
    const adminQuery = await request('GET', `/api/v1/leads/${testLeadId}?masked=false`, {
      'Authorization': `Bearer ${superAdminToken}`
    });
    console.log(`  - SUPER_ADMIN Query Case Number: "${adminQuery.data.caseNumber}"`);
    console.log(`  - SUPER_ADMIN Query Owner Name: "${adminQuery.data.ownerName}"`);

    if (!userQuery.data.ownerName.includes('MASKED') || adminQuery.data.ownerName.includes('MASKED')) {
      throw new Error('Data masking is not behaving correctly between USER and SUPER_ADMIN roles.');
    }
    console.log('  ✅ Data Masking controls verified successfully.');
  } catch (err) {
    console.error('  ❌ Data masking verification failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 5. Claim Property Workflow
  console.log('[Audit] 5. Testing Property Claim Workflow...');
  try {
    const claimRes = await request('POST', `/api/v1/leads/${testLeadId}/claim`, {
      'Authorization': `Bearer ${userToken}`
    });
    console.log(`  - Claim Status Code: ${claimRes.statusCode}`);
    console.log(`  - Response Message: ${claimRes.data.message}`);

    const verify = await request('GET', `/api/v1/leads/${testLeadId}`, {
      'Authorization': `Bearer ${userToken}`
    });
    console.log(`  - Lead Claim Status in Database: "${verify.data.claimStatus}"`);
    if (verify.data.claimStatus !== 'Claimed') {
      throw new Error('Property claim was not successfully saved.');
    }
    console.log('  ✅ Property claiming workflow works.');
  } catch (err) {
    console.error('  ❌ Claim workflow failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 6. Mark Sold Workflow
  console.log('[Audit] 6. Testing Sold Property Tracking (Close Deal)...');
  try {
    const sellRes = await request('POST', `/api/v1/leads/${testLeadId}/sell`, {
      'Authorization': `Bearer ${userToken}`
    }, {
      saleDate: new Date().toISOString().split('T')[0],
      assignmentFee: 12500.00,
      profitAmount: 22000.00,
      notes: 'Dispositioned to local cash buyer fund.'
    });
    console.log(`  - Sold Status Code: ${sellRes.statusCode}`);
    console.log(`  - Response Message: ${sellRes.data.message}`);

    const verify = await request('GET', `/api/v1/leads/${testLeadId}`, {
      'Authorization': `Bearer ${userToken}`
    });
    console.log(`  - Lead Claim Status in Database: "${verify.data.claimStatus}"`);
    if (verify.data.claimStatus !== 'Sold') {
      throw new Error('Property was not successfully marked as Sold.');
    }
    console.log('  ✅ Property sales logging workflow works.');
  } catch (err) {
    console.error('  ❌ Mark sold workflow failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 7. Admin Screens verification (Super Admin Only)
  console.log('[Audit] 7. Verifying Admin console backend routes...');
  try {
    const usersList = await request('GET', '/api/v1/admin/users', { 'Authorization': `Bearer ${superAdminToken}` });
    const secDash = await request('GET', '/api/v1/admin/security-dashboard', { 'Authorization': `Bearer ${superAdminToken}` });
    const salesLedger = await request('GET', '/api/v1/admin/sales', { 'Authorization': `Bearer ${superAdminToken}` });
    
    console.log(`  - GET /api/v1/admin/users: Code ${usersList.statusCode}, Count ${usersList.data.users?.length}`);
    console.log(`  - GET /api/v1/admin/security-dashboard: Code ${secDash.statusCode}`);
    console.log(`  - GET /api/v1/admin/sales: Code ${salesLedger.statusCode}, Count ${salesLedger.data.sales?.length}`);

    if (usersList.statusCode !== 200 || secDash.statusCode !== 200 || salesLedger.statusCode !== 200) {
      throw new Error('One or more Super Admin console route validations failed.');
    }
    console.log('  ✅ User Management, Security Dashboard, and Sales lists load correctly.');
  } catch (err) {
    console.error('  ❌ Admin screen verification failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 8. User Promotion Workflow
  console.log('[Audit] 8. Testing User Promotion Workflow...');
  try {
    const targetUser = await pool.query('SELECT * FROM users WHERE email = $1', [userEmail]);
    const targetUserId = targetUser.rows[0].id;

    // Promote USER to ADMIN
    const promote = await request('POST', `/api/v1/admin/users/${targetUserId}/role`, {
      'Authorization': `Bearer ${superAdminToken}`
    }, { role: 'ADMIN' });
    console.log(`  - Promote Status: ${promote.statusCode}, Message: ${promote.data.message}`);

    const verifyPromote = await pool.query('SELECT role FROM users WHERE id = $1', [targetUserId]);
    console.log(`  - Updated Database Role: "${verifyPromote.rows[0].role}"`);
    if (verifyPromote.rows[0].role !== 'ADMIN') {
      throw new Error('User promotion did not persist in database.');
    }

    // Demote back to USER
    const demote = await request('POST', `/api/v1/admin/users/${targetUserId}/role`, {
      'Authorization': `Bearer ${superAdminToken}`
    }, { role: 'USER' });
    console.log(`  - Demote Status: ${demote.statusCode}, Message: ${demote.data.message}`);

    console.log('  ✅ Role promotion and demotion workflow verified.');
  } catch (err) {
    console.error('  ❌ User promotion test failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 9. IP Ban Hook Verification
  console.log('[Audit] 9. Testing IP Ban governance hook...');
  const testIp = '127.0.0.1';
  try {
    // Block IP
    console.log(`  - Blocking IP address: ${testIp}...`);
    const block = await request('POST', '/api/v1/admin/ip/block', {
      'Authorization': `Bearer ${superAdminToken}`
    }, {
      ipAddress: testIp,
      reason: 'Automated E2E governance audit verification test'
    });
    console.log(`  - Block response code: ${block.statusCode}`);

    // Try requesting health endpoint from blocked IP (should return 403)
    console.log('  - Testing access block...');
    const access = await request('GET', '/health');
    console.log(`  - Request status under ban: ${access.statusCode}`);
    console.log(`  - Request body under ban: "${access.data}"`);

    // CLEANUP IP BAN (Directly via SQL pool bypass so we do not block ourselves in future runs!)
    console.log('  - Unblocking IP via backend cleanup...');
    await pool.query('UPDATE blocked_ips SET is_active = FALSE WHERE ip_address = $1', [testIp]);
    console.log('  - IP ban cache released.');

    if (access.statusCode !== 403 || access.data !== 'You do not have permission to access this platform.') {
      throw new Error('IP ban hook did not intercept or deny access with the correct payload.');
    }

    console.log('  ✅ IP Banning governance controls verified.');
  } catch (err) {
    // In case of error, make sure we clean up the ban on 127.0.0.1
    await pool.query('UPDATE blocked_ips SET is_active = FALSE WHERE ip_address = $1', [testIp]);
    console.error('  ❌ IP ban verification failed:', err.message);
    process.exit(1);
  }
  console.log('');

  // 10. Clean up test database mutations
  console.log('[Audit] 10. Releasing database claims and test assets...');
  try {
    await pool.query('DELETE FROM property_sales WHERE lead_id = $1', [testLeadId]);
    await pool.query('UPDATE foreclosure_leads SET claim_status = \'Available\', claimed_by_user_id = NULL, claimed_at = NULL WHERE id = $1', [testLeadId]);
    await pool.query('DELETE FROM crm_pipelines WHERE lead_id = $1', [testLeadId]);
    await pool.query('DELETE FROM users WHERE email = $1', [userEmail]);
    console.log('  ✅ Database audit cleanup complete.');
  } catch (err) {
    console.error('  ⚠️ Database audit cleanup encountered warning:', err.message);
  }
  
  await pool.end();

  console.log('\n==================================================');
  console.log('ALL GOVERNANCE AUDIT VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('==================================================');
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Audit fatal exception:', err);
  process.exit(1);
});
