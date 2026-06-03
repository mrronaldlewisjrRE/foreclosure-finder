/**
 * ForeclosureFinder AI — County Connector Base
 * Base class for individual county recorders, clerks, tax offices, and sheriff portal scrapers.
 */

const BaseConnector = require('../connector-base');
const citiesMetadata = require('../../../scripts/cities-metadata');
const crypto = require('crypto');

class CountyConnectorBase extends BaseConnector {
  constructor(options) {
    super({
      countyCode: options.countyCode,
      dataSourceType: 'HTML_SCRAPE',
      loginRequired: options.loginRequired || false,
      captchaRequired: options.captchaRequired || false,
      ocrRequired: options.ocrRequired || false
    });

    this.state = options.state;
    this.countyName = options.countyName;
    this.distressType = options.distressType; // e.g. NOTICE_OF_DEFAULT
    this.sourceType = options.sourceType; // e.g. 'Register of Deeds'
    this.sourceUrl = options.sourceUrl; // e.g. 'https://www.davidsonportal.com'
    this.confidenceScore = options.confidenceScore || 90;
  }

  async executeSearch(page, date) {
    console.log(`[${this.countyCode} Connector] Portal search skipped (mock data fallback is disabled).`);
    return true;
  }

  async extractRecords(countyCode, date) {
    console.log(`[${this.countyCode} Connector] Ingestion skipped (mock data fallback is disabled).`);
    return [];
  }
}

module.exports = CountyConnectorBase;
