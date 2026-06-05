const http = require('https');

function getLeads() {
  console.log('Fetching leads from production API...');
  const options = {
    hostname: 'foreclosure-finder-api-production.up.railway.app',
    port: 443,
    path: '/api/v1/leads?limit=5',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      try {
        const data = JSON.parse(body);
        console.log('Total Leads on Production API:', data.total || (data.leads ? data.leads.length : 0));
        if (data.leads && data.leads.length > 0) {
          console.log('Sample Lead:', JSON.stringify({
            id: data.leads[0].id,
            county_code: data.leads[0].countyCode || data.leads[0].county_code,
            case_number: data.leads[0].caseNumber || data.leads[0].case_number,
            filing_type: data.leads[0].filingType || data.leads[0].filing_type,
            propertyAddress: data.leads[0].propertyAddress
          }, null, 2));
        }
      } catch (e) {
        console.log('Response Body:', body.substring(0, 500));
      }
    });
  });

  req.on('error', (err) => {
    console.error('Request failed:', err.message);
  });

  req.end();
}

getLeads();
