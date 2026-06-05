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
      
      console.log("Focusing and selecting Office (davpro)...");
      await f.focus('select[name="P_30"]');
      await f.selectOption('select[name="P_30"]', 'davpro');
      // GSA expects a change event to fire on select
      await f.locator('select[name="P_30"]').dispatchEvent('change');
      await page.waitForTimeout(4000);

      console.log("Focusing and Entering Party Name 'A'...");
      await f.focus('input[name="P_22"]');
      await f.fill('input[name="P_22"]', 'A');
      await f.press('input[name="P_22"]', 'Tab');
      await page.waitForTimeout(4000);
      
      console.log("Focusing and Entering Date range...");
      await f.focus('input[name="P_26"]', '05/01/2026');
      await f.fill('input[name="P_26"]', '05/01/2026');
      await f.press('input[name="P_26"]', 'Tab');
      await page.waitForTimeout(4000);

      await f.focus('input[name="P_27"]');
      await f.fill('input[name="P_27"]', '05/31/2026');
      await f.press('input[name="P_27"]', 'Tab');
      await page.waitForTimeout(4000);
      
      console.log("Clicking search...");
      const searchBtn = f.locator('button[name="WTKCB_20"]');
      await searchBtn.click();
      
      console.log("Waiting for search results...");
      await page.waitForTimeout(15000); // Give plenty of time
      
      console.log("--- Frame Hierarchy After Search ---");
      const newFrames = page.frames();
      for (let j = 0; j < newFrames.length; j++) {
        const nf = newFrames[j];
        console.log(`Frame ${j}: Name='${nf.name()}', URL='${nf.url()}'`);
        const bodyContent = await nf.content();
        fs.writeFileSync(path.join(__dirname, `frame_${j}_content_focus.html`), bodyContent);
        
        const cleanText = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        if (cleanText.includes('Probate') || cleanText.includes('Estate Of') || cleanText.includes('Deceased')) {
          console.log(`  -> Frame ${j} contains case records!`);
          console.log(`  Snippet:`, cleanText.substring(0, 1000));
        }
      }
      console.log("-------------------------------------");
    } else {
      console.log("Update frame not found!");
    }

  } catch (err) {
    console.error("Error in Playwright execution:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
