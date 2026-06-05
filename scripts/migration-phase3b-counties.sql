-- migration-phase3b-counties.sql
-- Seeds and activates all target Southern metro and neighboring counties

-- First, set all existing active states to inactive so we focus exclusively on our Southern states
UPDATE counties SET is_active = FALSE;

-- Insert/Update counties and set them to active
INSERT INTO counties (county_code, county_name, state, is_active, data_quality_score) VALUES
-- TENNESSEE
('TN_DAVIDSON', 'Davidson County', 'TN', TRUE, 96),
('TN_RUTHERFORD', 'Rutherford County', 'TN', TRUE, 92),
('TN_WILLIAMSON', 'Williamson County', 'TN', TRUE, 94),
('TN_WILSON', 'Wilson County', 'TN', TRUE, 90),
('TN_SHELBY', 'Shelby County', 'TN', TRUE, 95),
('TN_FAYETTE', 'Fayette County', 'TN', TRUE, 85),
('TN_TIPTON', 'Tipton County', 'TN', TRUE, 82),
('TN_HAMILTON', 'Hamilton County', 'TN', TRUE, 91),
('TN_BRADLEY', 'Bradley County', 'TN', TRUE, 80),
('TN_MARION', 'Marion County', 'TN', TRUE, 78),
('TN_KNOX', 'Knox County', 'TN', TRUE, 92),
('TN_BLOUNT', 'Blount County', 'TN', TRUE, 84),
('TN_ANDERSON', 'Anderson County', 'TN', TRUE, 81),
('TN_LOUDON', 'Loudon County', 'TN', TRUE, 80),

-- MISSISSIPPI
('MS_DESOTO', 'DeSoto County', 'MS', TRUE, 85),
('MS_HINDS', 'Hinds County', 'MS', TRUE, 90),
('MS_RANKIN', 'Rankin County', 'MS', TRUE, 84),
('MS_MADISON', 'Madison County', 'MS', TRUE, 85),
('MS_COPIAH', 'Copiah County', 'MS', TRUE, 78),

-- GEORGIA
('GA_CATOOSA', 'Catoosa County', 'GA', TRUE, 82),
('GA_FULTON', 'Fulton County', 'GA', TRUE, 96),
('GA_COBB', 'Cobb County', 'GA', TRUE, 88),
('GA_GWINNETT', 'Gwinnett County', 'GA', TRUE, 86),
('GA_DEKALB', 'DeKalb County', 'GA', TRUE, 90),
('GA_CHATHAM', 'Chatham County', 'GA', TRUE, 91),
('GA_EFFINGHAM', 'Effingham County', 'GA', TRUE, 83),
('GA_BRYAN', 'Bryan County', 'GA', TRUE, 80),
('GA_LIBERTY', 'Liberty County', 'GA', TRUE, 78),

-- LOUISIANA
('LA_ORLEANS', 'Orleans Parish', 'LA', TRUE, 93),
('LA_JEFFERSON', 'Jefferson Parish', 'LA', TRUE, 91),
('LA_STBERNARD', 'St Bernard Parish', 'LA', TRUE, 80),
('LA_STTAMMANY', 'St Tammany Parish', 'LA', TRUE, 85),
('LA_EASTBATONROUGE', 'East Baton Rouge Parish', 'LA', TRUE, 88),
('LA_ASCENSION', 'Ascension Parish', 'LA', TRUE, 82),
('LA_LIVINGSTON', 'Livingston Parish', 'LA', TRUE, 81),
('LA_WESTBATONROUGE', 'West Baton Rouge Parish', 'LA', TRUE, 79),
('LA_LAFAYETTE', 'Lafayette Parish', 'LA', TRUE, 87),
('LA_ACADIA', 'Acadia Parish', 'LA', TRUE, 80),
('LA_STMARTIN', 'St Martin Parish', 'LA', TRUE, 78),
('LA_IBERIA', 'Iberia Parish', 'LA', TRUE, 79),
('LA_CADDO', 'Caddo Parish', 'LA', TRUE, 86),
('LA_BOSSIER', 'Bossier Parish', 'LA', TRUE, 84),
('LA_WEBSTER', 'Webster Parish', 'LA', TRUE, 79),
('LA_DESOTO', 'DeSoto Parish', 'LA', TRUE, 78),

-- TEXAS
('TX_HARRIS', 'Harris County', 'TX', TRUE, 97),
('TX_FORTBEND', 'Fort Bend County', 'TX', TRUE, 93),
('TX_MONTGOMERY', 'Montgomery County', 'TX', TRUE, 88),
('TX_BRAZORIA', 'Brazoria County', 'TX', TRUE, 85),
('TX_DALLAS', 'Dallas County', 'TX', TRUE, 95),
('TX_COLLIN', 'Collin County', 'TX', TRUE, 90),
('TX_DENTON', 'Denton County', 'TX', TRUE, 89),
('TX_TARRANT', 'Tarrant County', 'TX', TRUE, 92),
('TX_TRAVIS', 'Travis County', 'TX', TRUE, 94),
('TX_WILLIAMSON', 'Williamson County', 'TX', TRUE, 88),
('TX_HAYS', 'Hays County', 'TX', TRUE, 85),
('TX_BASTROP', 'Bastrop County', 'TX', TRUE, 81),
('TX_BEXAR', 'Bexar County', 'TX', TRUE, 92),
('TX_COMAL', 'Comal County', 'TX', TRUE, 85),
('TX_GUADALUPE', 'Guadalupe County', 'TX', TRUE, 84),
('TX_MEDINA', 'Medina County', 'TX', TRUE, 80),

-- FLORIDA
('FL_HILLSBOROUGH', 'Hillsborough County', 'FL', TRUE, 95),
('FL_PINELLAS', 'Pinellas County', 'FL', TRUE, 88),
('FL_PASCO', 'Pasco County', 'FL', TRUE, 86),
('FL_POLK', 'Polk County', 'FL', TRUE, 85),
('FL_ORANGE', 'Orange County', 'FL', TRUE, 92),
('FL_SEMINOLE', 'Seminole County', 'FL', TRUE, 87),
('FL_OSCEOLA', 'Osceola County', 'FL', TRUE, 85),
('FL_LAKE', 'Lake County', 'FL', TRUE, 82),
('FL_MIAMIDADE', 'Miami-Dade County', 'FL', TRUE, 97),
('FL_BROWARD', 'Broward County', 'FL', TRUE, 93),
('FL_PALMBEACH', 'Palm Beach County', 'FL', TRUE, 92),
('FL_MONROE', 'Monroe County', 'FL', TRUE, 80),

-- ALABAMA
('AL_JEFFERSON', 'Jefferson County', 'AL', TRUE, 92),
('AL_SHELBY', 'Shelby County', 'AL', TRUE, 86),
('AL_STCLAIR', 'St Clair County', 'AL', TRUE, 81),
('AL_WALKER', 'Walker County', 'AL', TRUE, 80),
('AL_MADISON', 'Madison County', 'AL', TRUE, 88),
('AL_LIMESTONE', 'Limestone County', 'AL', TRUE, 83),
('AL_MORGAN', 'Morgan County', 'AL', TRUE, 82),
('AL_MARSHALL', 'Marshall County', 'AL', TRUE, 80),

-- NORTH CAROLINA
('NC_MECKLENBURG', 'Mecklenburg County', 'NC', TRUE, 96),
('NC_CABARRUS', 'Cabarrus County', 'NC', TRUE, 85),
('NC_GASTON', 'Gaston County', 'NC', TRUE, 83),
('NC_UNION', 'Union County', 'NC', TRUE, 84),
('NC_WAKE', 'Wake County', 'NC', TRUE, 94),
('NC_JOHNSTON', 'Johnston County', 'NC', TRUE, 85),
('NC_DURHAM', 'Durham County', 'NC', TRUE, 88),
('NC_FRANKLIN', 'Franklin County', 'NC', TRUE, 80),

-- SOUTH CAROLINA
('SC_RICHLAND', 'Richland County', 'SC', TRUE, 90),
('SC_LEXINGTON', 'Lexington County', 'SC', TRUE, 85),
('SC_FAIRFIELD', 'Fairfield County', 'SC', TRUE, 78),
('SC_KERSHAW', 'Kershaw County', 'SC', TRUE, 80),
('SC_CHARLESTON', 'Charleston County', 'SC', TRUE, 93),
('SC_BERKELEY', 'Berkeley County', 'SC', TRUE, 86),
('SC_DORCHESTER', 'Dorchester County', 'SC', TRUE, 85),
('SC_COLLETON', 'Colleton County', 'SC', TRUE, 78),

-- ARKANSAS
('AR_PULASKI', 'Pulaski County', 'AR', TRUE, 91),
('AR_SALINE', 'Saline County', 'AR', TRUE, 82),
('AR_FAULKNER', 'Faulkner County', 'AR', TRUE, 83),
('AR_LONOKE', 'Lonoke County', 'AR', TRUE, 80),

-- KENTUCKY
('KY_JEFFERSON', 'Jefferson County', 'KY', TRUE, 92),
('KY_BULLITT', 'Bullitt County', 'KY', TRUE, 82),
('KY_OLDHAM', 'Oldham County', 'KY', TRUE, 84),
('KY_SHELBY', 'Shelby County', 'KY', TRUE, 80),

-- VIRGINIA
('VA_RICHMOND', 'Richmond City', 'VA', TRUE, 90),
('VA_CHESTERFIELD', 'Chesterfield County', 'VA', TRUE, 87),
('VA_HENRICO', 'Henrico County', 'VA', TRUE, 86),
('VA_HANOVER', 'Hanover County', 'VA', TRUE, 82)
ON CONFLICT (county_code) DO UPDATE 
SET is_active = EXCLUDED.is_active, data_quality_score = EXCLUDED.data_quality_score;
