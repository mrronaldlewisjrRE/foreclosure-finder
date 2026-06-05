const { Pool } = require('pg');
require('dotenv').config();

const counties = [
  // Indiana & Ohio
  { code: 'IN_MARION', name: 'Marion County', state: 'IN' },
  { code: 'OH_CUYAHOGA', name: 'Cuyahoga County', state: 'OH' },

  // Tennessee
  { code: 'TN_DAVIDSON', name: 'Davidson County', state: 'TN' },
  { code: 'TN_RUTHERFORD', name: 'Rutherford County', state: 'TN' },
  { code: 'TN_WILLIAMSON', name: 'Williamson County', state: 'TN' },
  { code: 'TN_WILSON', name: 'Wilson County', state: 'TN' },
  { code: 'TN_SHELBY', name: 'Shelby County', state: 'TN' },
  { code: 'TN_HAMILTON', name: 'Hamilton County', state: 'TN' },
  { code: 'TN_KNOX', name: 'Knox County', state: 'TN' },
  { code: 'TN_SUMNER', name: 'Sumner County', state: 'TN' },
  { code: 'TN_MONTGOMERY', name: 'Montgomery County', state: 'TN' },
  { code: 'TN_MAURY', name: 'Maury County', state: 'TN' },
  { code: 'TN_BLOUNT', name: 'Blount County', state: 'TN' },
  { code: 'TN_ANDERSON', name: 'Anderson County', state: 'TN' },
  { code: 'TN_LOUDON', name: 'Loudon County', state: 'TN' },
  { code: 'TN_FAYETTE', name: 'Fayette County', state: 'TN' },
  { code: 'TN_TIPTON', name: 'Tipton County', state: 'TN' },
  { code: 'TN_BRADLEY', name: 'Bradley County', state: 'TN' },
  { code: 'TN_MARION', name: 'Marion County', state: 'TN' },
  { code: 'TN_SULLIVAN', name: 'Sullivan County', state: 'TN' },
  { code: 'TN_OBION', name: 'Obion County', state: 'TN' },

  // Texas
  { code: 'TX_HARRIS', name: 'Harris County', state: 'TX' },
  { code: 'TX_FORTBEND', name: 'Fort Bend County', state: 'TX' },
  { code: 'TX_MONTGOMERY', name: 'Montgomery County', state: 'TX' },
  { code: 'TX_BRAZORIA', name: 'Brazoria County', state: 'TX' },
  { code: 'TX_DALLAS', name: 'Dallas County', state: 'TX' },
  { code: 'TX_TARRANT', name: 'Tarrant County', state: 'TX' },
  { code: 'TX_COLLIN', name: 'Collin County', state: 'TX' },
  { code: 'TX_DENTON', name: 'Denton County', state: 'TX' },
  { code: 'TX_TRAVIS', name: 'Travis County', state: 'TX' },
  { code: 'TX_WILLIAMSON', name: 'Williamson County', state: 'TX' },
  { code: 'TX_HAYS', name: 'Hays County', state: 'TX' },
  { code: 'TX_BASTROP', name: 'Bastrop County', state: 'TX' },
  { code: 'TX_BEXAR', name: 'Bexar County', state: 'TX' },
  { code: 'TX_COMAL', name: 'Comal County', state: 'TX' },
  { code: 'TX_GUADALUPE', name: 'Guadalupe County', state: 'TX' },
  { code: 'TX_MEDINA', name: 'Medina County', state: 'TX' },

  // Louisiana
  { code: 'LA_ORLEANS', name: 'Orleans Parish', state: 'LA' },
  { code: 'LA_JEFFERSON', name: 'Jefferson Parish', state: 'LA' },
  { code: 'LA_STTAMMANY', name: 'St Tammany Parish', state: 'LA' },
  { code: 'LA_STBERNARD', name: 'St Bernard Parish', state: 'LA' },
  { code: 'LA_EASTBATONROUGE', name: 'East Baton Rouge Parish', state: 'LA' },
  { code: 'LA_ASCENSION', name: 'Ascension Parish', state: 'LA' },
  { code: 'LA_LIVINGSTON', name: 'Livingston Parish', state: 'LA' },
  { code: 'LA_WESTBATONROUGE', name: 'West Baton Rouge Parish', state: 'LA' },
  { code: 'LA_LAFAYETTE', name: 'Lafayette Parish', state: 'LA' },
  { code: 'LA_ACADIA', name: 'Acadia Parish', state: 'LA' },
  { code: 'LA_STMARTIN', name: 'St Martin Parish', state: 'LA' },
  { code: 'LA_IBERIA', name: 'Iberia Parish', state: 'LA' },
  { code: 'LA_CADDO', name: 'Caddo Parish', state: 'LA' },
  { code: 'LA_BOSSIER', name: 'Bossier Parish', state: 'LA' },
  { code: 'LA_WEBSTER', name: 'Webster Parish', state: 'LA' },
  { code: 'LA_DESOTO', name: 'DeSoto Parish', state: 'LA' },

  // Georgia
  { code: 'GA_FULTON', name: 'Fulton County', state: 'GA' },
  { code: 'GA_COBB', name: 'Cobb County', state: 'GA' },
  { code: 'GA_DEKALB', name: 'DeKalb County', state: 'GA' },
  { code: 'GA_GWINNETT', name: 'Gwinnett County', state: 'GA' },
  { code: 'GA_CATOOSA', name: 'Catoosa County', state: 'GA' },
  { code: 'GA_CHATHAM', name: 'Chatham County', state: 'GA' },
  { code: 'GA_EFFINGHAM', name: 'Effingham County', state: 'GA' },
  { code: 'GA_BRYAN', name: 'Bryan County', state: 'GA' },
  { code: 'GA_LIBERTY', name: 'Liberty County', state: 'GA' },

  // Florida
  { code: 'FL_MIAMIDADE', name: 'Miami-Dade County', state: 'FL' },
  { code: 'FL_HILLSBOROUGH', name: 'Hillsborough County', state: 'FL' },
  { code: 'FL_PINELLAS', name: 'Pinellas County', state: 'FL' },
  { code: 'FL_PASCO', name: 'Pasco County', state: 'FL' },
  { code: 'FL_POLK', name: 'Polk County', state: 'FL' },
  { code: 'FL_ORANGE', name: 'Orange County', state: 'FL' },
  { code: 'FL_SEMINOLE', name: 'Seminole County', state: 'FL' },
  { code: 'FL_OSCEOLA', name: 'Osceola County', state: 'FL' },
  { code: 'FL_LAKE', name: 'Lake County', state: 'FL' },
  { code: 'FL_BROWARD', name: 'Broward County', state: 'FL' },
  { code: 'FL_PALMBEACH', name: 'Palm Beach County', state: 'FL' },
  { code: 'FL_MONROE', name: 'Monroe County', state: 'FL' },

  // Alabama
  { code: 'AL_JEFFERSON', name: 'Jefferson County', state: 'AL' },
  { code: 'AL_SHELBY', name: 'Shelby County', state: 'AL' },
  { code: 'AL_STCLAIR', name: 'St Clair County', state: 'AL' },
  { code: 'AL_WALKER', name: 'Walker County', state: 'AL' },
  { code: 'AL_MADISON', name: 'Madison County', state: 'AL' },
  { code: 'AL_LIMESTONE', name: 'Limestone County', state: 'AL' },
  { code: 'AL_MORGAN', name: 'Morgan County', state: 'AL' },
  { code: 'AL_MARSHALL', name: 'Marshall County', state: 'AL' },

  // North Carolina
  { code: 'NC_MECKLENBURG', name: 'Mecklenburg County', state: 'NC' },
  { code: 'NC_CABARRUS', name: 'Cabarrus County', state: 'NC' },
  { code: 'NC_GASTON', name: 'Gaston County', state: 'NC' },
  { code: 'NC_UNION', name: 'Union County', state: 'NC' },
  { code: 'NC_WAKE', name: 'Wake County', state: 'NC' },
  { code: 'NC_JOHNSTON', name: 'Johnston County', state: 'NC' },
  { code: 'NC_DURHAM', name: 'Durham County', state: 'NC' },
  { code: 'NC_FRANKLIN', name: 'Franklin County', state: 'NC' },

  // South Carolina
  { code: 'SC_CHARLESTON', name: 'Charleston County', state: 'SC' },
  { code: 'SC_RICHLAND', name: 'Richland County', state: 'SC' },
  { code: 'SC_LEXINGTON', name: 'Lexington County', state: 'SC' },
  { code: 'SC_FAIRFIELD', name: 'Fairfield County', state: 'SC' },
  { code: 'SC_KERSHAW', name: 'Kershaw County', state: 'SC' },
  { code: 'SC_BERKELEY', name: 'Berkeley County', state: 'SC' },
  { code: 'SC_DORCHESTER', name: 'Dorchester County', state: 'SC' },
  { code: 'SC_COLLETON', name: 'Colleton County', state: 'SC' },

  // Arkansas
  { code: 'AR_PULASKI', name: 'Pulaski County', state: 'AR' },
  { code: 'AR_SALINE', name: 'Saline County', state: 'AR' },
  { code: 'AR_FAULKNER', name: 'Faulkner County', state: 'AR' },
  { code: 'AR_LONOKE', name: 'Lonoke County', state: 'AR' },

  // Kentucky
  { code: 'KY_JEFFERSON', name: 'Jefferson County', state: 'KY' },
  { code: 'KY_BULLITT', name: 'Bullitt County', state: 'KY' },
  { code: 'KY_OLDHAM', name: 'Oldham County', state: 'KY' },
  { code: 'KY_SHELBY', name: 'Shelby County', state: 'KY' },

  // Virginia
  { code: 'VA_FAIRFAX', name: 'Fairfax County', state: 'VA' },
  { code: 'VA_RICHMOND', name: 'Richmond County', state: 'VA' },
  { code: 'VA_CHESTERFIELD', name: 'Chesterfield County', state: 'VA' },
  { code: 'VA_HENRICO', name: 'Henrico County', state: 'VA' },
  { code: 'VA_HANOVER', name: 'Hanover County', state: 'VA' },

  // Mississippi
  { code: 'MS_HINDS', name: 'Hinds County', state: 'MS' },
  { code: 'MS_DESOTO', name: 'DeSoto County', state: 'MS' },
  { code: 'MS_RANKIN', name: 'Rankin County', state: 'MS' },
  { code: 'MS_MADISON', name: 'Madison County', state: 'MS' },
  { code: 'MS_COPIAH', name: 'Copiah County', state: 'MS' }
];

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Registering and activating requested counties...');
    
    // First, set all existing counties in the table to inactive to build a clean set
    await pool.query('UPDATE counties SET is_active = FALSE');
    
    for (const c of counties) {
      await pool.query(
        `INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score)
         VALUES ($1, $2, $3, TRUE, 95)
         ON CONFLICT (county_code) 
         DO UPDATE SET is_active = TRUE, county_name = EXCLUDED.county_name, state = EXCLUDED.state`,
        [c.code, c.name, c.state]
      );
    }
    
    const activeRes = await pool.query('SELECT COUNT(*) FROM counties WHERE is_active = TRUE');
    console.log(`✅ Success: Activated ${activeRes.rows[0].count} counties in registry.`);
  } catch (err) {
    console.error('Error inserting counties:', err.message);
  } finally {
    await pool.end();
  }
}
run();
