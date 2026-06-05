const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const newHash = '$2b$10$SU1w84XPGIAnZ0zn8/qhyOr3z5wjT/xueaKyeDVs0umsngKKwJ2sS';

pool.query(
  "UPDATE users SET password_hash = $1 WHERE email = 'mrronaldlewisjr@gmail.com' RETURNING email, role",
  [newHash]
).then(r => {
  console.log('Password updated:', r.rows);
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
});
