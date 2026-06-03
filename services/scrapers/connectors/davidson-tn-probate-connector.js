const CountyConnectorBase = require('./county-connector-base');
const { chromium } = require('playwright');
const crypto = require('crypto');

class DavidsonTNProbateConnector extends CountyConnectorBase {
  constructor() {
    super({
      countyCode: 'TN_DAVIDSON',
      state: 'TN',
      countyName: 'Davidson County',
      distressType: 'PROBATE_CASE',
      sourceType: 'Chancery Court Clerk (Probate Docket)',
      sourceUrl: 'https://caselink.nashville.gov/public/',
      confidenceScore: 90
    });
  }

  async executeSearch(page, date) {
    console.log(`[TN_DAVIDSON_PROBATE Connector] Search will be executed inside extractRecords via Playwright...`);
    return true;
  }

  async extractRecords(countyCode, date) {
    console.log(`[TN_DAVIDSON_PROBATE Connector] Launching headless Chromium browser to scrape CaseLink...`);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    const records = [];

    try {
      console.log("[TN_DAVIDSON_PROBATE Connector] Navigating to CaseLink portal...");
      await page.goto(this.sourceUrl, { waitUntil: 'load' });
      await page.waitForTimeout(4000);
      
      const frames = page.frames();
      const f = frames.find(fr => fr.name() === 'update');
      
      if (!f) {
        throw new Error("Could not find the GSA 'update' iframe on CaseLink public portal");
      }

      console.log("[TN_DAVIDSON_PROBATE Connector] Selecting Probate office (davpro)...");
      await f.focus('select[name="P_30"]');
      await f.selectOption('select[name="P_30"]', 'davpro');
      await f.locator('select[name="P_30"]').dispatchEvent('change');
      await page.waitForTimeout(3000);

      console.log("[TN_DAVIDSON_PROBATE Connector] Inputting Party Name prefix 'A'...");
      await f.focus('input[name="P_22"]');
      await f.fill('input[name="P_22"]', 'A');
      await f.press('input[name="P_22"]', 'Tab');
      await page.waitForTimeout(3000);
      
      console.log("[TN_DAVIDSON_PROBATE Connector] Setting Date From (05/01/2026)...");
      await f.focus('input[name="P_26"]');
      await f.fill('input[name="P_26"]', '05/01/2026');
      await f.press('input[name="P_26"]', 'Tab');
      await page.waitForTimeout(3000);

      console.log("[TN_DAVIDSON_PROBATE Connector] Setting Date To (05/31/2026)...");
      await f.focus('input[name="P_27"]');
      await f.fill('input[name="P_27"]', '05/31/2026');
      await f.press('input[name="P_27"]', 'Tab');
      await page.waitForTimeout(3000);
      
      console.log("[TN_DAVIDSON_PROBATE Connector] Clicking Search...");
      await f.locator('button[name="WTKCB_20"]').click();
      await page.waitForTimeout(15000); // Wait for the update to post back
      
      console.log("[TN_DAVIDSON_PROBATE Connector] Searching frames for postback data...");
      const resultsFrame = page.frames().find(cf => cf.name() === 'postback');
      let frameContent = '';
      if (resultsFrame) {
        frameContent = await resultsFrame.content();
      }

      if (!resultsFrame || !frameContent.includes('PutFormVar')) {
        throw new Error("Could not find any iframe containing postback search results");
      }

      console.log(`[TN_DAVIDSON_PROBATE Connector] Found results in frame: '${resultsFrame.name()}'`);

      // Extract all PutFormVar calls using regex
      const regex = /parent\.PutFormVar\("P_(\d+)_(\d+)",\s*"([^"]*)",\s*0\)/g;
      let match;
      const rows = {};

      while ((match = regex.exec(frameContent)) !== null) {
        const fieldId = match[1];
        const rowIndex = match[2];
        const val = match[3];

        if (!rows[rowIndex]) {
          rows[rowIndex] = {};
        }
        rows[rowIndex][fieldId] = val;
      }

      const rowIndices = Object.keys(rows);
      console.log(`[TN_DAVIDSON_PROBATE Connector] Extracted ${rowIndices.length} probate rows.`);

      const maxRecords = rowIndices.length;
      
      for (let i = 0; i < maxRecords; i++) {
        const idx = rowIndices[i];
        const rowData = rows[idx];

        const caseNum = rowData['102'];
        const dateStr = rowData['104'];
        const desc = rowData['105'];
        const estateNameRaw = rowData['106'];
        const executorRaw = rowData['107'];
        const attorneyRaw = rowData['108'];

        if (!caseNum || !estateNameRaw) continue;

        // Clean dates: '05/01/2026' -> '2026-05-01'
        let filingDateVal = date;
        if (dateStr) {
          const dParts = dateStr.split('/');
          if (dParts.length === 3) {
            filingDateVal = `${dParts[2]}-${dParts[0]}-${dParts[1]}`;
          }
        }

        const estateName = estateNameRaw.trim();
        const executor = executorRaw ? executorRaw.trim() : 'UNKNOWN';

        const docHash = crypto.createHash('sha256').update(frameContent).digest('hex');

        records.push({
          caseNumber: caseNum,
          filingDate: filingDateVal,
          filingType: 'PROBATE_CASE', // Ingested initially as a case, match engine will promote if matched
          parcelNumber: `PR-${caseNum}`,
          ownerName: estateName,
          loanAmount: 0,
          trusteeName: executor,
          plaintiffAttorney: attorneyRaw || 'UNKNOWN',
          auctionDate: null,
          propertyAddress: null, // Address must be NULL for unmatched cases (no courthouse placeholders)
          mailingAddress: null,
          latitude: null,
          longitude: null,
          documentUrl: this.sourceUrl,
          sourceUrl: this.sourceUrl,
          sourceType: this.sourceType,
          sourceConfidenceScore: 90,
          provenanceScore: 60,
          documentHash: docHash,
          evidenceLocation: null,
          parserVersion: '1.0.0',
          specificFields: {
            probateCaseNumber: caseNum,
            filingDate: filingDateVal,
            estateName: estateName,
            executor: executor
          },
          rawPayload: {
            source: 'CaseLink Probate Search results',
            extracted_at: new Date().toISOString(),
            row_index: parseInt(idx, 10),
            original_html_or_page: frameContent,
            case_description: desc
          }
        });
      }

    } catch (err) {
      console.error("[TN_DAVIDSON_PROBATE Connector] Error during Playwright scrape:", err.message);
    } finally {
      await browser.close();
      console.log("[TN_DAVIDSON_PROBATE Connector] Browser closed.");
    }

    return records;
  }
}

module.exports = DavidsonTNProbateConnector;
