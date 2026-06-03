# REST API Specification

All endpoints communicate over HTTPS using standard JSON bodies. Authenticated requests require a Bearer JWT Token in the headers:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication & Users

### POST `/api/v1/auth/login`
Authenticates a user and returns a token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "40de29c0-9d0a-4fb4-814d-91b79f8263cb",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "SUBSCRIBER"
  }
}
```

---

## 2. Ingestion & Scraper Ingestion

These endpoints are used by crawler workers to stream data. They authenticate via a unique scraper API Key passed as a custom header:
`x-scraper-key: <SCRAPER_API_KEY>`

### POST `/api/v1/ingestion/leads`
Submit a batch of raw/AI-parsed records.

**Request Body**:
```json
{
  "countyCode": "TN_DAVIDSON",
  "records": [
    {
      "caseNumber": "26CH-10492",
      "filingDate": "2026-05-29",
      "filingType": "LIS_PENDENS",
      "parcelNumber": "093-02-0-104.00",
      "ownerName": "Smith, John",
      "loanAmount": 245000.00,
      "trusteeName": "Rubin Lublin TN PLLC",
      "plaintiffAttorney": "McCalla Raymer Leibert Pierce",
      "auctionDate": "2026-06-25T10:00:00Z",
      "propertyAddress": {
        "street": "123 Nashville Way",
        "city": "Nashville",
        "state": "TN",
        "zip": "37203"
      },
      "mailingAddress": {
        "street": "123 Nashville Way",
        "city": "Nashville",
        "state": "TN",
        "zip": "37203"
      },
      "documentUrl": "https://storage.replit.com/foreclosures/davidson/doc_19482.pdf",
      "rawPayload": {
        "raw_text_block": "IN THE CHANCELLOR COURT FOR DAVIDSON COUNTY TN..."
      }
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "recordsImported": 1,
  "duplicatesSkipped": 0
}
```

### POST `/api/v1/ingestion/scrapers-log`
Logs county run events.

**Request Body**:
```json
{
  "countyCode": "TN_DAVIDSON",
  "startTime": "2026-05-30T01:00:00Z",
  "endTime": "2026-05-30T01:15:32Z",
  "status": "SUCCESS",
  "recordsDiscovered": 15,
  "anomaliesDetected": null,
  "logOutputUrl": "https://storage.replit.com/logs/scrapers/tn-davidson-deed-1780134000.log"
}
```

**Response (200 OK)**:
```json
{
  "logId": "2cb129a0-9742-4f3b-8199-a9a304f47efb",
  "acknowledged": true
}
```

---

## 3. Lead Queries & Analytics (Dashboard)

### GET `/api/v1/leads`
Query and filter distressed-property leads. Supports bounding-box geographic parameters for rendering on interactive maps.

**Query Parameters**:
*   `county`: e.g. `TN_DAVIDSON`
*   `filingType`: e.g. `LIS_PENDENS`
*   `tier`: e.g. `A_PLUS`
*   `minEquity`: e.g. `50000` (min USD equity)
*   `minScore`: e.g. `70` (min opportunity score)
*   `vacant`: `true`/`false`
*   `bounds`: `min_lng,min_lat,max_lng,max_lat` (maps bounding box filter)
*   `page`: default `1`
*   `limit`: default `50`

**Response (200 OK)**:
```json
{
  "total": 124,
  "page": 1,
  "limit": 50,
  "leads": [
    {
      "id": "8482bf40-410a-4fb4-81d3-92f7f98212ab",
      "countyCode": "TN_DAVIDSON",
      "caseNumber": "26CH-10492",
      "filingDate": "2026-05-29",
      "filingType": "LIS_PENDENS",
      "ownerName": "Smith, John",
      "propertyAddress": "123 Nashville Way, Nashville, TN 37203",
      "coordinates": {
        "lng": -86.7816,
        "lat": 36.1627
      },
      "valuation": {
        "estimatedValue": 380000.00,
        "estimatedEquity": 135000.00,
        "equityPercentage": 35.53
      },
      "score": {
        "opportunityScore": 82,
        "tier": "A"
      },
      "isVacant": false
    }
  ]
}
```

### GET `/api/v1/leads/:id`
Retrieve a single property opportunity profile.

**Response (200 OK)**:
```json
{
  "id": "8482bf40-410a-4fb4-81d3-92f7f98212ab",
  "countyCode": "TN_DAVIDSON",
  "caseNumber": "26CH-10492",
  "filingDate": "2026-05-29",
  "filingType": "LIS_PENDENS",
  "ownerName": "Smith, John",
  "parcelNumber": "093-02-0-104.00",
  "loanAmount": 245000.00,
  "trusteeName": "Rubin Lublin TN PLLC",
  "plaintiffAttorney": "McCalla Raymer Leibert Pierce",
  "auctionDate": "2026-06-25T10:00:00Z",
  "propertyAddress": {
    "street": "123 Nashville Way",
    "city": "Nashville",
    "state": "TN",
    "zip": "37203"
  },
  "mailingAddress": {
    "street": "123 Nashville Way",
    "city": "Nashville",
    "state": "TN",
    "zip": "37203"
  },
  "location": {
    "lng": -86.7816,
    "lat": 36.1627
  },
  "enrichment": {
    "estimatedValue": 380000.00,
    "firstMortgageAmount": 245000.00,
    "totalLiens": 0.00,
    "estimatedEquity": 135000.00,
    "equityPercentage": 35.53,
    "ownershipLengthYears": 8.4,
    "isAbsenteeOwned": false,
    "isVacant": false,
    "propertyType": "Single Family Residential",
    "yearBuilt": 1994,
    "lastEnriched": "2026-05-30T04:30:12Z"
  },
  "score": {
    "equityScore": 75,
    "distressScore": 80,
    "tenureScore": 75,
    "taxScore": 0,
    "vacancyScore": 0,
    "opportunityScore": 82,
    "tier": "A"
  },
  "documentUrl": "https://storage.replit.com/foreclosures/davidson/doc_19482.pdf"
}
```

---

## 4. CRM Pipeline & User Collections

### GET `/api/v1/crm/pipeline`
List leads in user CRM pipeline.

**Response (200 OK)**:
```json
{
  "pipeline": [
    {
      "crmRecordId": "ab9029a0-9742-4f3b-8199-a9a304f4abcd",
      "leadId": "8482bf40-410a-4fb4-81d3-92f7f98212ab",
      "propertyAddress": "123 Nashville Way, Nashville, TN 37203",
      "status": "NEW",
      "offerAmount": null,
      "notes": "Spoke to attorney, auction scheduled for next month.",
      "updatedAt": "2026-05-30T04:45:10Z"
    }
  ]
}
```

### POST `/api/v1/crm/pipeline`
Move a lead into user's pipeline.

**Request Body**:
```json
{
  "leadId": "8482bf40-410a-4fb4-81d3-92f7f98212ab",
  "status": "NEW"
}
```

**Response (201 Created)**:
```json
{
  "crmRecordId": "ab9029a0-9742-4f3b-8199-a9a304f4abcd",
  "success": true
}
```

### PATCH `/api/v1/crm/pipeline/:crmRecordId`
Update notes, offer amount, or deal progression.

**Request Body**:
```json
{
  "status": "CONTACTED",
  "offerAmount": 280000.00,
  "notes": "Emailed John Smith directly. Sent cash offer."
}
```

**Response (200 OK)**:
```json
{
  "crmRecordId": "ab9029a0-9742-4f3b-8199-a9a304f4abcd",
  "success": true,
  "status": "CONTACTED"
}
```

---

## 5. Saved Searches & Exports

### POST `/api/v1/saved-searches`
Saves current query criteria and enables daily notifications.

**Request Body**:
```json
{
  "searchName": "High Equity Davidson Notice of Default",
  "emailNotifications": true,
  "webhookNotifications": false,
  "filterCriteria": {
    "countyCode": "TN_DAVIDSON",
    "filingType": "NOTICE_OF_DEFAULT",
    "minEquityPercentage": 40.00,
    "minScore": 75
  }
}
```

**Response (201 Created)**:
```json
{
  "searchId": "9b1229a0-9742-4f3b-8199-a9a304f4ef10",
  "success": true
}
```

### GET `/api/v1/leads/export`
Exports a filtered query to files.

**Query Parameters**: Same filters as `GET /api/v1/leads` plus:
*   `format`: `csv` | `xlsx` | `pdf`

**Response**: Direct file download stream.
Header: `Content-Disposition: attachment; filename="leads_export_20260530.csv"`
Content-Type: `text/csv`

---

## 6. Phase 2 Evolution (Distressed Property Intelligence)

### POST `/api/v1/search/nlp`
Parses raw natural language text queries into structured database query filter parameters.

**Request Body**:
```json
{
  "query": "Find inherited houses in Nashville with at least 40% equity"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "filters": {
    "county": "TN_DAVIDSON",
    "filingType": "PROBATE",
    "minEquityPct": 40
  }
}
```

### GET `/api/v1/counties/discovery`
Lists public records portals discovered across the country, showing status and scraper suggestions.

**Response (200 OK)**:
```json
{
  "registries": [
    {
      "id": "e5cde90a-4fb4-81d3-92f7-f98212abcdef",
      "county": "Davidson County",
      "state": "TN",
      "portal_name": "Davidson Recorder of Deeds",
      "url": "https://recorder.nashville.gov",
      "platform_type": "Recorder Portal",
      "captcha_required": true,
      "ocr_required": false,
      "search_method": "Deed Book Search",
      "api_available": false,
      "data_quality_score": 92,
      "connector_status": "approved"
    }
  ]
}
```

### POST `/api/v1/counties/discovery/approve`
Approves a discovered portal, automatically writing a Playwright scraper script template for it.

**Request Body**:
```json
{
  "id": "e5cde90a-4fb4-81d3-92f7-f98212abcdef"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Registry portal approved. Connector code generated."
}
```

### GET `/api/v1/leads/:id/deal-analysis`
Performs wholesaling deal analysis on a property lead (calculating ARV, repairs, MAO, and grading metrics).

**Response (200 OK)**:
```json
{
  "arv": 207000,
  "estimatedRepairs": 24840,
  "wholesaleFeePotential": 10350,
  "suggestedCashOffer": 109710,
  "mao": 120060,
  "grade": "A+",
  "explanation": "Deep equity position. Substantial margins for wholesaling, cash offers, or creative financing."
}
```

### GET `/api/v1/leads/:id/seller-persona`
Uses heuristics to build AI-predicted owner personality cards, outreach recommendations, and channel readiness.

**Response (200 OK)**:
```json
{
  "personas": [
    {
      "personaType": "Long-Term Owner",
      "confidenceScore": 88,
      "contactStrategy": "Educate on tax-advantaged sales (installment notes). Propose seller financing for passive retirement income.",
      "offerType": "SELLER_FINANCING"
    }
  ],
  "motivation": {
    "score": 45,
    "tier": "MEDIUM",
    "explanation": "Standard ownership indicators."
  },
  "outreachReadiness": {
    "sms": true,
    "mail": true,
    "call": true,
    "email": false,
    "door": false,
    "recommendation": "Primary Strategy: Low-touch Direct Mail."
  }
}
```

### GET `/api/v1/analytics/heatmap`
Aggregates geographical volume counts for foreclosures, probates, vacancies, and investor purchases.

**Response (200 OK)**:
```json
{
  "heatmap": [
    {
      "id": "c7ad1aea-b89d-44a7-a9cb-1d50b1b03424",
      "zip_code": "37203",
      "city": "Nashville",
      "county_code": "TN_DAVIDSON",
      "state": "TN",
      "foreclosure_count": 15,
      "probate_count": 8,
      "tax_delinquency_count": 12,
      "vacancy_count": 4,
      "investor_purchase_count": 6,
      "cash_transaction_count": 11
    }
  ]
}
```

---

## 7. GraphQL Evolution Roadmap

To transition this REST API gateway into a high-performance GraphQL schema in Phase 3, we project the following query and mutation contracts:

### Proposed Schema DDL

```graphql
type Query {
  leads(filters: LeadFilterInput, limit: Int, page: Int): LeadConnection!
  lead(id: ID!): LeadDetail
  countyPortals: [CountyPortal!]!
  heatmapTrends(region: String): [HeatmapMetric!]!
}

type Mutation {
  approveCountyPortal(id: ID!): ApprovalPayload!
  addToCrm(leadId: ID!, status: String!): CrmRecordPayload!
  updateCrmStatus(crmRecordId: ID!, status: String!, notes: String, offerAmount: Float): CrmRecordPayload!
}

input LeadFilterInput {
  county: String
  filingType: FilingType
  tier: LeadTier
  minEquity: Float
  minScore: Int
  vacant: Boolean
  radius: RadiusFilterInput
}

input RadiusFilterInput {
  lat: Float!
  lng: Float!
  distanceMiles: Float!
}
```

This evolution will reduce bandwidth usage by over 60%, allowing mobile apps and CRM connectors to fetch only specific fields (like `motivation.score` or `dealAnalysis.grade`) without loading complete assessment profiles.
