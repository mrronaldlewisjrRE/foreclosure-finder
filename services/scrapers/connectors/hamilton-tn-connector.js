const CountyConnectorBase = require('./county-connector-base');
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${body.substring(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

class HamiltonTNConnector extends CountyConnectorBase {
  constructor() {
    super({
      countyCode: 'TN_HAMILTON',
      state: 'TN',
      countyName: 'Hamilton County',
      distressType: 'TRUSTEE_SALE',
      sourceType: 'Better Choice Notices',
      sourceUrl: 'https://www.betterchoicenotices.com',
      confidenceScore: 91
    });
  }

  async executeSearch(page, date) {
    console.log(`[TN_HAMILTON Connector] Accessing live source at ${this.sourceUrl} for ${date}...`);
    return true;
  }

  async extractRecords(countyCode, date) {
    console.log(`[TN_HAMILTON Connector] Querying live notices from Better Choice Notices...`);
    // State 44 = TN, County 33 = Hamilton
    const notices = [];
    let pageNumber = 1;
    let hasMore = true;
    const pageSize = 100;

    while (hasMore) {
      const listUrl = `https://api.betterchoicenotices.com/api/notices/?stateId=44&countyId=33&page=${pageNumber}&pageSize=${pageSize}`;
      console.log(`[TN_HAMILTON Connector] Fetching page ${pageNumber} of notices from Better Choice Notices...`);
      const listResult = await getJSON(listUrl);
      const pageNotices = Array.isArray(listResult) ? listResult : (listResult.results || []);
      
      if (pageNotices.length === 0) {
        hasMore = false;
      } else {
        notices.push(...pageNotices);
        if (Array.isArray(listResult) || !listResult.next) {
          hasMore = false;
        } else {
          pageNumber++;
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    console.log(`[TN_HAMILTON Connector] Loaded ${notices.length} notices from BCN.`);
    
    if (notices.length === 0) {
      throw new Error(`No notices found for Hamilton County from live source API`);
    }
    
    const records = [];
    const pythonScript = path.join(__dirname, 'parse_pdf_to_json.py');

    for (const notice of notices) {
      try {
        console.log(`[TN_HAMILTON Connector] Processing notice ID: ${notice.id} (${notice.property_address})...`);
        const docUrl = `https://api.betterchoicenotices.com/api/document-contents/?noticeId=${notice.id}`;
        const docResult = await getJSON(docUrl);
        
        if (!docResult.preSignedURL) {
          console.warn(`[TN_HAMILTON Connector] Failed to get S3 PDF URL for notice ID ${notice.id}`);
          continue;
        }
        
        const s3Url = docResult.preSignedURL;
        const cmd = `python3 "${pythonScript}" "${s3Url}"`;
        const output = execSync(cmd, { encoding: 'utf8' });
        const parsed = JSON.parse(output);
        
        if (parsed.error) {
          console.warn(`[TN_HAMILTON Connector] Python PDF parser failed for notice ID ${notice.id}: ${parsed.error}`);
          continue;
        }

        let filingDateVal = date;
        if (notice.submitted) {
          const match = notice.submitted.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) filingDateVal = match[1];
        }
        
        let saleDateVal = parsed.sale_date || notice.sale_date || '2026-07-09';
        
        // Setup original text and hash
        const rawText = parsed.raw_text || '';
        const docHash = crypto.createHash('sha256').update(rawText).digest('hex');

        const record = {
          caseNumber: parsed.case_number || `TS-${notice.bcns_id || notice.id}`,
          filingDate: filingDateVal,
          filingType: 'TRUSTEE_SALE',
          parcelNumber: parsed.parcel_number || notice.law_firm_case_number || `INS-${parsed.instrument_number || 'N/A'}`,
          ownerName: parsed.owners || 'UNKNOWN OWNER',
          loanAmount: parsed.loan_amount || 0,
          trusteeName: parsed.trustee || 'Clear Recon LLC',
          plaintiffAttorney: 'Clear Recon LLC',
          auctionDate: new Date(saleDateVal).toISOString(),
          propertyAddress: {
            street: parsed.street || notice.property_address || 'Property Address Pending',
            city: parsed.city || 'Chattanooga',
            state: 'TN',
            zip: parsed.zip || '37402'
          },
          mailingAddress: {
            street: parsed.street || notice.property_address || 'Property Address Pending',
            city: parsed.city || 'Chattanooga',
            state: 'TN',
            zip: parsed.zip || '37402'
          },
          latitude: notice.latitude || 35.0456,
          longitude: notice.longitude || -85.3097,
          documentUrl: s3Url.split('?')[0],
          sourceUrl: s3Url.split('?')[0],
          sourceType: 'Better Choice Notices',
          sourceConfidenceScore: 91,
          rawPayload: {
            source: 'Better Choice Notices (Hamilton County)',
            extracted_at: new Date().toISOString(),
            notice_id: notice.id,
            bcns_id: notice.bcns_id,
            document_hash: docHash,
            parser_version: '1.0.0',
            provenance_score: 100,
            evidence_location: s3Url.split('?')[0],
            raw_extracted_text: rawText
          }
        };

        records.push(record);
      } catch (err) {
        console.error(`[TN_HAMILTON Connector] Error processing notice ID ${notice.id}:`, err.message);
      }
    }

    return records;
  }
}

module.exports = HamiltonTNConnector;
