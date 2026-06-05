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
    console.log("Navigating to CaseLink guest login...");
    
    const params = new URLSearchParams({
      GATEWAY: 'GATEWAY',
      CGISCRIPT: 'webshell.asp',
      FINDDEFKEY: '',
      XEVENT: 'VERIFY',
      WEBIOHANDLE: Date.now().toString(),
      BROWSER: 'C*Chrome*120.0.0.0*Win*NO',
      MYPARENT: 'px',
      APPID: 'clnk',
      WEBWORDSKEY: 'SAMPLE',
      DEVPATH: '/INNOVISION/DAVIDSON/DAV.CASELINK',
      OPERCODE: 'GUEST',
      PASSWD: 'GUEST'
    });
    
    const loginUrl = `https://caselink.nashville.gov/cgi-bin/webshell.asp?${params.toString()}`;
    await page.goto(loginUrl);
    
    console.log("Waiting for redirection and page load...");
    await page.waitForSelector('select[name="P_30"]', { timeout: 15000 });
    console.log("Search page loaded successfully!");
    
    console.log("Selecting Probate office (davpro)...");
    await page.selectOption('select[name="P_30"]', 'davpro');
    
    console.log("Entering Date range...");
    await page.fill('input[name="P_26"]', '05/01/2026');
    await page.press('input[name="P_26"]', 'Tab');
    await page.fill('input[name="P_27"]', '05/31/2026');
    await page.press('input[name="P_27"]', 'Tab');
    
    console.log("Clicking search button...");
    const searchButton = page.locator('input[value="Search"], button:has-text("Search"), input[name="WTKCB_20"]');
    await searchButton.click();
    
    console.log("Waiting for search results...");
    await page.waitForTimeout(5000);
    
    console.log("Final URL:", page.url());
    
    const content = await page.content();
    fs.writeFileSync(path.join(__dirname, 'playwright_results.html'), content);
    console.log("Saved page source to playwright_results.html");
    
    const cleanText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log("Text Snippet:", cleanText.substring(0, 1000));
    
  } catch (err) {
    console.error("Error in Playwright execution:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

run();
