const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/api-gateway/server.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('fastify.get(') || line.includes('fastify.post(') || line.includes('fastify.patch(') || line.includes('fastify.delete(')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
