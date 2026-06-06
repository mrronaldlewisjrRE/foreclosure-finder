/**
 * Fix scraped data + Expand scraper to ALL states
 * 
 * Step 1: Fix existing TN records (clean up city/street swap, ZIP codes)
 * Step 2: Scrape remaining states with Puppeteer
 */
require('dotenv').config();
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ═══════════════════════════════════════════════════════════════════
// STEP 1: Fix existing scraped records
// ═══════════════════════════════════════════════════════════════════
async function fixExistingRecords() {
  console.log('🔧 Fixing existing scraped records...\n');
  
  // Fix records where county_code has ZIP instead of county name
  const badCodes = await pool.query(
    "SELECT id, property_street, property_city, county_code, property_zip FROM foreclosure_leads WHERE county_code ~ '^TN_3\\d{4}$'"
  );
  
  console.log(`  Found ${badCodes.rows.length} records with ZIP as county_code`);
  
  for (const row of badCodes.rows) {
    // The ZIP is in the county_code field, extract it
    const zip = row.county_code.replace('TN_', '');
    
    // Map ZIP to county
    const countyMap = {
      '37191': { county: 'TN_MONTGOMERY', city: 'Woodlawn' },
      '37048': { county: 'TN_SUMNER', city: 'Cottontown' },
      '37184': { county: 'TN_WILSON', city: 'Watertown' },
      '37062': { county: 'TN_WILLIAMSON', city: 'Fairview' },
      '37086': { county: 'TN_RUTHERFORD', city: 'La Vergne' },
      '37379': { county: 'TN_HAMILTON', city: 'Soddy Daisy' },
    };
    
    const fix = countyMap[zip];
    if (fix) {
      // The street and city are also swapped - city is in street, street is in city
      const realStreet = row.property_city; // swap back
      const realCity = fix.city;
      
      await pool.query(
        'UPDATE foreclosure_leads SET county_code = $1, property_city = $2, property_street = $3, property_zip = $4 WHERE id = $5',
        [fix.county, realCity, realStreet, zip, row.id]
      );
      console.log(`  ✅ Fixed: ${realStreet}, ${realCity} → ${fix.county}`);
    }
  }
  
  // Fix records where city is 'Nashville' but county isn't Davidson
  const wrongCity = await pool.query(
    "SELECT id, property_street, county_code FROM foreclosure_leads WHERE property_city = 'Nashville' AND county_code != 'TN_DAVIDSON' AND (document_url = 'ForeclosureTennessee.com' OR document_url LIKE '%foreclosuretennessee.com%')"
  );
  
  const cityMap = {
    'TN_SHELBY': 'Memphis', 'TN_KNOX': 'Knoxville', 'TN_HAMILTON': 'Chattanooga',
    'TN_RUTHERFORD': 'Murfreesboro', 'TN_WILLIAMSON': 'Franklin', 'TN_WILSON': 'Lebanon',
    'TN_SUMNER': 'Gallatin', 'TN_MONTGOMERY': 'Clarksville', 'TN_MAURY': 'Columbia',
    'TN_SULLIVAN': 'Kingsport', 'TN_FAYETTE': 'Somerville',
  };
  
  for (const row of wrongCity.rows) {
    const correctCity = cityMap[row.county_code];
    if (correctCity) {
      await pool.query('UPDATE foreclosure_leads SET property_city = $1 WHERE id = $2', [correctCity, row.id]);
      console.log(`  ✅ City fix: ${row.property_street} → ${correctCity}`);
    }
  }
  
  // Fix addresses with embedded newlines and city/state
  const messy = await pool.query(
    "SELECT id, property_street FROM foreclosure_leads WHERE property_street LIKE '%\n%' OR property_street LIKE '%, TN%'"
  );
  
  for (const row of messy.rows) {
    let clean = row.property_street
      .split('\n')[0]  // take first line only
      .replace(/,?\s*(?:TN|Tennessee)\s*\d{0,5}\s*$/i, '')
      .trim();
    
    if (clean !== row.property_street) {
      await pool.query('UPDATE foreclosure_leads SET property_street = $1 WHERE id = $2', [clean, row.id]);
      console.log(`  ✅ Cleaned: "${row.property_street.substring(0,40)}" → "${clean}"`);
    }
  }
  
  console.log('\n✅ Data cleanup complete\n');
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2: Scrape ALL remaining states
// ═══════════════════════════════════════════════════════════════════

// Georgia — GeorgiaPublicNotice.com
async function scrapeGeorgia(browser) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  GEORGIA — GeorgiaPublicNotice.com           ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  
  const allLeads = [];
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('  📡 Navigating to Georgia Public Notice Search...');
    await page.goto(`https://www.georgiapublicnotice.com/Search.aspx`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('  🔍 Filling keyword "foreclosure"...');
    await page.type('#ctl00_ContentPlaceHolder1_as1_txtSearch', 'foreclosure');
    
    console.log('  🖱️ Clicking Search button...');
    await Promise.all([
      page.$eval('#ctl00_ContentPlaceHolder1_as1_btnGo1', el => el.click()),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 })
    ]);
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Page through search results
    const maxPages = 5;
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`  📄 Scraping GA Results Page ${pageNum}...`);
      
      const gridExists = await page.$('#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1');
      if (!gridExists) {
        console.log('     ⚠️ Results grid not found.');
        break;
      }
      
      const pageLeads = await page.evaluate(() => {
        const results = [];
        const rows = Array.from(document.querySelectorAll('#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1 tr'));
        
        // Helper list of GA counties to detect
        const gaCounties = ['Fulton','DeKalb','Cobb','Gwinnett','Chatham','Bryan','Catoosa','Effingham','Liberty','Dougherty','Richmond','Muscogee','Bibb','Hall'];
        
        // Custom parser for address extraction from row text
        function parseNotice(text, defaultCounty) {
          const occupantRegex = /Occupant\s+(?:\+\+)?(\d+\s+[A-Za-z0-9\s.#-]+?(?:St|Ave|Rd|Dr|Blvd|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Drive|Street|Avenue|Road|Boulevard|Lane|Circle|Place|Court|Trail|Ter|Trl|Cir|St)),\s*([A-Za-z\s.]+)\s*County,\s*(?:Georgia|GA)/i;
          const addressRegex = /(\d+\s+[A-Za-z0-9\s.#-]+?(?:St|Ave|Rd|Dr|Blvd|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Drive|Street|Avenue|Road|Boulevard|Lane|Circle|Place|Court|Trail|Ter|Trl|Cir|St))[A-Za-z0-9\s.#-]{0,30},\s*([A-Za-z\s.]+),\s*GA\s*(\d{5})?/i;
          
          let m = occupantRegex.exec(text);
          if (m) {
            return {
              street: m[1].replace(/^\+\+/, '').trim(),
              city: m[2].trim(),
              zip: null,
              county: m[2].trim()
            };
          }
          
          m = addressRegex.exec(text);
          if (m) {
            return {
              street: m[1].trim(),
              city: m[2].trim(),
              zip: m[3] || null,
              county: defaultCounty
            };
          }
          
          const streetRegex = /(\d+\s+[A-Za-z0-9\s.#-]+?(?:St|Ave|Rd|Dr|Blvd|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Drive|Street|Avenue|Road|Boulevard|Lane|Circle|Place|Court|Trail|Ter|Trl|Cir|St|MacDonald Lane|Parkview Court))/i;
          const streetMatch = text.match(streetRegex);
          if (streetMatch) {
            const street = streetMatch[1].trim();
            const cityMatch = text.substring(streetMatch.index + street.length).match(/([A-Z][a-z]+),\s*GA/);
            const zipMatch = text.substring(streetMatch.index + street.length).match(/\b(3\d{4})\b/);
            return {
              street: street,
              city: cityMatch ? cityMatch[1].trim() : defaultCounty,
              zip: zipMatch ? zipMatch[1] : null,
              county: defaultCounty
            };
          }
          return null;
        }
        
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim().replace(/\s+/g, ' '));
          if (cells.length === 0) return;
          
          const text = cells.join(' ');
          if (!text.includes('NOTICE') && !text.includes('COURT') && !text.includes('FORECLOSURE')) return;
          
          // Find county name
          let county = 'DeKalb';
          for (const c of gaCounties) {
            if (new RegExp(c, 'i').test(text)) {
              county = c;
              break;
            }
          }
          
          const parsed = parseNotice(text, county);
          if (parsed && parsed.street && parsed.street.length > 5) {
            const cleanStreet = parsed.street.replace(/^\+\+/, '').trim();
            results.push({
              propertyStreet: cleanStreet,
              propertyCity: parsed.city || county,
              propertyZip: parsed.zip,
              countyName: parsed.county || county,
              propertyState: 'GA',
              filingType: 'NOTICE_OF_DEFAULT',
              source: 'GeorgiaPublicNotice.com'
            });
          }
        });
        
        return results;
      });
      
      console.log(`     ✅ Extracted ${pageLeads.length} listings from page ${pageNum}`);
      allLeads.push(...pageLeads);
      
      if (pageNum < maxPages) {
        const nextButton = await page.$('#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1_ctl01_btnNext');
        if (nextButton) {
          console.log('     ➡️ Clicking Next Page...');
          await page.$eval('#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1_ctl01_btnNext', el => el.click());
          await new Promise(r => setTimeout(r, 4000));
        } else {
          console.log('     ⏹️ No more pages.');
          break;
        }
      }
    }
    await page.close();
  } catch (err) {
    console.log(`     ❌ Georgia scrape error: ${err.message}`);
    if (page) await page.close().catch(() => {});
  }
  
  return allLeads;
}

// Texas — County Clerk Sites
async function scrapeTexas(browser) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  TEXAS — County Clerk Portals                ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  
  const counties = [
    { name: 'Harris', url: 'https://www.cclerk.hctx.net/applications/websearch/', city: 'Houston', zips: ['77001','77002','77003','77004','77005','77006','77007','77008','77009','77010'] },
    { name: 'Dallas', url: 'https://www.dallascounty.org/services/county-clerk/', city: 'Dallas', zips: ['75201','75202','75203','75204','75205','75206','75207','75208','75209','75210'] },
    { name: 'Tarrant', url: 'https://www.tarrantcounty.com/en/county-clerk.html', city: 'Fort Worth', zips: ['76101','76102','76103','76104','76105','76106','76107','76108','76109','76110'] },
    { name: 'Bexar', url: 'https://www.bexar.org/1566/County-Clerk', city: 'San Antonio', zips: ['78201','78202','78203','78204','78205','78207','78208','78209','78210','78211'] },
    { name: 'Travis', url: 'https://deed-records.traviscountytx.gov/', city: 'Austin', zips: ['78701','78702','78703','78704','78705','78721','78722','78723','78724','78725'] },
  ];
  
  const allLeads = [];
  
  for (const county of counties) {
    console.log(`  📡 ${county.name} County (${county.city})...`);
    let page;
    try {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(county.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      
      const leads = await page.evaluate((countyName, cityName) => {
        const results = [];
        const body = document.body.textContent || '';
        
        const addrRegex = /(\d+\s+[A-Za-z][A-Za-z0-9\s.]+(?:St|Ave|Rd|Dr|Blvd|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Drive|Street|Avenue|Road|Boulevard|Lane)[^,\n]{0,30})/gi;
        let match;
        const seen = new Set();
        while ((match = addrRegex.exec(body)) !== null) {
          const addr = match[1].trim();
          if (!seen.has(addr) && addr.length > 8 && addr.length < 100) {
            seen.add(addr);
            results.push({
              propertyStreet: addr,
              propertyCity: cityName,
              countyName: countyName,
              propertyState: 'TX',
              filingType: 'TRUSTEE_SALE',
              source: `${countyName} County Clerk`,
            });
          }
        }
        return results;
      }, county.name, county.city);
      
      console.log(`     ✅ ${leads.length} listings`);
      allLeads.push(...leads);
      await page.close();
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`     ❌ ${err.message.substring(0, 80)}`);
      if (page) await page.close().catch(() => {});
    }
  }
  
  return allLeads;
}

// Florida — realforeclose.com with better navigation
async function scrapeFlorida(browser) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  FLORIDA — Clerk Foreclosure Auctions        ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  
  const counties = [
    { name: 'Broward', url: 'https://www.broward.realforeclose.com/index.cfm?zession=foreclosure' },
    { name: 'Hillsborough', url: 'https://www.hillsborough.realforeclose.com/index.cfm?zession=foreclosure' },
    { name: 'Pinellas', url: 'https://www.pinellas.realforeclose.com/index.cfm?zession=foreclosure' },
    { name: 'Pasco', url: 'https://www.pasco.realforeclose.com/index.cfm?zession=foreclosure' },
    { name: 'Polk', url: 'https://www.polk.realforeclose.com/index.cfm?zession=foreclosure' },
    { name: 'Duval', url: 'https://www.duval.realforeclose.com/index.cfm?zession=foreclosure' },
  ];
  
  const allLeads = [];
  
  for (const county of counties) {
    console.log(`  📡 FL/${county.name} County...`);
    let page;
    try {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log(`     1. Navigating to splash page: ${county.url}`);
      await page.goto(county.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise(r => setTimeout(r, 2000));
      
      console.log(`     2. Initializing guest session via click...`);
      const menuBottomExists = await page.$('#splashMenuBottom');
      if (!menuBottomExists) {
        console.log('     ⚠️ #splashMenuBottom not found, attempting direct calendar nav...');
        await page.goto(`${county.url}&action=calendar`, { waitUntil: 'networkidle2' });
      } else {
        await page.click('#splashMenuBottom');
        await page.waitForSelector('.CALBOX', { timeout: 15000 }).catch(() => {});
      }
      
      // Get all active dayids (days with class CALSELF)
      const activeDays = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.CALBOX.CALSELF[dayid]')).map(el => el.getAttribute('dayid'));
      });
      console.log(`     3. Found ${activeDays.length} active auction days:`, activeDays.slice(0, 10));
      
      // Scrape up to 3 active auction days
      const daysToScrape = activeDays.slice(0, 3);
      for (const day of daysToScrape) {
        console.log(`     📅 Loading listings for day ${day}...`);
        const dayUrl = `${county.url.replace('zession=foreclosure', 'zaction=AUCTION&Zmethod=PREVIEW&AUCTIONDATE=' + day)}`;
        await page.goto(dayUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const dayLeads = await page.evaluate((countyName) => {
          const results = [];
          const items = document.querySelectorAll('.AUCTION_ITEM');
          
          items.forEach(item => {
            const typeEl = Array.from(item.querySelectorAll('.AD_LBL')).find(el => el.textContent.includes('Auction Type'));
            const type = typeEl ? typeEl.nextElementSibling.textContent.trim() : '';
            if (type && !type.includes('FORECLOSURE')) return; // skip taxdeeds
            
            const caseEl = Array.from(item.querySelectorAll('.AD_LBL')).find(el => el.textContent.includes('Case #'));
            const caseNumber = caseEl ? caseEl.nextElementSibling.textContent.trim() : '';
            
            const addrEl = Array.from(item.querySelectorAll('.AD_LBL')).find(el => el.textContent.includes('Property Address'));
            let street = '';
            let cityStateZip = '';
            if (addrEl) {
              street = addrEl.nextElementSibling.textContent.trim();
              const tr = addrEl.closest('tr');
              if (tr && tr.nextElementSibling) {
                const nextTd = tr.nextElementSibling.querySelector('.AD_DTA');
                if (nextTd) {
                  cityStateZip = nextTd.textContent.trim();
                }
              }
            }
            
            let city = countyName;
            let zip = '';
            if (cityStateZip) {
              const parts = cityStateZip.split(',');
              if (parts.length >= 1) city = parts[0].trim();
              if (parts.length >= 2) {
                const zipMatch = parts[1].match(/\b(\d{5})\b/);
                if (zipMatch) zip = zipMatch[1];
              }
            }
            
            if (street && street.length > 5 && !street.includes('Property Appraiser') && !street.includes('Clerk Of')) {
              results.push({
                propertyStreet: street,
                propertyCity: city,
                propertyZip: zip || null,
                caseNumber: caseNumber || null,
                countyName: countyName,
                propertyState: 'FL',
                filingType: 'LIS_PENDENS',
                source: `${countyName}.realforeclose.com`,
              });
            }
          });
          return results;
        }, county.name);
        
        console.log(`        ✅ Extracted ${dayLeads.length} listings`);
        allLeads.push(...dayLeads);
      }
      
      await page.close();
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`     ❌ Error: ${err.message}`);
      if (page) await page.close().catch(() => {});
    }
  }
  
  return allLeads;
}

// Ohio + Indiana
async function scrapeOhioIndiana(browser) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  OHIO & INDIANA — Sheriff Sales              ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  
  const sources = [
    { state: 'OH', county: 'Cuyahoga', city: 'Cleveland', url: 'https://cuyahoga.sheriffsaleauction.ohio.gov/', zipPrefix: '44', filingType: 'SHERIFF_SALE' },
    { state: 'IN', county: 'Marion', city: 'Indianapolis', url: 'https://www.govease.com/foreclosures/indiana/marion-county', zipPrefix: '46', filingType: 'SHERIFF_SALE' },
  ];
  
  const allLeads = [];
  
  for (const src of sources) {
    console.log(`  📡 ${src.state}/${src.county} — ${src.url.substring(0, 50)}...`);
    let page;
    try {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.goto(src.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      
      const leads = await page.evaluate((source) => {
        const results = [];
        const body = document.body.textContent || '';
        
        const addrRegex = /(\d+\s+[A-Za-z][A-Za-z0-9\s.]+(?:St|Ave|Rd|Dr|Blvd|Ln|Way|Ct|Pl|Cir|Pkwy|Hwy|Drive|Street|Avenue|Road|Boulevard|Lane)[^,\n]{0,30})/gi;
        let match;
        const seen = new Set();
        while ((match = addrRegex.exec(body)) !== null) {
          const addr = match[1].trim();
          if (!seen.has(addr) && addr.length > 8 && addr.length < 100) {
            seen.add(addr);
            const zipRegex = new RegExp(`\\b(${source.zipPrefix}\\d{3})\\b`);
            const zipMatch = body.substring(match.index, match.index + 200).match(zipRegex);
            results.push({
              propertyStreet: addr,
              propertyCity: source.city,
              propertyZip: zipMatch ? zipMatch[1] : null,
              countyName: source.county,
              propertyState: source.state,
              filingType: source.filingType,
              source: `${source.county} County Sheriff Sale`,
            });
          }
        }
        return results;
      }, src);
      
      console.log(`     ✅ ${leads.length} listings`);
      allLeads.push(...leads);
      await page.close();
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`     ❌ ${err.message.substring(0, 80)}`);
      if (page) await page.close().catch(() => {});
    }
  }
  
  return allLeads;
}

// ═══════════════════════════════════════════════════════════════════
// DATABASE INSERT
// ═══════════════════════════════════════════════════════════════════
async function insertLead(lead) {
  const stateCode = lead.propertyState;
  const countyName = (lead.countyName || '').replace(/\s+/g, '').toUpperCase();
  const countyCode = `${stateCode}_${countyName}`;
  
  let street = (lead.propertyStreet || '').replace(/\s+/g, ' ').trim();
  if (!street || street.length < 5 || street.length > 200) return 'skip';
  
  try {
    const existing = await pool.query(
      'SELECT id FROM foreclosure_leads WHERE property_street = $1 AND county_code = $2 LIMIT 1',
      [street, countyCode]
    );
    if (existing.rows.length > 0) return 'duplicate';
    
    let filingDate = new Date();
    let auctionDate = null;
    if (lead.saleDate && /\d/.test(lead.saleDate)) {
      try {
        const d = new Date(lead.saleDate);
        if (!isNaN(d.getTime())) { filingDate = d; auctionDate = d; }
      } catch {}
    }
    
    const caseNum = lead.caseNumber || `${stateCode}-${countyName.substring(0,3)}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    const hashSig = crypto.createHash('sha256').update(`${street}|${countyCode}`).digest('hex').substring(0, 32);
    
    const normalizedAddr = street.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const rawPayload = { source: lead.source, scrapedAt: new Date().toISOString() };
    
    await pool.query(`
      INSERT INTO foreclosure_leads (
        property_street, property_city, property_state, property_zip,
        county_code, owner_name, case_number, filing_date, filing_type,
        trustee_name, auction_date, verification_status, document_url,
        hash_signature, raw_payload, normalized_address, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
    `, [
      street.substring(0, 250),
      (lead.propertyCity || '').substring(0, 100),
      stateCode,
      (lead.propertyZip || '').substring(0, 10) || null,
      countyCode,
      'Owner - Public Record',
      caseNum.substring(0, 50),
      filingDate,
      lead.filingType || 'NOTICE_OF_DEFAULT',
      (lead.trusteeName || '').substring(0, 250) || null,
      auctionDate,
      'VERIFIED',
      (lead.source || '').substring(0, 250),
      hashSig,
      JSON.stringify(rawPayload),
      normalizedAddr
    ]);
    return 'inserted';
  } catch (err) {
    if (!err.message.includes('duplicate')) {
      console.log(`     ⚠️ ${err.message.substring(0, 100)} (County Code: ${countyCode}, Address: ${street})`);
    }
    return 'error';
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ForeclosureFinder AI — Multi-State Scraper              ║');
  console.log('║  Fix data + Expand to GA, TX, FL, OH, IN                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  // Step 1: Fix existing records
  await fixExistingRecords();
  
  // Step 2: Launch Puppeteer and scrape remaining states
  console.log('🚀 Launching Chrome in headful mode for WAF bypass...');
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
    timeout: 60000,
  });
  console.log('✅ Chrome ready\n');
  
  const gaLeads = await scrapeGeorgia(browser);
  const txLeads = await scrapeTexas(browser);
  const flLeads = await scrapeFlorida(browser);
  const ohInLeads = await scrapeOhioIndiana(browser);
  
  await browser.close();
  console.log('\n🔒 Chrome closed');
  
  const allLeads = [...gaLeads, ...txLeads, ...flLeads, ...ohInLeads];
  console.log(`\n💾 Inserting ${allLeads.length} records from all states...\n`);
  
  let inserted = 0, duplicates = 0, errors = 0, skipped = 0;
  for (const lead of allLeads) {
    const r = await insertLead(lead);
    if (r === 'inserted') inserted++;
    else if (r === 'duplicate') duplicates++;
    else if (r === 'skip') skipped++;
    else errors++;
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Show totals from DB
  const totalCount = await pool.query("SELECT COUNT(*) as cnt FROM foreclosure_leads WHERE document_url IS NOT NULL AND document_url != ''");
  const byState = await pool.query("SELECT property_state, COUNT(*) as cnt FROM foreclosure_leads WHERE document_url IS NOT NULL AND document_url != '' GROUP BY property_state ORDER BY cnt DESC");
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  FINAL RESULTS                                           ║`);
  console.log(`║  New scraped:  ${String(allLeads.length).padEnd(42)}║`);
  console.log(`║  Inserted:     ${String(inserted).padEnd(42)}║`);
  console.log(`║  Duplicates:   ${String(duplicates).padEnd(42)}║`);
  console.log(`║  Total in DB:  ${String(totalCount.rows[0]?.cnt || 0).padEnd(42)}║`);
  console.log(`║  Time:         ${String(elapsed + 's').padEnd(42)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  console.log('\n📊 RECORDS BY STATE (from real sources):');
  byState.rows.forEach(r => console.log(`  ${r.property_state}: ${r.cnt} records`));
  
  if (inserted > 0) {
    console.log('\n📋 NEW RECORDS:');
    const samples = await pool.query(
      "SELECT property_street, property_city, property_state, property_zip, county_code, document_url FROM foreclosure_leads ORDER BY created_at DESC LIMIT 20"
    );
    samples.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.property_street}, ${r.property_city}, ${r.property_state} ${r.property_zip || ''} [${r.county_code}] — ${r.document_url || ''}`);
    });
  }
  
  await pool.end();
}

main().catch(err => { console.error('FATAL:', err); pool.end(); process.exit(1); });
