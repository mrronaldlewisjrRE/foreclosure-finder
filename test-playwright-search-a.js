const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log("Launching headless Chromium browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Log browser console messages
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Log page errors
  page.on('pageerror', err => {
    console.error(`[Browser PageError] ${err.toString()}`);
  });

  // Log network requests
  page.on('request', req => {
    if (req.url().includes('webshell') || req.url().includes('cgi-bin')) {
      console.log(`[Network Request] ${req.method()} ${req.url()}`);
      const postData = req.postData();
      if (postData) {
        console.log(`  Post Data: ${postData}`);
      }
    }
  });

  // Log network responses
  page.on('response', res => {
    if (res.url().includes('webshell') || res.url().includes('cgi-bin')) {
      console.log(`[Network Response] Status ${res.status()} for ${res.url()}`);
    }
  });

  try {
    console.log("Navigating directly to CaseLink public guest entry...");
    await page.goto('https://caselink.nashville.gov/public/', { waitUntil: 'load' });
    
    await page.waitForTimeout(5000);
    const frames = page.frames();
    console.log(`Total frames: ${frames.length}`);

    // Find update frame
    const f = frames.find(fr => fr.name() === 'update');
    if (f) {
      console.log(`Found update frame!`);
      
      console.log("Selecting Probate (davpro) in frame...");
      await f.selectOption('select[name="P_30"]', 'davpro');
      await page.waitForTimeout(3500);

      console.log("Entering Party Name 'A'...");
      await f.fill('input[name="P_22"]', 'A');
      await f.press('input[name="P_22"]', 'Tab');
      await page.waitForTimeout(3500);
      
      console.log("Entering Date range in frame...");
      await f.fill('input[name="P_26"]', '05/01/2026');
      await f.press('input[name="P_26"]', 'Tab');
      await page.waitForTimeout(3500);

      await f.fill('input[name="P_27"]', '05/31/2026');
      await f.press('input[name="P_27"]', 'Tab');
      await page.waitForTimeout(3500);
      
      console.log("Clicking search in frame...");
      const searchBtn = f.locator('button[name="WTKCB_20"]');
      await searchBtn.click();
      
      console.log("Waiting for search results in frame...");
      await page.waitForTimeout(15000); // Give plenty of time
      
    } else {
      console.log("Update frame not found!");
    }

  } catch (err) {
    console.error("Error in direct Playwright execution:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
