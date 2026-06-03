const CountyConnectorBase = require('./county-connector-base');

class HillsboroughFLConnector extends CountyConnectorBase {
  constructor() {
    super({
      countyCode: 'FL_HILLSBOROUGH',
      state: 'FL',
      countyName: 'Hillsborough County',
      distressType: 'TAX_DELINQUENCY',
      sourceType: 'Tax Collector',
      sourceUrl: 'https://hillsborough.realtaxcollect.com',
      confidenceScore: 95
    });
  }
}

module.exports = HillsboroughFLConnector;
