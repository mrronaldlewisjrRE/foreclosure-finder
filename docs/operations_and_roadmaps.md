# Operations, Roadmaps, & Compliance

This document outlines the Replit deployment strategy, MVP and scaling roadmaps, cost projections, legal compliance, and security frameworks for **ForeclosureFinder AI**.

---

## 1. Replit Deployment Plan

ForeclosureFinder AI is designed to deploy entirely on Replit, taking advantage of its managed databases, secrets, cron system, and object storage.

### Replit PostgreSQL Setup
*   **Provisioning**: Instantiate a Replit PostgreSQL instance through the Replit Database extension.
*   **Migrations**: Use Prisma to generate client libraries and push migrations using:
    `npx prisma db push`
*   **Connection Lifecycle**: Set connection pool limits (`?connection_limit=10` on scraper workers and `?connection_limit=30` on the web server gateway) to prevent overloading the database pool.

### Replit Secrets (Environment Variables)
Secrets must be defined in the Replit Secret Manager console:
*   `DATABASE_URL`: Connection string to Replit PostgreSQL.
*   `JWT_SECRET`: Crypto token for user authentication.
*   `CAPSOLVER_API_KEY` / `TWOCAPTCHA_API_KEY`: Keys for browser captcha-solving adapters.
*   `OPENAI_API_KEY` / `GEMINI_API_KEY`: Ingestion parsing adapters.
*   `PROPERTY_DATA_API_KEY`: Estated or Attom Data credentials.
*   `PROXY_ROTATOR_URL`: Proxy credentials (username:password@gateway) for residential rotating IPs.

### Replit Scheduled Jobs (Cron Triggers)
Set up scheduled routines via the Replit Cron extension or system-wide `setInterval` check:
1.  **Daily Scrapers Ingestion**: Runs daily at **01:00 AM** UTC:
    `node services/scrapers/worker.js --trigger=daily`
2.  **Enrichment Adapter Task**: Runs daily at **04:30 AM** UTC:
    `node services/workers/enricher.js`
3.  **Lead Scoring Recalculation**: Runs daily at **05:30 AM** UTC:
    `node services/workers/score-recalculator.js`
4.  **Audit & Cleanup Task**: Runs weekly at **12:00 AM** Sunday UTC:
    `node services/workers/cleanup-logs.js`

### Replit Object Storage Setup
*   **Bucket Configuration**: Provision a Replit Object Storage bucket to store legal documents (Lis Pendens deeds, Foreclosure summonses) and scraper logs.
*   **File Naming Rules**:
    `foreclosures/{state}/{county}/{yyyy}-{mm}-{dd}/{case_number}.pdf`

---

## 2. Roadmaps (MVP to Scaling & 18-Month Vision)

```
┌──────────────────────────────────────┐
│  Months 1-3: MVP Target Metros       │
│  Deploy active scraper worker runs   │
│  and 50-state center coordinate hubs.│
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Months 4-6: Platform Evolution      │
│  AI County Discovery, NLP search,    │
│  Deal Analyzer, & Heatmap Analytics. │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Months 7-12: Enterprise Integrations │
│  GraphQL gateway, custom webhooks,   │
│  skip-tracing API, automatic dialers.│
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Months 13-18: Nationwide Domination │
│  Completejudicial/non-judicial DDLs, │
│  mobile app with geofenced alerts.   │
└──────────────────────────────────────┘
```

### Detailed 18-Month Milestones

*   **Months 1–3 (Phase 1 Baseline)**: Ingest 50 core metro hubs, coordinate spatial mapping, establish standard opportunity scoring, and launch the primary React dashboard with standard table views and Leaflet maps.
*   **Months 4–6 (Phase 2 Evolution - DISTRESSED PROPERTY INTELLIGENCE)**: Deploy AI County Discovery crawler engines. Implement the Natural Language query parser (`/api/v1/search/nlp`). Integrate Wholesaler Deal Analyzer (estimating ARV, Repairs, MAO margins). Seed ZIP-code Heatmaps (`/api/v1/analytics/heatmap`) tracking cash transaction indices. Expand listing details with public records (beds, baths, sq ft, lot size, years built, tenure years).
*   **Months 7–12 (Phase 3 Scale & API Gateway upgrade)**: Transform Fastify API Gateway into a unified GraphQL API. Provide automated Skip-tracing APIs (delivering verified emails, phones, and relative contacts). Implement direct integration with Direct Mail print companies for automated mailer campaign triggers.
*   **Months 13–18 (Phase 4 Nationwide Expansion)**: Scale scrapers to cover all 3,143 US counties/parishes. Build iOS and Android native apps featuring geofenced notification alerts that ping investors when an A+ preforeclosure or probate is logged within 10 miles of their current GPS location.

---

## 3. Horizontal Scaling & Replit Agent Settings

To scale ingestion from 1,000 to 100,000 monthly listings, the platform distributes Playwright scraping node instances horizontally:

### Replit Agent Scaling Configurations
*   **Resource Allocation**: Configure Replit deployments with **4 vCPUs** and **8 GB RAM** for the Fastify API Gateway, and run Scraper nodes on independent **2 vCPUs / 4 GB RAM** autoscale setups.
*   **Concurrency Limits**: Limit scraping nodes to a maximum of **10 parallel pages** per chromium instance to prevent browser crashes and memory leaks.
*   **Proxy Rotation Rule**: Residential proxy connections are rotated every **5 requests** or upon receiving a `403 Forbidden` response header.

### API Cost Projections (Scale: 100,000 properties analyzed/mo)

| Provider / Service | Unit Rate | Unit Count / Mo | Total Monthly Est. |
| :--- | :--- | :--- | :--- |
| **Compute & DB Hosting** | Replit Deploy (Autoscaling) | 1 Gateway + 5 Scrapers | \$180.00 |
| **Ingestion Proxies** | Residential Bandwidth | 40 GB @ \$4.50/GB | \$180.00 |
| **CAPTCHA Solvers** | CapSolver (API Recaptcha/hCaptcha) | 25,000 Solves @ \$0.60/1k | \$15.00 |
| **Vision OCR Engine** | AWS Textract / Cloud Vision | 30,000 pages @ \$1.50/1k | \$45.00 |
| **NLP & Translation (LLM)** | Gemini-1.5-Flash (API tokens) | 20M Input / 10M Output | \$15.00 |
| **ATTOM API** | Property Valuation & Tax Liens | 100,000 calls @ \$0.08/hit | \$8,000.00 |
| **Skip Tracing API** | Phone, Email, Relatives lookup | 40,000 matches @ \$0.03/hit | \$1,200.00 |
| **Total Operating Budget**| | | **\$9,635.00** |

---

## 4. Competitive Matrix

| Feature / Metric | ForeclosureFinder AI | PropStream | BatchLeads | PropertyRadar |
| :--- | :--- | :--- | :--- | :--- |
| **Monthly Subscription** | **\$149 / mo** | \$99 / mo | \$119 / mo | \$59 / mo |
| **Scraper Discovery Agent**| **Autonomous (Playwright)** | Manual Ingestion | Manual Ingestion | Manual Ingestion |
| **NLP Natural Query** | **Yes (Ask Co-Pilot)** | No (Standard Filters) | No (Standard Filters) | No (Standard Filters) |
| **Skip Trace Abstraction** | **Unified Registry** | Paid Add-on | Paid Add-on | Paid Add-on |
| **Wholesale Deal Grading**| **Dynamic A+ to F (MAO/ARV)** | Manual Calculator | Manual Calculator | Basic Estimates |
| **County Notice OCR** | **Integrated (Textract/LLM)**| No | No | Basic Scan |
| **Real-time Map Heatmaps** | **Foreclosure/Probate ZIPs** | General Market | General Market | General Market |

---

## 5. Compliance Framework

Distressed-property collection requires adherence to legal guidelines to prevent platform liability.

### Fair Credit Reporting Act (FCRA)
*   **Compliance Protocol**: ForeclosureFinder AI data is collected for informational/marketing purposes only.
*   **Restriction**: Users are prohibited from using the platform to determine eligibility for personal credit, insurance, employment, or tenant screening. All exports must display an FCRA compliance notice.

### Telephone Consumer Protection Act (TCPA)
*   **Compliance Protocol**: All phone numbers resolved via our skiptracing pipeline must be matched against the **National Do Not Call (DNC) Registry**.
*   **Data Flagging**: Flag active DNC records in the database (`is_dnc = true`) and disable direct-dialing features for these records to protect users from bulk-marketing penalties.

### Gramm-Leach-Bliley Act (GLBA)
*   **Compliance Protocol**: The platform only displays public registry courthouse filings. No private financial records, credit histories, or non-public personal information (NPI) are stored or parsed.

### Public Foreclosure Notices
*   **Compliance Protocol**: Scrapers only access public index books, court case summaries, and newspapers of record as permitted by state law. If a court issues a seal on a case file, or a foreclosure is rescinded, the platform must process deletion requests (Right to be Forgotten) within 24 hours of notification.

---

## 6. Security Framework

### Multi-Tenant Database Isolation
*   **CRM Isolation**: User CRM tables enforce strict foreign key constraints:
    `WHERE user_id = current_user_id`
*   **Row-Level Security (RLS)**: Enable RLS on PostgreSQL for tables storing user searches, saved settings, and pipeline tracking:
    ```sql
    ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
    CREATE POLICY crm_user_policy ON crm_pipelines
      FOR ALL TO authenticated USING (user_id = auth.uid());
    ```

### Rate Limiting & Gateway Protection
*   **Ingress Protection**: Fastify gateway uses `@fastify/rate-limit` to restrict public traffic to a maximum of **100 requests per minute** per user token.
*   **Scraper Validation**: Ingestion routes require a valid `x-scraper-key` token rotated monthly. All failed access attempts are logged, and consecutive violations block the offending IP address.

### Encryption
*   **In Transit**: All connections enforce HTTPS (TLS 1.3) and WebSocket Secure (WSS).
*   **At Rest**: Storage buckets and Replit database files are encrypted at rest using AES-256 keys managed by the infrastructure provider. Sensitive user credential passwords use bcrypt hashing with a salt factor of 12.
