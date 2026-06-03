const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

function getNgrokUrl() {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.tunnels && data.tunnels.length > 0) {
              const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
              if (httpsTunnel) {
                clearInterval(interval);
                resolve(httpsTunnel.public_url);
              }
            }
          } catch (e) {}
        });
      });
      req.on('error', () => {});
    }, 1000);
  });
}

async function main() {
  console.log('1. Killing any existing ngrok processes...');
  try {
    execSync('taskkill /f /im ngrok.exe', { stdio: 'ignore' });
  } catch (e) {}

  console.log('2. Starting Ngrok tunnel on port 4000...');
  const ngrok = spawn('ngrok', ['http', '4000'], {
    detached: true,
    stdio: 'ignore'
  });
  ngrok.unref();

  console.log('Waiting for Ngrok tunnel to initialize...');
  const url = await getNgrokUrl();
  console.log('Tunnel established at URL:', url);

  console.log('3. Configuring Vercel environment variables...');
  const frontendDir = path.join(__dirname, '../services/frontend');
  
  // Set in Vercel
  execSync(`npx.cmd vercel env add VITE_API_URL production --value "${url}" --yes --force`, { cwd: frontendDir, stdio: 'inherit' });
  execSync(`npx.cmd vercel env add VITE_API_URL preview --value "${url}" --yes --force`, { cwd: frontendDir, stdio: 'inherit' });
  execSync(`npx.cmd vercel env add VITE_API_URL development --value "${url}" --yes --force`, { cwd: frontendDir, stdio: 'inherit' });

  console.log('4. Triggering Vercel production build and deployment...');
  execSync(`npx.cmd vercel --prod --yes`, { cwd: frontendDir, stdio: 'inherit' });

  console.log('5. Waiting 10 seconds for Vercel deployment to propagate...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('Deployment complete and tunnel active.');
}

main().catch(err => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
