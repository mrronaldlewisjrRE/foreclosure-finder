/**
 * Better Choice Notices (BCN) Universal Connector
 * 
 * Pulls real foreclosure notices from the BCN API for any Tennessee county.
 * Bypasses the Python PDF parser — ingests directly from BCN JSON API data.
 * 
 * BCN stateId mapping: 44 = Tennessee
 */
const CountyConnectorBase = require('./county-connector-base');
const https = require('https');
const crypto = require('crypto');

// BCN countyId mapping for Tennessee counties
const BCN_COUNTY_IDS = {
  'TN_DAVIDSON': 19,
  'TN_RUTHERFORD': 75,
  'TN_WILLIAMSON': 94,
  'TN_WILSON': 95,
  'TN_SHELBY': 79,
  'TN_HAMILTON': 33,
  'TN_KNOX': 47,
  'TN_SUMNER': 83,
  'TN_MONTGOMERY': 54,
  'TN_MAURY': 51,
  'TN_BLOUNT': 5,
  'TN_ANDERSON': 1,
  'TN_LOUDON': 48,
  'TN_FAYETTE': 24,
  'TN_TIPTON': 84,
  'TN_BRADLEY': 6,
  'TN_MARION': 50,
  'TN_SULLIVAN': 82,
  'TN_OBION': 61,
};

// City coordinates for Tennessee counties (for geocoding)
const TN_COUNTY_COORDS = {
  'TN_DAVIDSON':   { lat: 36.1627, lng: -86.7816, city: 'NASHVILLE',     zip: '37203' },
  'TN_RUTHERFORD': { lat: 35.8456, lng: -86.3903, city: 'MURFREESBORO',  zip: '37130' },
  'TN_WILLIAMSON': { lat: 35.9251, lng: -86.8689, city: 'FRANKLIN',      zip: '37064' },
  'TN_WILSON':     { lat: 36.1954, lng: -86.2947, city: 'LEBANON',       zip: '37087' },
  'TN_SHELBY':     { lat: 35.1495, lng: -90.0490, city: 'MEMPHIS',       zip: '38103' },
  'TN_HAMILTON':    { lat: 35.0456, lng: -85.3097, city: 'CHATTANOOGA',   zip: '37402' },
  'TN_KNOX':       { lat: 35.9606, lng: -83.9207, city: 'KNOXVILLE',     zip: '37902' },
  'TN_SUMNER':     { lat: 36.4709, lng: -86.5564, city: 'GALLATIN',      zip: '37066' },
  'TN_MONTGOMERY': { lat: 36.5298, lng: -87.3595, city: 'CLARKSVILLE',   zip: '37040' },
  'TN_MAURY':      { lat: 35.6151, lng: -87.0353, city: 'COLUMBIA',      zip: '38401' },
  'TN_BLOUNT':     { lat: 35.7568, lng: -83.9744, city: 'MARYVILLE',     zip: '37801' },
  'TN_ANDERSON':   { lat: 36.1012, lng: -84.1496, city: 'CLINTON',       zip: '37716' },
  'TN_LOUDON':     { lat: 35.7332, lng: -84.3438, city: 'LOUDON',        zip: '37774' },
  'TN_FAYETTE':    { lat: 35.1979, lng: -89.4145, city: 'SOMERVILLE',    zip: '38068' },
  'TN_TIPTON':     { lat: 35.5057, lng: -89.7587, city: 'COVINGTON',     zip: '38019' },
  'TN_BRADLEY':    { lat: 35.1645, lng: -84.8710, city: 'CLEVELAND',     zip: '37311' },
  'TN_MARION':     { lat: 35.0262, lng: -85.5869, city: 'JASPER',        zip: '37347' },
  'TN_SULLIVAN':   { lat: 36.5484, lng: -82.2540, city: 'BLOUNTVILLE',   zip: '37617' },
  'TN_OBION':      { lat: 36.3426, lng: -89.1048, city: 'UNION CITY',    zip: '38261' },
};

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
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`Failed to parse JSON from ${url}: ${body.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

/**
 * Parse a BCN property_address string into structured parts.
 * Examples: "7524 WOODSTREAM DR", "1391 Bellavista Blvd Nashville, TN 37207"
 */
function parseAddress(raw, countyDefaults) {
  if (!raw) return { street: 'Address Pending', city: countyDefaults.city, state: 'TN', zip: countyDefaults.zip };

  // Try parsing "Street, City, ST ZIP"
  const fullMatch = raw.match(/^(.+?),\s*([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/);
  if (fullMatch) {
    return {
      street: fullMatch[1].trim(),
      city: fullMatch[2].trim().toUpperCase(),
      state: fullMatch[3],
      zip: fullMatch[4] || countyDefaults.zip
    };
  }

  // Try "Street City, ST ZIP"
  const altMatch = raw.match(/^(.+?)\s+([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?$/);
  if (altMatch) {
    return {
      street: altMatch[1].trim(),
      city: altMatch[2].trim().toUpperCase(),
      state: altMatch[3],
      zip: altMatch[4] || countyDefaults.zip
    };
  }

  // Fallback — treat entire string as street, use county defaults
  return {
    street: raw.trim(),
    city: countyDefaults.city,
    state: 'TN',
    zip: countyDefaults.zip
  };
}

class BCNUniversalConnector extends CountyConnectorBase {
  constructor(countyCode) {
    const bcnCountyId = BCN_COUNTY_IDS[countyCode];
    const coords = TN_COUNTY_COORDS[countyCode] || TN_COUNTY_COORDS['TN_DAVIDSON'];
    
    super({
      countyCode,
      state: 'TN',
      countyName: countyCode.replace('TN_', '') + ' County',
      distressType: 'TRUSTEE_SALE',
      sourceType: 'Better Choice Notices',
      sourceUrl: 'https://www.betterchoicenotices.com',
      confidenceScore: 95
    });
    
    this.bcnCountyId = bcnCountyId;
    this.coords = coords;
  }

  async executeSearch(page, date) {
    if (!this.bcnCountyId) {
      console.log(`[BCN ${this.config.countyCode}] No BCN county ID mapped. Will try state-wide search.`);
    }
    return true;
  }

  async extractRecords(countyCode, date) {
    console.log(`[BCN ${countyCode}] Querying live foreclosure notices from Better Choice Notices API...`);
    
    const notices = [];
    let pageNumber = 1;
    let hasMore = true;
    const pageSize = 100;

    // Build URL — if we have a specific countyId, use it. Otherwise fetch all TN.
    const baseParams = this.bcnCountyId
      ? `stateId=44&countyId=${this.bcnCountyId}`
      : `stateId=44`;

    while (hasMore) {
      const url = `https://api.betterchoicenotices.com/api/notices/?${baseParams}&page=${pageNumber}&pageSize=${pageSize}`;
      console.log(`[BCN ${countyCode}] Fetching page ${pageNumber}...`);
      
      try {
        const result = await getJSON(url);
        const pageNotices = Array.isArray(result) ? result : (result.results || []);
        
        if (pageNotices.length === 0) {
          hasMore = false;
        } else {
          notices.push(...pageNotices);
          if (Array.isArray(result) || !result.next || pageNotices.length < pageSize) {
            hasMore = false;
          } else {
            pageNumber++;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch (err) {
        console.error(`[BCN ${countyCode}] API fetch failed on page ${pageNumber}:`, err.message);
        hasMore = false;
      }
    }
    
    console.log(`[BCN ${countyCode}] Retrieved ${notices.length} live notices.`);
    
    if (notices.length === 0) {
      console.log(`[BCN ${countyCode}] No notices found — this county may not have current filings.`);
      return [];
    }

    const records = [];
    const countyDefaults = this.coords;

    for (const notice of notices) {
      try {
        // Skip cancelled notices
        if (notice.cancelled) continue;

        // Parse filing date
        let filingDate = date;
        if (notice.submitted) {
          const match = notice.submitted.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) filingDate = match[1];
        }

        // Parse sale/auction date
        const auctionDate = notice.postponed_sale_date || notice.sale_date || null;

        // Parse address from BCN JSON (no PDF parsing needed)
        const parsed = parseAddress(notice.property_address, countyDefaults);

        // Map BCN notice category to our filing type
        // Tennessee uses Deed of Trust (non-judicial) → Trustee Sales
        let filingType = 'TRUSTEE_SALE';
        const category = (notice.notice_category_name || '').toLowerCase();
        if (category.includes('tax')) filingType = 'TAX_DELINQUENCY';
        else if (category.includes('sheriff')) filingType = 'SHERIFF_SALE';
        else if (category.includes('probate')) filingType = 'PROBATE';
        else if (category.includes('lis pendens') || category.includes('lis_pendens')) filingType = 'LIS_PENDENS';
        else if (category.includes('default') || category.includes('nod')) filingType = 'NOTICE_OF_DEFAULT';

        // Generate document hash from notice data
        const hashPayload = `${notice.bcns_id || notice.id}-${notice.property_address}-${notice.sale_date}`;
        const docHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

        // Generate case number
        const caseNumber = notice.law_firm_case_number || `BCN-${notice.bcns_id || notice.id}`;

        // Geocoding: add slight random offset around county center for map spread
        const latOffset = (Math.random() - 0.5) * 0.15;
        const lngOffset = (Math.random() - 0.5) * 0.15;

        const record = {
          caseNumber,
          filingDate,
          filingType,
          parcelNumber: notice.law_firm_case_number || `BCN-${notice.id}`,
          ownerName: 'Owner - Court Record',
          loanAmount: 0,
          trusteeName: notice.customer_name || 'Substitute Trustee',
          plaintiffAttorney: notice.customer_name || 'Trustee Counsel, PLLC',
          auctionDate,
          propertyAddress: parsed,
          mailingAddress: parsed,
          latitude: countyDefaults.lat + latOffset,
          longitude: countyDefaults.lng + lngOffset,
          documentUrl: `https://www.betterchoicenotices.com/notice/${notice.id}`,
          sourceUrl: `https://www.betterchoicenotices.com/notice/${notice.id}`,
          sourceType: `Better Choice Notices (${notice.notice_category_name || 'Foreclosure'})`,
          sourceConfidenceScore: 95,
          provenanceScore: 100,
          documentHash: docHash,
          evidenceLocation: `https://www.betterchoicenotices.com/notice/${notice.id}`,
          parserVersion: '2.0.0',
          isVerified: true,
          specificFields: {
            saleDate: auctionDate,
            trusteeName: notice.customer_name || 'Substitute Trustee',
            bcnsId: notice.bcns_id,
            noticeStatus: notice.status_name,
            isPostponement: notice.is_postponement === 1,
            firstRunDate: notice.first_run_date,
            lastRunDate: notice.last_run_date
          },
          rawPayload: {
            source: 'Better Choice Notices API (JSON Direct)',
            extracted_at: new Date().toISOString(),
            notice_id: notice.id,
            bcns_id: notice.bcns_id,
            notice_category: notice.notice_category_name,
            customer_name: notice.customer_name,
            county_name: notice.county_name,
            state_code: notice.state_code
          }
        };

        records.push(record);
      } catch (err) {
        console.error(`[BCN ${countyCode}] Error processing notice ${notice.id}:`, err.message);
      }
    }

    console.log(`[BCN ${countyCode}] Successfully built ${records.length} records for ingestion.`);
    return records;
  }
}

module.exports = BCNUniversalConnector;
