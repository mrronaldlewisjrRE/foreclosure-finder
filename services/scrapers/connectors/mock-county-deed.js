const BaseConnector = require('../connector-base');
const citiesMetadata = require('../../../scripts/cities-metadata');
const crypto = require('crypto');

class MockCountyDeedConnector extends BaseConnector {
  constructor() {
    super({
      countyCode: 'MOCK_COUNTY',
      dataSourceType: 'HTML_SCRAPE',
      loginRequired: false,
      captchaRequired: false,
      ocrRequired: false
    });

    this.streetNames = [
      'Peach Tree Ln', 'Broadway Ave', 'Main St', 'Oak Dr', 'Pine St', 'Maple Rd', 'Cedar Ave', 'Elm St',
      'Washington Blvd', 'Park Way', 'Lakeview Dr', 'Hillside Ave', 'Summit St', 'View Court', 'Forest Rd',
      'River Dr', 'Grand Ave', 'Sunset Blvd', 'Jefferson Way', 'Lincoln St', 'Madison Ave', 'Franklin Rd',
      'Adams St', 'Monroe Circle', 'Jackson Ave', 'Van Buren St', 'Harrison Rd', 'Tyler Court', 'Polk St',
      'Taylor Ave', 'Fillmore Dr', 'Pierce Rd', 'Buchanan St', 'Grant Ave', 'Hayes St', 'Garfield Rd'
    ];
    
    this.firstNames = [
      'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
      'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
      'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Gary',
      'Ryan', 'Nicholas', 'Eric', 'Stephen', 'Jonathan', 'Larry', 'Justin', 'Scott', 'Brandon', 'Frank',
      'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
      'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna',
      'Michelle', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia'
    ];
    
    this.lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson',
      'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White',
      'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall',
      'Young', 'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson',
      'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres',
      'Parker', 'Collins', 'Edwards', 'Stewart', 'Flores', 'Morris', 'Nguyen', 'Murphy', 'Rivera', 'Cook'
    ];

    this.trusteePool = ['Rubin Lublin PLLC', 'McCalla Raymer Leibert Pierce LLC', 'Wilson & Associates PLLC', 'Shapiro & Ingle LLP', 'Brock & Scott PLLC'];
    this.attorneyPool = ['Hardy Law Group', 'Kennerly Lamishaw LLP', 'The Sayer Law Group', 'Aldridge Pite LLP', 'Codilis & Associates P.C.'];
    this.filingTypes = ['LIS_PENDENS', 'NOTICE_OF_DEFAULT', 'TRUSTEE_SALE', 'TAX_DELINQUENCY', 'PROBATE', 'SHERIFF_SALE'];
  }

  async executeSearch(page, date) {
    console.log(`[MockConnector] Executing search for filings on: ${date}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }

  async extractRecords(countyCode, date) {
    console.log(`[MockConnector] Extracting records for ${countyCode} on date: ${date}`);

    const countySum = countyCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Filter cities matching this county code
    const matchingCities = citiesMetadata.filter(c => c.countyCode === countyCode);
    const state = countyCode.split('_')[0];
    const records = [];

    // Generate 4-6 mock foreclosure filings to populate enough data across cities (deterministic)
    const count = 4 + (countySum % 3);
    
    for (let i = 0; i < count; i++) {
      // Pick a city deterministically
      const cityInfo = matchingCities.length > 0 
        ? matchingCities[(countySum + i) % matchingCities.length]
        : { city: 'Unknown', lat: 35.0, lng: -85.0 };

      // Apply deterministic spatial offset (up to ~6 miles from city center)
      const latOffset = (((countySum * 7 + i * 13) % 100) / 100 - 0.5) * 0.08;
      const lngOffset = (((countySum * 11 + i * 17) % 100) / 100 - 0.5) * 0.08;
      const lat = parseFloat((cityInfo.lat + latOffset).toFixed(6));
      const lng = parseFloat((cityInfo.lng + lngOffset).toFixed(6));

      const streetNumber = 100 + ((countySum * 19 + i * 79) % 8900);
      const streetName = this.streetNames[(countySum + i * 3) % this.streetNames.length];
      const randFirst = this.firstNames[(countySum * 3 + i * 7) % this.firstNames.length];
      const randLast = this.lastNames[(countySum * 7 + i * 13) % this.lastNames.length];
      const middleInitial = String.fromCharCode(65 + ((countySum + i * 5) % 26));
      const owner = `${randLast}, ${randFirst} ${middleInitial}.`;
      const trustee = this.trusteePool[(countySum + i * 2) % this.trusteePool.length];
      const attorney = this.attorneyPool[(countySum + i * 4) % this.attorneyPool.length];
      const filingType = this.filingTypes[(countySum + i * 5) % this.filingTypes.length];
      
      const loanAmount = 110000 + ((countySum * 31 + i * 97) % 480000);
      const zip = String(30000 + ((countySum * 13 + i * 19) % 60000));

      // Hashing address to make case numbers deterministic
      const street = `${streetNumber} ${streetName}`;
      const addressForHash = `${street}-${zip}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hash = crypto.createHash('sha256').update(addressForHash).digest('hex').substring(0, 8).toUpperCase();
      const caseNumber = `MOCK-CS-${hash}`;

      // Deterministic auction date (e.g. 30 to 90 days out)
      const auctionDaysOut = 30 + ((countySum + i * 11) % 60);
      const auctionDate = new Date(new Date(date).getTime() + auctionDaysOut * 24 * 60 * 60 * 1000);

      const specificFields = {};
      if (filingType === 'NOTICE_OF_DEFAULT') {
        specificFields.recordingNumber = `REC-${hash}`;
        specificFields.recordingDate = date;
        specificFields.trustee = trustee;
        specificFields.loanAmount = loanAmount;
      } else if (filingType === 'LIS_PENDENS') {
        specificFields.caseNumber = caseNumber;
        specificFields.filingDate = date;
        specificFields.plaintiff = attorney;
        specificFields.defendant = owner;
        specificFields.courtName = `${state} Circuit Court`;
      } else if (filingType === 'SHERIFF_SALE') {
        specificFields.auctionDate = auctionDate.toISOString();
        specificFields.auctionId = `AUC-${hash}`;
        specificFields.openingBid = Math.round(loanAmount * 0.8);
      } else if (filingType === 'TRUSTEE_SALE') {
        specificFields.saleDate = auctionDate.toISOString();
        specificFields.trusteeName = trustee;
        specificFields.recordingNumber = caseNumber;
      } else if (filingType === 'TAX_DELINQUENCY') {
        specificFields.taxAmountDue = Math.round(2500 + ((countySum * 9 + i * 23) % 8000));
        specificFields.taxYear = new Date(date).getFullYear() - 1;
        specificFields.delinquencyDate = date;
      } else if (filingType === 'PROBATE' || filingType === 'PROBATE_CASE' || filingType === 'PROBATE_PROPERTY') {
        specificFields.probateCaseNumber = caseNumber;
        specificFields.filingDate = date;
        specificFields.estateName = owner;
        specificFields.executor = trustee;
      }

      const p1 = 100 + ((countySum * 13 + i) % 899);
      const p2 = 10 + ((countySum * 17 + i * 3) % 89);
      const p3 = 100 + ((countySum * 19 + i * 7) % 899);
      const parcelNumber = `${p1}-${p2}-${p3}`;

      records.push({
        caseNumber,
        filingDate: date,
        filingType,
        parcelNumber,
        ownerName: owner,
        loanAmount,
        trusteeName: trustee,
        plaintiffAttorney: attorney,
        auctionDate: auctionDate.toISOString(),
        propertyAddress: {
          street,
          city: cityInfo.city,
          state: state,
          zip
        },
        mailingAddress: {
          street,
          city: cityInfo.city,
          state: state,
          zip
        },
        latitude: lat,
        longitude: lng,
        documentUrl: `https://storage.replit.com/foreclosures/${state.toLowerCase()}/${countyCode.toLowerCase()}/doc_${hash}.pdf`,
        sourceConfidenceScore: 90,
        specificFields,
        rawPayload: {
          source: 'COURTHOUSE_MOCK_INGEST_PORTAL',
          extracted_at: new Date().toISOString(),
          record_index: i,
          confidence_score: 90
        }
      });
    }

    return records;
  }
}

module.exports = MockCountyDeedConnector;
