// ForeclosureFinder AI — Complete County/City Coordinates Catalog
// Includes all 116 counties with active lead data across 14 target states + 36 placeholder states
const citiesMetadata = [
  // ═══════════════════════════════════════════════════════════
  // ALABAMA (8 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Birmingham', state: 'AL', lat: 33.5186, lng: -86.8104, countyCode: 'AL_JEFFERSON' },
  { city: 'Athens', state: 'AL', lat: 34.8023, lng: -86.9717, countyCode: 'AL_LIMESTONE' },
  { city: 'Huntsville', state: 'AL', lat: 34.7304, lng: -86.5861, countyCode: 'AL_MADISON' },
  { city: 'Albertville', state: 'AL', lat: 34.2673, lng: -86.2086, countyCode: 'AL_MARSHALL' },
  { city: 'Decatur', state: 'AL', lat: 34.6059, lng: -86.9833, countyCode: 'AL_MORGAN' },
  { city: 'Pelham', state: 'AL', lat: 33.2856, lng: -86.8100, countyCode: 'AL_SHELBY' },
  { city: 'Pell City', state: 'AL', lat: 33.5862, lng: -86.2861, countyCode: 'AL_STCLAIR' },
  { city: 'Jasper', state: 'AL', lat: 33.8312, lng: -87.2775, countyCode: 'AL_WALKER' },

  // ═══════════════════════════════════════════════════════════
  // ARKANSAS (4 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Conway', state: 'AR', lat: 35.0887, lng: -92.4421, countyCode: 'AR_FAULKNER' },
  { city: 'Lonoke', state: 'AR', lat: 34.7840, lng: -91.8999, countyCode: 'AR_LONOKE' },
  { city: 'Little Rock', state: 'AR', lat: 34.7465, lng: -92.2896, countyCode: 'AR_PULASKI' },
  { city: 'Benton', state: 'AR', lat: 34.5645, lng: -92.5868, countyCode: 'AR_SALINE' },

  // ═══════════════════════════════════════════════════════════
  // FLORIDA (12 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Fort Lauderdale', state: 'FL', lat: 26.1224, lng: -80.1373, countyCode: 'FL_BROWARD' },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572, countyCode: 'FL_HILLSBOROUGH' },
  { city: 'Tavares', state: 'FL', lat: 28.8036, lng: -81.7259, countyCode: 'FL_LAKE' },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918, countyCode: 'FL_MIAMIDADE' },
  { city: 'Key West', state: 'FL', lat: 24.5551, lng: -81.7800, countyCode: 'FL_MONROE' },
  { city: 'Orlando', state: 'FL', lat: 28.5383, lng: -81.3792, countyCode: 'FL_ORANGE' },
  { city: 'Kissimmee', state: 'FL', lat: 28.2920, lng: -81.4076, countyCode: 'FL_OSCEOLA' },
  { city: 'West Palm Beach', state: 'FL', lat: 26.7153, lng: -80.0534, countyCode: 'FL_PALMBEACH' },
  { city: 'New Port Richey', state: 'FL', lat: 28.2442, lng: -82.7193, countyCode: 'FL_PASCO' },
  { city: 'St. Petersburg', state: 'FL', lat: 27.7676, lng: -82.6403, countyCode: 'FL_PINELLAS' },
  { city: 'Lakeland', state: 'FL', lat: 28.0395, lng: -81.9498, countyCode: 'FL_POLK' },
  { city: 'Sanford', state: 'FL', lat: 28.8003, lng: -81.2734, countyCode: 'FL_SEMINOLE' },

  // ═══════════════════════════════════════════════════════════
  // GEORGIA (9 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Richmond Hill', state: 'GA', lat: 31.9385, lng: -81.3051, countyCode: 'GA_BRYAN' },
  { city: 'Ringgold', state: 'GA', lat: 34.9159, lng: -85.1091, countyCode: 'GA_CATOOSA' },
  { city: 'Savannah', state: 'GA', lat: 32.0809, lng: -81.0912, countyCode: 'GA_CHATHAM' },
  { city: 'Marietta', state: 'GA', lat: 33.9526, lng: -84.5499, countyCode: 'GA_COBB' },
  { city: 'Decatur', state: 'GA', lat: 33.7748, lng: -84.2963, countyCode: 'GA_DEKALB' },
  { city: 'Springfield', state: 'GA', lat: 32.3724, lng: -81.3112, countyCode: 'GA_EFFINGHAM' },
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880, countyCode: 'GA_FULTON' },
  { city: 'Lawrenceville', state: 'GA', lat: 33.9562, lng: -83.9880, countyCode: 'GA_GWINNETT' },
  { city: 'Hinesville', state: 'GA', lat: 31.8468, lng: -81.5959, countyCode: 'GA_LIBERTY' },

  // ═══════════════════════════════════════════════════════════
  // INDIANA (1 county)
  // ═══════════════════════════════════════════════════════════
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581, countyCode: 'IN_MARION' },

  // ═══════════════════════════════════════════════════════════
  // KENTUCKY (4 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Shepherdsville', state: 'KY', lat: 37.9887, lng: -85.7136, countyCode: 'KY_BULLITT' },
  { city: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585, countyCode: 'KY_JEFFERSON' },
  { city: 'La Grange', state: 'KY', lat: 38.4073, lng: -85.3788, countyCode: 'KY_OLDHAM' },
  { city: 'Shelbyville', state: 'KY', lat: 38.2120, lng: -85.2236, countyCode: 'KY_SHELBY' },

  // ═══════════════════════════════════════════════════════════
  // LOUISIANA (16 counties/Parishes)
  // ═══════════════════════════════════════════════════════════
  { city: 'Crowley', state: 'LA', lat: 30.2138, lng: -92.4446, countyCode: 'LA_ACADIA' },
  { city: 'Gonzales', state: 'LA', lat: 30.2388, lng: -90.9201, countyCode: 'LA_ASCENSION' },
  { city: 'Bossier City', state: 'LA', lat: 32.5160, lng: -93.7321, countyCode: 'LA_BOSSIER' },
  { city: 'Shreveport', state: 'LA', lat: 32.5252, lng: -93.7502, countyCode: 'LA_CADDO' },
  { city: 'Mansfield', state: 'LA', lat: 32.0374, lng: -93.7002, countyCode: 'LA_DESOTO' },
  { city: 'Baton Rouge', state: 'LA', lat: 30.4515, lng: -91.1871, countyCode: 'LA_EASTBATONROUGE' },
  { city: 'New Iberia', state: 'LA', lat: 30.0035, lng: -91.8188, countyCode: 'LA_IBERIA' },
  { city: 'Metairie', state: 'LA', lat: 29.9841, lng: -90.1526, countyCode: 'LA_JEFFERSON' },
  { city: 'Lafayette', state: 'LA', lat: 30.2241, lng: -92.0198, countyCode: 'LA_LAFAYETTE' },
  { city: 'Denham Springs', state: 'LA', lat: 30.4866, lng: -90.9568, countyCode: 'LA_LIVINGSTON' },
  { city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715, countyCode: 'LA_ORLEANS' },
  { city: 'Chalmette', state: 'LA', lat: 29.9427, lng: -89.9653, countyCode: 'LA_STBERNARD' },
  { city: 'Breaux Bridge', state: 'LA', lat: 30.2735, lng: -91.8993, countyCode: 'LA_STMARTIN' },
  { city: 'Covington', state: 'LA', lat: 30.4752, lng: -90.1009, countyCode: 'LA_STTAMMANY' },
  { city: 'Minden', state: 'LA', lat: 32.6157, lng: -93.2863, countyCode: 'LA_WEBSTER' },
  { city: 'Port Allen', state: 'LA', lat: 30.4518, lng: -91.2101, countyCode: 'LA_WESTBATONROUGE' },

  // ═══════════════════════════════════════════════════════════
  // MISSISSIPPI (5 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Hazlehurst', state: 'MS', lat: 31.8607, lng: -90.3957, countyCode: 'MS_COPIAH' },
  { city: 'Southaven', state: 'MS', lat: 34.9889, lng: -90.0126, countyCode: 'MS_DESOTO' },
  { city: 'Jackson', state: 'MS', lat: 32.2988, lng: -90.1848, countyCode: 'MS_HINDS' },
  { city: 'Canton', state: 'MS', lat: 32.6126, lng: -90.0368, countyCode: 'MS_MADISON' },
  { city: 'Brandon', state: 'MS', lat: 32.2732, lng: -89.9856, countyCode: 'MS_RANKIN' },

  // ═══════════════════════════════════════════════════════════
  // NORTH CAROLINA (8 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Concord', state: 'NC', lat: 35.4088, lng: -80.5795, countyCode: 'NC_CABARRUS' },
  { city: 'Durham', state: 'NC', lat: 35.9940, lng: -78.8986, countyCode: 'NC_DURHAM' },
  { city: 'Louisburg', state: 'NC', lat: 36.0990, lng: -78.3014, countyCode: 'NC_FRANKLIN' },
  { city: 'Gastonia', state: 'NC', lat: 35.2621, lng: -81.1873, countyCode: 'NC_GASTON' },
  { city: 'Smithfield', state: 'NC', lat: 35.5085, lng: -78.3395, countyCode: 'NC_JOHNSTON' },
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431, countyCode: 'NC_MECKLENBURG' },
  { city: 'Monroe', state: 'NC', lat: 34.9854, lng: -80.5495, countyCode: 'NC_UNION' },
  { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382, countyCode: 'NC_WAKE' },

  // ═══════════════════════════════════════════════════════════
  // OHIO (1 county)
  // ═══════════════════════════════════════════════════════════
  { city: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944, countyCode: 'OH_CUYAHOGA' },

  // ═══════════════════════════════════════════════════════════
  // SOUTH CAROLINA (8 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Moncks Corner', state: 'SC', lat: 33.1960, lng: -80.0131, countyCode: 'SC_BERKELEY' },
  { city: 'Charleston', state: 'SC', lat: 32.7765, lng: -79.9311, countyCode: 'SC_CHARLESTON' },
  { city: 'Walterboro', state: 'SC', lat: 32.9049, lng: -80.6665, countyCode: 'SC_COLLETON' },
  { city: 'Summerville', state: 'SC', lat: 33.0185, lng: -80.1757, countyCode: 'SC_DORCHESTER' },
  { city: 'Winnsboro', state: 'SC', lat: 34.3807, lng: -81.0865, countyCode: 'SC_FAIRFIELD' },
  { city: 'Camden', state: 'SC', lat: 34.2468, lng: -80.6070, countyCode: 'SC_KERSHAW' },
  { city: 'Lexington', state: 'SC', lat: 33.9812, lng: -81.2360, countyCode: 'SC_LEXINGTON' },
  { city: 'Columbia', state: 'SC', lat: 34.0007, lng: -81.0348, countyCode: 'SC_RICHLAND' },

  // ═══════════════════════════════════════════════════════════
  // TENNESSEE (19 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Clinton', state: 'TN', lat: 36.1034, lng: -84.1319, countyCode: 'TN_ANDERSON' },
  { city: 'Maryville', state: 'TN', lat: 35.7565, lng: -83.9705, countyCode: 'TN_BLOUNT' },
  { city: 'Cleveland', state: 'TN', lat: 35.1595, lng: -84.8766, countyCode: 'TN_BRADLEY' },
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816, countyCode: 'TN_DAVIDSON' },
  { city: 'Somerville', state: 'TN', lat: 35.2434, lng: -89.3500, countyCode: 'TN_FAYETTE' },
  { city: 'Chattanooga', state: 'TN', lat: 35.0456, lng: -85.3097, countyCode: 'TN_HAMILTON' },
  { city: 'Knoxville', state: 'TN', lat: 35.9606, lng: -83.9207, countyCode: 'TN_KNOX' },
  { city: 'Loudon', state: 'TN', lat: 35.7330, lng: -84.3338, countyCode: 'TN_LOUDON' },
  { city: 'Jasper', state: 'TN', lat: 35.0742, lng: -85.6244, countyCode: 'TN_MARION' },
  { city: 'Columbia', state: 'TN', lat: 35.6151, lng: -87.0353, countyCode: 'TN_MAURY' },
  { city: 'Clarksville', state: 'TN', lat: 36.5298, lng: -87.3595, countyCode: 'TN_MONTGOMERY' },
  { city: 'Union City', state: 'TN', lat: 36.4242, lng: -89.0570, countyCode: 'TN_OBION' },
  { city: 'Murfreesboro', state: 'TN', lat: 35.8456, lng: -86.3903, countyCode: 'TN_RUTHERFORD' },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.0490, countyCode: 'TN_SHELBY' },
  { city: 'Kingsport', state: 'TN', lat: 36.5484, lng: -82.5618, countyCode: 'TN_SULLIVAN' },
  { city: 'Gallatin', state: 'TN', lat: 36.3884, lng: -86.4467, countyCode: 'TN_SUMNER' },
  { city: 'Covington', state: 'TN', lat: 35.5642, lng: -89.6464, countyCode: 'TN_TIPTON' },
  { city: 'Franklin', state: 'TN', lat: 35.9251, lng: -86.8689, countyCode: 'TN_WILLIAMSON' },
  { city: 'Lebanon', state: 'TN', lat: 36.2081, lng: -86.2911, countyCode: 'TN_WILSON' },

  // ═══════════════════════════════════════════════════════════
  // TEXAS (16 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Bastrop', state: 'TX', lat: 30.1105, lng: -97.3153, countyCode: 'TX_BASTROP' },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936, countyCode: 'TX_BEXAR' },
  { city: 'Angleton', state: 'TX', lat: 29.1633, lng: -95.4316, countyCode: 'TX_BRAZORIA' },
  { city: 'McKinney', state: 'TX', lat: 33.1972, lng: -96.6397, countyCode: 'TX_COLLIN' },
  { city: 'New Braunfels', state: 'TX', lat: 29.7030, lng: -98.1245, countyCode: 'TX_COMAL' },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970, countyCode: 'TX_DALLAS' },
  { city: 'Denton', state: 'TX', lat: 33.2148, lng: -97.1331, countyCode: 'TX_DENTON' },
  { city: 'Sugar Land', state: 'TX', lat: 29.6197, lng: -95.6349, countyCode: 'TX_FORTBEND' },
  { city: 'Seguin', state: 'TX', lat: 29.5688, lng: -97.9647, countyCode: 'TX_GUADALUPE' },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698, countyCode: 'TX_HARRIS' },
  { city: 'San Marcos', state: 'TX', lat: 29.8833, lng: -97.9414, countyCode: 'TX_HAYS' },
  { city: 'Hondo', state: 'TX', lat: 29.3469, lng: -99.1414, countyCode: 'TX_MEDINA' },
  { city: 'Conroe', state: 'TX', lat: 30.3119, lng: -95.4560, countyCode: 'TX_MONTGOMERY' },
  { city: 'Fort Worth', state: 'TX', lat: 32.7555, lng: -97.3308, countyCode: 'TX_TARRANT' },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431, countyCode: 'TX_TRAVIS' },
  { city: 'Georgetown', state: 'TX', lat: 30.6333, lng: -97.6780, countyCode: 'TX_WILLIAMSON' },

  // ═══════════════════════════════════════════════════════════
  // VIRGINIA (5 counties)
  // ═══════════════════════════════════════════════════════════
  { city: 'Chesterfield', state: 'VA', lat: 37.3774, lng: -77.5058, countyCode: 'VA_CHESTERFIELD' },
  { city: 'Fairfax', state: 'VA', lat: 38.8462, lng: -77.3064, countyCode: 'VA_FAIRFAX' },
  { city: 'Ashland', state: 'VA', lat: 37.7590, lng: -77.4789, countyCode: 'VA_HANOVER' },
  { city: 'Glen Allen', state: 'VA', lat: 37.6601, lng: -77.4756, countyCode: 'VA_HENRICO' },
  { city: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.4360, countyCode: 'VA_RICHMOND' },

  // ═══════════════════════════════════════════════════════════
  // REMAINING STATES (1 entry each — placeholder for future expansion)
  // ═══════════════════════════════════════════════════════════
  { city: 'Anchorage', state: 'AK', lat: 61.2181, lng: -149.9003, countyCode: 'AK_ANCHORAGE' },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740, countyCode: 'AZ_MARICOPA' },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437, countyCode: 'CA_LOSANGELES' },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903, countyCode: 'CO_DENVER' },
  { city: 'Hartford', state: 'CT', lat: 41.7637, lng: -72.6851, countyCode: 'CT_HARTFORD' },
  { city: 'Wilmington', state: 'DE', lat: 39.7458, lng: -75.5466, countyCode: 'DE_NEWCASTLE' },
  { city: 'Honolulu', state: 'HI', lat: 21.3069, lng: -157.8583, countyCode: 'HI_HONOLULU' },
  { city: 'Boise', state: 'ID', lat: 43.6150, lng: -116.2023, countyCode: 'ID_ADA' },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298, countyCode: 'IL_COOK' },
  { city: 'Des Moines', state: 'IA', lat: 41.5868, lng: -93.6250, countyCode: 'IA_POLK' },
  { city: 'Wichita', state: 'KS', lat: 37.6872, lng: -97.3301, countyCode: 'KS_SEDGWICK' },
  { city: 'Portland', state: 'ME', lat: 43.6591, lng: -70.2568, countyCode: 'ME_CUMBERLAND' },
  { city: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122, countyCode: 'MD_BALTIMORE' },
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589, countyCode: 'MA_SUFFOLK' },
  { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458, countyCode: 'MI_WAYNE' },
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650, countyCode: 'MN_HENNEPIN' },
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786, countyCode: 'MO_JACKSON' },
  { city: 'Billings', state: 'MT', lat: 45.7833, lng: -108.5007, countyCode: 'MT_YELLOWSTONE' },
  { city: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345, countyCode: 'NE_DOUGLAS' },
  { city: 'Las Vegas', state: 'NV', lat: 36.1716, lng: -115.1398, countyCode: 'NV_CLARK' },
  { city: 'Manchester', state: 'NH', lat: 42.9956, lng: -71.4548, countyCode: 'NH_HILLSBOROUGH' },
  { city: 'Newark', state: 'NJ', lat: 40.7357, lng: -74.1724, countyCode: 'NJ_ESSEX' },
  { city: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6511, countyCode: 'NM_BERNALILLO' },
  { city: 'New York City', state: 'NY', lat: 40.7128, lng: -74.0060, countyCode: 'NY_NEWYORK' },
  { city: 'Fargo', state: 'ND', lat: 46.8772, lng: -96.7898, countyCode: 'ND_CASS' },
  { city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164, countyCode: 'OK_OKLAHOMA' },
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784, countyCode: 'OR_MULTNOMAH' },
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652, countyCode: 'PA_PHILADELPHIA' },
  { city: 'Providence', state: 'RI', lat: 41.8240, lng: -71.4128, countyCode: 'RI_PROVIDENCE' },
  { city: 'Sioux Falls', state: 'SD', lat: 43.5446, lng: -96.7311, countyCode: 'SD_MINNEHAHA' },
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910, countyCode: 'UT_SALTLAKE' },
  { city: 'Burlington', state: 'VT', lat: 44.4759, lng: -73.2121, countyCode: 'VT_CHITTENDEN' },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321, countyCode: 'WA_KING' },
  { city: 'Charleston', state: 'WV', lat: 38.3498, lng: -81.6326, countyCode: 'WV_KANAWHA' },
  { city: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065, countyCode: 'WI_MILWAUKEE' },
  { city: 'Cheyenne', state: 'WY', lat: 41.1400, lng: -104.8203, countyCode: 'WY_LARAMIE' }
];

export default citiesMetadata;
