// Using global fetch natively
// Node 24 supports global fetch natively

async function test() {
  const apiKey = '47d25a69e49d5d55b10dc12af160d476';
  const endpoints = [
    {
      name: 'Property Basic Profile (Denver test)',
      url: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile?address1=4529%20Winona%20Ct&address2=Denver,%20CO'
    },
    {
      name: 'Property Search by Postal Code (Nashville test)',
      url: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/address?postalcode=37203&pagesize=5'
    },
    {
      name: 'Property Detail (Denver test)',
      url: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1=4529%20Winona%20Ct&address2=Denver,%20CO'
    }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'apikey': apiKey
        }
      });
      console.log(`Endpoint: ${ep.name}`);
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Response keys:`, Object.keys(data));
        if (data.property && data.property.length > 0) {
          console.log(`First property details:`, JSON.stringify(data.property[0], null, 2));
        }
      } else {
        const text = await res.text();
        console.log(`Response:`, text.substring(0, 200));
      }
      console.log('-----------------------------------');
    } catch (err) {
      console.error(`Error testing ${ep.name}:`, err.message);
    }
  }
}
test();
