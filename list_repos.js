const token = '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';

async function run() {
  console.log('Fetching user repositories...');
  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Node-Fetch'
      }
    });
    
    if (!res.ok) {
      console.error('API Error:', res.status, res.statusText);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    const repos = await res.json();
    console.log(`Found ${repos.length} repositories:`);
    repos.forEach(r => {
      console.log(`- Name: ${r.full_name} | Private: ${r.private} | Permissions: ${JSON.stringify(r.permissions)}`);
    });
  } catch (err) {
    console.error(err);
  }
}
run();
