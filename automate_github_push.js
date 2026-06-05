const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('Starting GitHub Automation using Playwright...');
  
  const gitPath = 'C:\\Users\\Ronald Lewis Jr\\AppData\\Local\\GitHubDesktop\\app-3.5.10\\resources\\app\\git\\cmd\\git.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const screenshotPath = 'C:\\Users\\Ronald Lewis Jr\\.gemini\\antigravity-ide\\brain\\b35d93a9-0913-4ad4-88cd-e394a47cab12\\github_screenshot.png';
  
  const email = 'mrronaldlewisjr@gmail.com';
  const password = 'Pluck4eva1981!';
  
  console.log('Launching browser (non-headless)...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: chromePath
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to GitHub Login...');
    await page.goto('https://github.com/login');
    
    // Fill credentials
    console.log('Filling in credentials...');
    await page.fill('#login_field', email);
    await page.fill('#password', password);
    await page.click('input[type="submit"]');
    
    console.log('Checking for login status or 2FA prompt...');
    
    let loggedIn = false;
    // Poll for up to 120 seconds to allow the user to complete 2FA or CAPTCHA
    for (let i = 0; i < 60; i++) {
      const url = page.url();
      const title = await page.title().catch(() => 'No Title');
      console.log(`[Browser State] Step ${i + 1} | URL: ${url} | Title: ${title}`);
      
      // Save a screenshot so the agent/user can inspect
      await page.screenshot({ path: screenshotPath });
      
      if (url.includes('/login/two-factor') || url.includes('/sessions/verified-device')) {
        console.log('*** ACTION REQUIRED: Enter the 2FA or Device Verification code in the opened browser window! ***');
      }
      
      // Check if logged in (look for avatar button or dashboard URL)
      const profileVisible = await page.$('summary[aria-label="View profile and more"], button[aria-label="Open user navigation menu"]').catch(() => null);
      if (profileVisible || url === 'https://github.com/' || url === 'https://github.com/dashboard' || url.includes('https://github.com/dashboard')) {
        loggedIn = true;
        break;
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    if (!loggedIn) {
      throw new Error('Login timed out. Check the screenshot to see where it got stuck.');
    }
    
    console.log('Successfully logged in! Navigating to Token Generation...');
    await page.goto('https://github.com/settings/tokens/new');
    
    // Save screenshot
    await page.screenshot({ path: screenshotPath });
    
    // Check if we need to re-authenticate (Sudo mode)
    if (page.url().includes('/sessions/confirm-verification') || await page.$('#sudo_password')) {
      console.log('Confirming password for security page access...');
      await page.fill('#sudo_password', password);
      await page.screenshot({ path: screenshotPath });
      await page.click('#sudo_password + button, button[type="submit"], input[type="submit"]');
      await page.waitForNavigation().catch(() => {});
    }
    
    console.log('Configuring New Personal Access Token...');
    // Set note
    const tokenNote = `antigravity-token-${Date.now()}`;
    await page.fill('input[aria-label="Note"]', tokenNote);
    
    // Set expiry to 7 days
    await page.click('summary[aria-label="Expiration"]');
    await page.click('text="7 days"');
    
    // Check 'repo' scope
    await page.check('input[value="repo"]');
    await page.screenshot({ path: screenshotPath });
    
    console.log('Generating token...');
    await page.click('button:has-text("Generate token")');
    
    // Wait for the token input element
    await page.waitForSelector('#new-oauth-token', { timeout: 30000 });
    const token = await page.inputValue('#new-oauth-token');
    console.log('Token successfully generated: ' + token.substring(0, 8) + '...');
    
    // Save final screenshot
    await page.screenshot({ path: screenshotPath });
    
    // Close browser
    await browser.close();
    
    // Now push using the token!
    console.log('Pushing changes to GitHub using the token...');
    const remoteUrl = `https://mrronaldlewisjr:${token}@github.com/mrronaldlewisjr/foreclosure-finder.git`;
    
    try {
      execSync(`"${gitPath}" push "${remoteUrl}" master`, {
        cwd: 'C:\\Users\\Ronald Lewis Jr\\.gemini\\antigravity-ide\\scratch\\foreclosure-finder-ai',
        stdio: 'inherit'
      });
      console.log('🎉 PUSH COMPLETED SUCCESSFULLY!');
    } catch (pushErr) {
      console.error('Push command failed:', pushErr.message);
    }
    
  } catch (err) {
    console.error('Automation error:', err.message);
    await page.screenshot({ path: screenshotPath }).catch(() => {});
    await browser.close().catch(() => {});
  }
}

run();
