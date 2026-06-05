async function run() {
  console.log('Fetching scraper logs from production API...');
  try {
    const res = await fetch('https://foreclosure-finder-api-production.up.railway.app/api/v1/ingestion/scrapers-log');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Logs count:', data.logs ? data.logs.length : 0);
    if (data.logs && data.logs.length > 0) {
      console.log('Recent logs:', JSON.stringify(data.logs.slice(0, 10), null, 2));
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}
run();
