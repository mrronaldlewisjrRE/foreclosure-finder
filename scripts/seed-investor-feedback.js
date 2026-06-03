const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const testers = [
  {
    name: 'Sarah Jenkins (Wholesaler)',
    email: 'sarah.j@southernwholesale.com',
    state: 'TN',
    quality: 5,
    accuracy: 5,
    conversion: 4,
    feedback: 'Davidson County probate matching is incredibly accurate. Found 3 distressed assets before they hit the open market. Conversions are up 12% this quarter.',
    requests: 'Would love an option to export matching property parcels directly to skip tracing templates.'
  },
  {
    name: 'Marcus Vance (Wholesaler)',
    email: 'marcus@vanceproperties.com',
    state: 'TX',
    quality: 4,
    accuracy: 5,
    conversion: 4,
    feedback: 'Notice of Trustee Sales in Harris County are highly reliable. Having the S3 evidence PDF and document hash gives us massive confidence when pitching to our cash buyers.',
    requests: 'Add text highlighting in the Evidence Viewer to jump straight to the owner name block.'
  },
  {
    name: 'Elena Rostova (Fix & Flip)',
    email: 'elena@novihomes.com',
    state: 'GA',
    quality: 5,
    accuracy: 4,
    conversion: 5,
    feedback: 'The wholesaling grade calculator (ARV & Repair estimates) is spot on for Fulton County. We purchased 2 properties in Atlanta with a combined net margin of $85k using this data.',
    requests: 'Allow custom adjustments to the default 70% MAO rule directly inside the LeadDetailsDrawer.'
  },
  {
    name: 'David Miller (Fix & Flip)',
    email: 'david@millercapital.co',
    state: 'FL',
    quality: 4,
    accuracy: 4,
    conversion: 4,
    feedback: 'Hillsborough tax delinquency files are gold. We closed a flip in Tampa with 45% equity. Zero address mismatch issues since the Phase 3A verification checks went live.',
    requests: 'Add historical repair cost indexes filtered by zip code.'
  },
  {
    name: 'Robert Chen (Landlord/Buy-and-Hold)',
    email: 'bchen@chenrentals.com',
    state: 'NC',
    quality: 5,
    accuracy: 5,
    conversion: 5,
    feedback: 'Opportunity scoring allows us to filter for properties with high equity (>40%) and low mortgage balances. Ingesting these directly to the CRM has saved our acquisitions team hours of work.',
    requests: 'Integrate neighborhood rent estimates (HUD FMR API) directly in the public records drawer.'
  },
  {
    name: 'Clara Oswald (Landlord/BRRRR)',
    email: 'clara@oswaldholdings.net',
    state: 'AL',
    quality: 4,
    accuracy: 5,
    conversion: 4,
    feedback: 'Excellent coverage in Birmingham. The USPS vacancy indicators allow us to target long-term vacant properties, which have a much higher response rate to cold outreach.',
    requests: 'Add direct mail API integration (e.g. Lob or Click2Mail) to send letters in one click.'
  },
  {
    name: 'Aiden Thompson (Real Estate Agent)',
    email: 'aiden@thompsonrealty.com',
    state: 'LA',
    quality: 5,
    accuracy: 4,
    conversion: 4,
    feedback: 'Orleans Parish sheriff sales are highly accurate. Represented 2 buyers who successfully won bidding wars at the civil division auctions. Verified evidence links were critical to title searches.',
    requests: 'Provide email/SMS alerts whenever a new verified foreclosure lead is added to my saved search.'
  },
  {
    name: 'Julia Roberts (Real Estate Agent)',
    email: 'julia@robertsgroup.realtor',
    state: 'VA',
    quality: 4,
    accuracy: 4,
    conversion: 5,
    feedback: 'Excellent lead quality in Richmond. Pre-probate and tax delinquency status lets us reach out to distressed families before they default, offering listing options that protect their equity.',
    requests: 'Add direct phone number search / lookup integration.'
  },
  {
    name: 'Brandon Stark (Acquisitions Manager)',
    email: 'bstark@winterfellacq.com',
    state: 'SC',
    quality: 5,
    accuracy: 5,
    conversion: 5,
    feedback: 'The Cash Buyer Intelligence Engine is a game changer. We can trace which LLCs are actively buying up properties in Charleston and match their buying patterns. It helps us wholesale deals in hours.',
    requests: 'Add a spreadsheet export containing LLC buyer mailing addresses and transactional history.'
  },
  {
    name: 'Tasha Yar (Acquisitions Manager)',
    email: 'tasha.yar@enterpriseacq.com',
    state: 'KY',
    quality: 5,
    accuracy: 5,
    conversion: 4,
    feedback: 'Louisville coverage has allowed us to scale our pipeline. Ingested 12 verified leads this week, already under contract on one. The outreach readiness checklist is very useful.',
    requests: 'Add a mobile dashboard app or progressive web app (PWA) layout for mobile field use.'
  }
];

async function seed() {
  console.log('=== SEEDING INVESTOR FEEDBACK ===');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    
    // Clear existing feedback
    await client.query('DELETE FROM investor_feedback');
    console.log('[Seeder] Cleared previous feedback logs.');

    for (const t of testers) {
      await client.query(
        `INSERT INTO investor_feedback (
          investor_name, email, market_state, 
          lead_quality_rating, accuracy_rating, conversion_rating, 
          feedback_text, feature_requests
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          t.name, t.email, t.state,
          t.quality, t.accuracy, t.conversion,
          t.feedback, t.requests
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`[Seeder] Seeded ${testers.length} investor feedback records successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding investor feedback failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
