/**
 * Register new state counties (IN, NJ, NY, VA) in the counties table.
 * The worker dynamically queries this table on each cron run.
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const NEW_COUNTIES = [
  // Indiana (8 counties)
  { code: 'IN_MARION',      state: 'IN', name: 'Marion County',       city: 'Indianapolis' },
  { code: 'IN_LAKE',        state: 'IN', name: 'Lake County',         city: 'Gary' },
  { code: 'IN_ALLEN',       state: 'IN', name: 'Allen County',        city: 'Fort Wayne' },
  { code: 'IN_HAMILTON',    state: 'IN', name: 'Hamilton County',     city: 'Carmel' },
  { code: 'IN_STJOSEPH',   state: 'IN', name: 'St. Joseph County',   city: 'South Bend' },
  { code: 'IN_ELKHART',     state: 'IN', name: 'Elkhart County',      city: 'Elkhart' },
  { code: 'IN_TIPPECANOE',  state: 'IN', name: 'Tippecanoe County',   city: 'Lafayette' },
  { code: 'IN_VANDERBURGH', state: 'IN', name: 'Vanderburgh County',  city: 'Evansville' },

  // New Jersey (10 counties)
  { code: 'NJ_ESSEX',     state: 'NJ', name: 'Essex County',     city: 'Newark' },
  { code: 'NJ_HUDSON',    state: 'NJ', name: 'Hudson County',    city: 'Jersey City' },
  { code: 'NJ_BERGEN',    state: 'NJ', name: 'Bergen County',    city: 'Hackensack' },
  { code: 'NJ_PASSAIC',   state: 'NJ', name: 'Passaic County',   city: 'Paterson' },
  { code: 'NJ_MIDDLESEX', state: 'NJ', name: 'Middlesex County', city: 'New Brunswick' },
  { code: 'NJ_MONMOUTH',  state: 'NJ', name: 'Monmouth County',  city: 'Freehold' },
  { code: 'NJ_CAMDEN',    state: 'NJ', name: 'Camden County',    city: 'Camden' },
  { code: 'NJ_MERCER',    state: 'NJ', name: 'Mercer County',    city: 'Trenton' },
  { code: 'NJ_UNION',     state: 'NJ', name: 'Union County',     city: 'Elizabeth' },
  { code: 'NJ_OCEAN',     state: 'NJ', name: 'Ocean County',     city: 'Toms River' },

  // New York (10 counties)
  { code: 'NY_NEWYORK',     state: 'NY', name: 'New York County',     city: 'Manhattan' },
  { code: 'NY_KINGS',       state: 'NY', name: 'Kings County',        city: 'Brooklyn' },
  { code: 'NY_QUEENS',      state: 'NY', name: 'Queens County',       city: 'Queens' },
  { code: 'NY_BRONX',       state: 'NY', name: 'Bronx County',        city: 'Bronx' },
  { code: 'NY_RICHMOND',    state: 'NY', name: 'Richmond County',     city: 'Staten Island' },
  { code: 'NY_NASSAU',      state: 'NY', name: 'Nassau County',       city: 'Mineola' },
  { code: 'NY_SUFFOLK',     state: 'NY', name: 'Suffolk County',      city: 'Riverhead' },
  { code: 'NY_WESTCHESTER', state: 'NY', name: 'Westchester County',  city: 'White Plains' },
  { code: 'NY_ERIE',        state: 'NY', name: 'Erie County',         city: 'Buffalo' },
  { code: 'NY_MONROE',      state: 'NY', name: 'Monroe County',       city: 'Rochester' },

  // Virginia (10 counties/cities)
  { code: 'VA_FAIRFAX',       state: 'VA', name: 'Fairfax County',       city: 'Fairfax' },
  { code: 'VA_RICHMONDCITY',  state: 'VA', name: 'Richmond City',        city: 'Richmond' },
  { code: 'VA_VIRGINIABEACH', state: 'VA', name: 'Virginia Beach City',  city: 'Virginia Beach' },
  { code: 'VA_NORFOLK',       state: 'VA', name: 'Norfolk City',         city: 'Norfolk' },
  { code: 'VA_HENRICO',       state: 'VA', name: 'Henrico County',       city: 'Henrico' },
  { code: 'VA_CHESTERFIELD',  state: 'VA', name: 'Chesterfield County',  city: 'Chesterfield' },
  { code: 'VA_ARLINGTON',     state: 'VA', name: 'Arlington County',     city: 'Arlington' },
  { code: 'VA_PRINCEWILLIAM', state: 'VA', name: 'Prince William County',city: 'Woodbridge' },
  { code: 'VA_LOUDOUN',       state: 'VA', name: 'Loudoun County',       city: 'Leesburg' },
  { code: 'VA_HAMPTON',       state: 'VA', name: 'Hampton City',         city: 'Hampton' },
];

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Register New State Counties — IN, NJ, NY, VA           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let inserted = 0;
  let skipped = 0;

  for (const county of NEW_COUNTIES) {
    try {
      // Check if county already exists
      const existing = await pool.query('SELECT county_code FROM counties WHERE county_code = $1', [county.code]);
      if (existing.rows.length > 0) {
        // Ensure it's active
        await pool.query('UPDATE counties SET is_active = TRUE WHERE county_code = $1', [county.code]);
        console.log(`  ⏭️  ${county.code} (${county.name}) — already exists, ensured active`);
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO counties (county_code, state, county_name, primary_city, is_active, created_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW())`,
        [county.code, county.state, county.name, county.city]
      );
      console.log(`  ✅ ${county.code} (${county.name}, ${county.city}) — registered`);
      inserted++;
    } catch (err) {
      console.error(`  ❌ ${county.code}: ${err.message}`);
    }
  }

  // Show final summary
  const totalRes = await pool.query('SELECT COUNT(*) as cnt FROM counties WHERE is_active = TRUE');
  const byState = await pool.query(
    "SELECT SUBSTRING(county_code FROM 1 FOR 2) as state, COUNT(*) as cnt FROM counties WHERE is_active = TRUE GROUP BY SUBSTRING(county_code FROM 1 FOR 2) ORDER BY cnt DESC"
  );

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTS                                                 ║`);
  console.log(`║  Inserted: ${String(inserted).padEnd(46)}║`);
  console.log(`║  Skipped:  ${String(skipped).padEnd(46)}║`);
  console.log(`║  Total Active Counties: ${String(totalRes.rows[0]?.cnt || 0).padEnd(33)}║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);

  console.log('\n📊 Active counties by state:');
  byState.rows.forEach(r => console.log(`  ${r.state}: ${r.cnt} counties`));

  await pool.end();
}

main().catch(err => { console.error('FATAL:', err); pool.end(); process.exit(1); });
