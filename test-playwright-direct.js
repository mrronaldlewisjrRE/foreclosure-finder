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

  try {
    console.log("Navigating directly to CaseLink public guest entry...");
    await page.goto('https://caselink.nashville.gov/public/', { waitUntil: 'load' });
    
    console.log("Initial load complete. URL is:", page.url());
    await page.waitForTimeout(5000);
    console.log("URL after wait:", page.url());

    const frames = page.frames();
    console.log(`Total frames: ${frames.length}`);

    // Search for P_30 office dropdown across all frames
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const hasOffice = await f.$('select[name="P_30"]');
      if (hasOffice) {
        console.log(`Found select[name="P_30"] in Frame ${i} (Name: ${f.name()})!`);
        
        console.log("Selecting Probate (davpro) in frame...");
        await f.selectOption('select[name="P_30"]', 'davpro');
        
        console.log("Entering Date range in frame...");
        await f.fill('input[name="P_26"]', '01/01/2025');
        await f.press('input[name="P_26"]', 'Tab');
        await f.fill('input[name="P_27"]', '05/31/2026');
        await f.press('input[name="P_27"]', 'Tab');
        
        console.log("Clicking search in frame...");
        const searchBtn = f.locator('button[name="WTKCB_20"]');
        await searchBtn.click();
        
        console.log("Waiting for search results in frame...");
        await page.waitForTimeout(10000); // Wait for redirect and grid rendering
        
        console.log("--- Frame Hierarchy After Search ---");
        const newFrames = page.frames();
        for (let j = 0; j < newFrames.length; j++) {
          const nf = newFrames[j];
          console.log(`Frame ${j}: Name='${nf.name()}', URL='${nf.url()}'`);
          const bodyContent = await nf.content();
          fs.writeFileSync(path.join(__dirname, `frame_${j}_content.html`), bodyContent);
          
          const cleanText = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          if (cleanText.includes('Probate') || cleanText.includes('Estate Of') || cleanText.includes('Deceased')) {
            console.log(`  -> Frame ${j} contains case records!`);
            console.log(`  Snippet:`, cleanText.substring(0, 1000));
          }
        }
        console.log("-------------------------------------");
        break;
      }
    }

  } catch (err) {
    console.error("Error in direct Playwright execution:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
