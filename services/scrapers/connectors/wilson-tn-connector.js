const CountyConnectorBase = require('./county-connector-base');

class WilsonTNConnector extends CountyConnectorBase {
  constructor() {
    super({
      countyCode: 'TN_WILSON',
      state: 'TN',
      countyName: 'Wilson County',
      distressType: 'NOTICE_OF_DEFAULT',
      sourceType: 'Register of Deeds',
      sourceUrl: 'https://wilsoncounty-tn.gov/deeds',
      confidenceScore: 90
    });
  }
}

module.exports = WilsonTNConnector;
