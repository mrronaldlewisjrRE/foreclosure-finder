const http = require('https');

function trigger() {
  console.log('Sending POST to production ingestion trigger...');
  const postData = '{}';
  const options = {
    hostname: 'foreclosure-finder-api-production.up.railway.app',
    port: 443,
    path: '/api/v1/ingestion/trigger',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      console.log('Response Body:', body);
    });
  });

  req.on('error', (err) => {
    console.error('Request failed:', err.message);
  });

  req.write(postData);
  req.end();
}

trigger();
