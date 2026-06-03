/**
 * Base abstract class defining standard structures for county scrapers.
 */
class BaseConnector {
  constructor(config) {
    this.countyCode = config.countyCode;
    this.dataSourceType = config.dataSourceType || 'HTML_SCRAPE';
    this.loginRequired = !!config.loginRequired;
    this.captchaRequired = !!config.captchaRequired;
    this.ocrRequired = !!config.ocrRequired;
    this.updateFrequency = config.updateFrequency || 'daily';
  }

  async login(page) {
    if (!this.loginRequired) return true;
    throw new Error(`login() not implemented for county: ${this.countyCode}`);
  }

  async solveCaptcha(page, siteKey, type) {
    if (!this.captchaRequired) return true;
    console.log(`[BaseConnector] CAPTCHA detected for ${this.countyCode}. Triggering solving provider...`);
    // Placeholder for provider mapping (e.g. CapSolver / 2Captcha)
    return true;
  }

  async executeSearch(page, date) {
    throw new Error(`executeSearch() not implemented for county: ${this.countyCode}`);
  }

  async extractRecords(page) {
    throw new Error(`extractRecords() not implemented for county: ${this.countyCode}`);
  }
}

module.exports = BaseConnector;
