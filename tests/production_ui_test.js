const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testFrontend(url, namePrefix) {
  console.log(`\n==================================================`);
  console.log(`STARTING UI TEST FOR: ${url}`);
  console.log(`==================================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Track network requests to find the API base URL
  let apiUrls = new Set();
  page.on('request', request => {
    const reqUrl = request.url();
    if (reqUrl.includes('/api/v1/')) {
      const parsed = new URL(reqUrl);
      apiUrls.add(parsed.origin);
    }
  });

  // Capture console logs
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    const artifactDir = 'C:/Users/Ronald Lewis Jr/.gemini/antigravity-ide/brain/b35d93a9-0913-4ad4-88cd-e394a47cab12';
    
    // Screenshot 1: Login Page
    console.log('Capturing login screen...');
    await page.screenshot({ path: path.join(artifactDir, `${namePrefix}_login_page.png`) });

    // Click "Continue with Google"
    console.log('Clicking Continue with Google...');
    await page.click('button:has-text("Continue with Google")');
    await page.waitForTimeout(1000);

    // Screenshot 2: Google Chooser
    console.log('Capturing Google account chooser...');
    await page.screenshot({ path: path.join(artifactDir, `${namePrefix}_google_chooser.png`) });

    // Enter email address and credentials
    console.log('Entering Google email address (paidpropertiesllc@gmail.com)...');
    await page.fill('input[placeholder="name@gmail.com"]', 'paidpropertiesllc@gmail.com');
    console.log('Entering Google password...');
    await page.fill('input[placeholder="••••••••"]', 'securepassword123');
    console.log('Entering 2FA verification code...');
    await page.fill('input[placeholder="6-digit code (e.g. 123456)"]', '123456');
    console.log('Clicking Continue...');
    await page.click('button.btn:has-text("Continue")');
    
    // Wait for Dashboard to load
    console.log('Waiting for main dashboard view...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(artifactDir, `${namePrefix}_dashboard.png`) });

    // Check role badge
    const roleBadge = await page.locator('.logo-badge, .badge, span:has-text("SUPER_ADMIN"), span:has-text("Super Admin")').first().innerText().catch(() => 'Not Found');
    console.log(`Role badge found: "${roleBadge}"`);

    // Verify navigation item displays and click them
    const navs = ['Team Workspace', 'Revenue Center', 'Security'];
    for (const nav of navs) {
      console.log(`Clicking on sidebar item: "${nav}"...`);
      const navButton = page.locator(`button:has-text("${nav}")`);
      if (await navButton.count() > 0) {
        await navButton.click();
        await page.waitForTimeout(2000);
        const nameSanitized = nav.toLowerCase().replace(' ', '_');
        await page.screenshot({ path: path.join(artifactDir, `${namePrefix}_${nameSanitized}.png`) });
        console.log(`  ✅ Screen ${nav} loaded & captured.`);
      } else {
        console.log(`  ❌ Sidebar item "${nav}" not found on screen.`);
      }
    }

    console.log(`Discovered API Gateways contacted by frontend:`, Array.from(apiUrls));

  } catch (err) {
    console.error(`❌ UI test encountered error for ${url}:`, err.message);
  } finally {
    await browser.close();
    console.log(`Finished UI test for ${url}`);
  }
}

async function run() {
  // Test local frontend
  await testFrontend('http://localhost:5174/', 'local');

  // Test production frontend
  await testFrontend('https://frontend-one-roan-93.vercel.app/', 'production');
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
