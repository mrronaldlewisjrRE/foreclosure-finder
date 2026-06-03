const CountyConnectorBase = require('./county-connector-base');

class FultonGAConnector extends CountyConnectorBase {
  constructor() {
    super({
      countyCode: 'GA_FULTON',
      state: 'GA',
      countyName: 'Fulton County',
      distressType: 'NOTICE_OF_DEFAULT',
      sourceType: 'Deeds & Land Records',
      sourceUrl: 'https://fultonclerk.org/land-deeds',
      confidenceScore: 94
    });
  }
}

module.exports = FultonGAConnector;
