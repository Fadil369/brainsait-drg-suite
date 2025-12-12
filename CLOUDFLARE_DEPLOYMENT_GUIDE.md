# Cloudflare Deployment Guide
## BrainSAIT DRG Suite - Complete Deployment to Cloudflare Platform

**Last Updated:** December 12, 2025  
**Platform:** Cloudflare Workers, Pages, Durable Objects, R2, KV, D1  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start Deployment](#quick-start-deployment)
4. [Cloudflare Services Configuration](#cloudflare-services-configuration)
5. [Production Deployment](#production-deployment)
6. [Environment Variables](#environment-variables)
7. [Monitoring and Observability](#monitoring-and-observability)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The BrainSAIT DRG Suite is architected for seamless deployment on Cloudflare's edge platform, leveraging:

- **Cloudflare Workers** - Serverless backend API (Hono framework)
- **Cloudflare Pages** - React frontend with SSR capabilities
- **Durable Objects** - Stateful storage for real-time sessions and caching
- **R2** - Object storage for clinical documents and audit logs
- **KV** - Key-value store for configuration and cache
- **D1** - SQLite database for relational data

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Edge Network                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │ Cloudflare   │         │  Cloudflare  │            │
│  │   Pages      │────────▶│   Workers    │            │
│  │  (React UI)  │         │  (Hono API)  │            │
│  └──────────────┘         └──────┬───────┘            │
│                                   │                      │
│       ┌───────────────────────────┼──────────────┐     │
│       │                           │              │     │
│  ┌────▼─────┐  ┌──────▼──────┐  ┌▼────────┐  ┌─▼───┐ │
│  │ Durable  │  │      KV     │  │   R2    │  │ D1  │ │
│  │ Objects  │  │   (Cache)   │  │(Storage)│  │(DB) │ │
│  └──────────┘  └─────────────┘  └─────────┘  └─────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  nphies API     │
                  │  (Saudi Health  │
                  │   Platform)     │
                  └─────────────────┘
```

---

## Prerequisites

### 1. Cloudflare Account Setup

```bash
# 1. Create a Cloudflare account at https://dash.cloudflare.com/sign-up

# 2. Install Wrangler CLI globally
npm install -g wrangler

# 3. Authenticate with Cloudflare
wrangler login

# 4. Verify authentication
wrangler whoami
```

### 2. Required Cloudflare Plans

| Service | Free Tier | Recommended Plan | Monthly Cost |
|---------|-----------|------------------|--------------|
| Workers | 100K requests/day | Workers Paid ($5/mo) | $5 |
| Pages | Unlimited | Free | $0 |
| Durable Objects | 0 (requires paid) | Included in Workers Paid | $0 |
| R2 | 10 GB storage | Pay-as-you-go | ~$0.15/GB |
| KV | 100K reads/day | Included in Workers Paid | $0 |
| D1 | 5 GB storage | Pay-as-you-go | ~$0.05/GB |

**Total Estimated Cost:** $5-15/month for small deployments

### 3. Install Dependencies

```bash
cd /home/runner/work/brainsait-drg-suite/brainsait-drg-suite

# Install all dependencies
npm install

# Verify wrangler configuration
npx wrangler --version
```

---

## Quick Start Deployment

### Option 1: One-Click Deploy (Fastest)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Fadil369/brainsait-drg-suite)

**Steps:**
1. Click the button above
2. Authenticate with GitHub and Cloudflare
3. Select your Cloudflare account
4. Click "Deploy"
5. Wait 2-3 minutes for deployment

### Option 2: Command Line Deploy (Recommended)

```bash
# 1. Build the application
npm run build

# 2. Deploy to Cloudflare
npm run deploy

# 3. View your deployed application
# Output will show: https://solventum-drg-suite-lwsb-xgwrw12cfreedylv.your-subdomain.workers.dev
```

### Option 3: GitHub Actions CI/CD (Production)

See [Production Deployment](#production-deployment) section below.

---

## Cloudflare Services Configuration

### 1. Durable Objects (Already Configured) ✅

**Current Configuration:** `wrangler.jsonc` Lines 17-32

The application already has Durable Objects configured for stateful storage:

```jsonc
"durable_objects": {
  "bindings": [
    {
      "name": "GlobalDurableObject",
      "class_name": "GlobalDurableObject"
    }
  ]
},
"migrations": [
  {
    "tag": "v1",
    "new_sqlite_classes": ["GlobalDurableObject"]
  }
]
```

**What it does:**
- Stores user sessions
- Caches coding job results
- Manages real-time worklist state

**No additional configuration needed.**

---

### 2. R2 Object Storage (For Clinical Documents)

**Setup Steps:**

#### 2.1 Create R2 Bucket

```bash
# Create bucket for clinical documents
wrangler r2 bucket create brainsait-clinical-docs

# Create bucket for audit logs
wrangler r2 bucket create brainsait-audit-logs

# List buckets to verify
wrangler r2 bucket list
```

#### 2.2 Update `wrangler.jsonc`

Add after line 23 (after durable_objects section):

```jsonc
"r2_buckets": [
  {
    "binding": "CLINICAL_DOCS",
    "bucket_name": "brainsait-clinical-docs"
  },
  {
    "binding": "AUDIT_LOGS",
    "bucket_name": "brainsait-audit-logs"
  }
]
```

#### 2.3 Update Worker Type Definitions

Create `worker/bindings.d.ts`:

```typescript
interface Env {
  GlobalDurableObject: DurableObjectNamespace;
  CLINICAL_DOCS: R2Bucket;
  AUDIT_LOGS: R2Bucket;
  // ... other bindings
}
```

#### 2.4 Use R2 in Worker Code

Example: Store clinical note in R2

```typescript
// worker/user-routes.ts
app.post('/api/clinical-notes/:id/upload', async (c) => {
  const { id } = c.req.param();
  const file = await c.req.blob();
  
  // Store in R2
  await c.env.CLINICAL_DOCS.put(
    `notes/${id}.pdf`,
    file,
    {
      httpMetadata: {
        contentType: 'application/pdf'
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        encounterId: id
      }
    }
  );
  
  return c.json({ success: true, key: `notes/${id}.pdf` });
});
```

---

### 3. KV Namespace (For Configuration Cache)

**Setup Steps:**

#### 3.1 Create KV Namespaces

```bash
# Production namespace
wrangler kv namespace create "BRAINSAIT_CONFIG"

# Preview namespace (for development)
wrangler kv namespace create "BRAINSAIT_CONFIG" --preview

# Output will show:
# { binding = "BRAINSAIT_CONFIG", id = "abc123..." }
# { binding = "BRAINSAIT_CONFIG", preview_id = "xyz789..." }
```

#### 3.2 Update `wrangler.jsonc`

Add after r2_buckets section:

```jsonc
"kv_namespaces": [
  {
    "binding": "BRAINSAIT_CONFIG",
    "id": "abc123...",  // Replace with your production ID
    "preview_id": "xyz789..."  // Replace with your preview ID
  }
]
```

#### 3.3 Store Configuration in KV

```bash
# Store nphies API endpoint
wrangler kv key put \
  --namespace-id="abc123..." \
  "nphies:base_url" \
  "https://prod.nphies.sa/api"

# Store automation thresholds
wrangler kv key put \
  --namespace-id="abc123..." \
  "automation:semi_autonomous_threshold" \
  "0.90"

# Store CDI rules
wrangler kv key put \
  --namespace-id="abc123..." \
  "cdi:rules:pneumonia" \
  '{"keyword":"pneumonia","severity":"warning"}'
```

#### 3.4 Use KV in Worker Code

```typescript
// worker/user-routes.ts
app.get('/api/config/:key', async (c) => {
  const { key } = c.req.param();
  
  // Retrieve from KV with cache
  const value = await c.env.BRAINSAIT_CONFIG.get(key, { 
    cacheTtl: 3600  // Cache for 1 hour
  });
  
  return c.json({ success: true, value });
});

app.put('/api/config/:key', async (c) => {
  const { key } = c.req.param();
  const { value } = await c.req.json();
  
  // Store in KV
  await c.env.BRAINSAIT_CONFIG.put(key, value);
  
  return c.json({ success: true });
});
```

---

### 4. D1 Database (SQLite for Relational Data)

**Setup Steps:**

#### 4.1 Create D1 Database

```bash
# Create production database
wrangler d1 create brainsait-drg-suite

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "brainsait-drg-suite"
# database_id = "def456..."
```

#### 4.2 Update `wrangler.jsonc`

Add after kv_namespaces section:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "brainsait-drg-suite",
    "database_id": "def456...",  // Replace with your database ID
    "migrations_dir": "sql/migrations"
  }
]
```

#### 4.3 Create Initial Schema

```bash
# Execute schema from sql/schema.sql
wrangler d1 execute brainsait-drg-suite --file=sql/schema.sql

# Verify tables were created
wrangler d1 execute brainsait-drg-suite --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### 4.4 Create Migration System

Create `sql/migrations/0001_initial_schema.sql`:

```sql
-- Initial schema migration
-- This file is generated from sql/schema.sql

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  national_id TEXT UNIQUE,
  iqama_id TEXT UNIQUE,
  given_name TEXT NOT NULL,
  family_name TEXT,
  date_of_birth TEXT,
  sex TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ... rest of schema from sql/schema.sql
```

Run migration:

```bash
wrangler d1 migrations apply brainsait-drg-suite
```

#### 4.5 Use D1 in Worker Code

```typescript
// worker/user-routes.ts
app.get('/api/patients/:id', async (c) => {
  const { id } = c.req.param();
  
  // Query D1 database
  const result = await c.env.DB.prepare(
    'SELECT * FROM patients WHERE id = ?'
  ).bind(id).first();
  
  if (!result) {
    return c.json({ success: false, error: 'Patient not found' }, 404);
  }
  
  return c.json({ success: true, data: result });
});

app.post('/api/patients', async (c) => {
  const patient = await c.req.json();
  
  // Insert into D1
  await c.env.DB.prepare(`
    INSERT INTO patients (id, national_id, given_name, family_name)
    VALUES (?, ?, ?, ?)
  `).bind(
    patient.id,
    patient.national_id,
    patient.given_name,
    patient.family_name
  ).run();
  
  return c.json({ success: true, data: patient });
});
```

---

### 5. Complete `wrangler.jsonc` Configuration

Here's the complete configuration with all services:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "solventum-drg-suite-lwsb-xgwrw12cfreedylv",
  "main": "worker/index.ts",
  "compatibility_date": "2025-04-24",
  
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "!/api/docs/*"]
  },
  
  "observability": {
    "enabled": true
  },
  
  "durable_objects": {
    "bindings": [
      {
        "name": "GlobalDurableObject",
        "class_name": "GlobalDurableObject"
      }
    ]
  },
  
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["GlobalDurableObject"]
    }
  ],
  
  "r2_buckets": [
    {
      "binding": "CLINICAL_DOCS",
      "bucket_name": "brainsait-clinical-docs"
    },
    {
      "binding": "AUDIT_LOGS",
      "bucket_name": "brainsait-audit-logs"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "BRAINSAIT_CONFIG",
      "id": "YOUR_KV_ID_HERE",
      "preview_id": "YOUR_PREVIEW_KV_ID_HERE"
    }
  ],
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "brainsait-drg-suite",
      "database_id": "YOUR_D1_ID_HERE",
      "migrations_dir": "sql/migrations"
    }
  ],
  
  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

---

## Production Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Cloudflare Workers
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run tests
        run: npm run lint
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
      
      - name: Run D1 migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: d1 migrations apply brainsait-drg-suite
```

### Required GitHub Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

```
CLOUDFLARE_API_TOKEN - Create at https://dash.cloudflare.com/profile/api-tokens
  Permissions needed:
    - Account > Workers Scripts > Edit
    - Account > D1 > Edit
    - Account > Workers KV Storage > Edit
    - Account > R2 > Edit

CLOUDFLARE_ACCOUNT_ID - Found at https://dash.cloudflare.com/
  (Look in the URL or under Account Home)
```

### Manual Production Deployment

```bash
# 1. Set production environment
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# 2. Build for production
NODE_ENV=production npm run build

# 3. Deploy with wrangler
wrangler deploy --env production

# 4. Verify deployment
curl https://solventum-drg-suite-lwsb-xgwrw12cfreedylv.your-subdomain.workers.dev/api/health
```

---

## Environment Variables

### Secrets Management

Store sensitive credentials using Wrangler secrets:

```bash
# nphies API credentials (from audit IMPLEMENTATION_PLAN.md)
wrangler secret put NPHIES_CLIENT_ID
# Paste your client ID when prompted

wrangler secret put NPHIES_CLIENT_SECRET
# Paste your client secret when prompted

wrangler secret put NPHIES_BASE_URL
# Enter: https://prod.nphies.sa/api

# List all secrets (values are hidden)
wrangler secret list
```

### Access Secrets in Worker

```typescript
// worker/user-routes.ts
import { NphiesConnector } from '../src/backend/nphies_connector';

app.post('/api/claims/submit', async (c) => {
  // Access secrets from environment
  const connector = new NphiesConnector(
    c.env.NPHIES_BASE_URL,
    c.env.NPHIES_CLIENT_ID,
    c.env.NPHIES_CLIENT_SECRET
  );
  
  const claim = await c.req.json();
  const result = await connector.submit_claim(claim);
  
  return c.json({ success: true, data: result });
});
```

---

## Monitoring and Observability

### 1. Cloudflare Analytics Dashboard

Access at: `https://dash.cloudflare.com/[account_id]/workers/analytics`

**Metrics Available:**
- Requests per second
- CPU time used
- Error rate
- P50, P95, P99 latency
- Geographic distribution

### 2. Real-Time Logs

```bash
# Stream live logs from your Worker
wrangler tail

# Filter by status code
wrangler tail --status error

# Filter by IP address
wrangler tail --ip-address 203.0.113.1
```

### 3. Custom Logging

Add structured logging to worker:

```typescript
// worker/user-routes.ts
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
    user_agent: c.req.header('user-agent')
  }));
});
```

### 4. Error Tracking with Sentry

```bash
npm install @sentry/browser @sentry/cloudflare

# Add to worker/index.ts
import * as Sentry from '@sentry/cloudflare';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  tracesSampleRate: 0.1
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Deployment Fails with "Durable Objects requires paid plan"

**Solution:**
```bash
# Upgrade to Workers Paid plan ($5/month)
# Visit: https://dash.cloudflare.com/[account_id]/workers/plans
```

#### 2. "Binding CLINICAL_DOCS not found"

**Solution:**
```bash
# Verify R2 bucket exists
wrangler r2 bucket list

# Recreate if missing
wrangler r2 bucket create brainsait-clinical-docs

# Ensure wrangler.jsonc has correct binding
```

#### 3. D1 Migration Fails

**Solution:**
```bash
# Check migration status
wrangler d1 migrations list brainsait-drg-suite

# Rollback if needed
wrangler d1 migrations rollback brainsait-drg-suite

# Reapply migrations
wrangler d1 migrations apply brainsait-drg-suite
```

#### 4. KV Store Not Working

**Solution:**
```bash
# Verify KV namespace exists
wrangler kv namespace list

# Test read/write
wrangler kv key put --namespace-id=YOUR_ID test "Hello World"
wrangler kv key get --namespace-id=YOUR_ID test
```

#### 5. Build Fails with "Module not found"

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

#### 6. Worker Exceeds CPU Time Limit

**Solution:**
- Optimize database queries (use indexes)
- Cache expensive operations in KV
- Use Durable Objects for stateful computations
- Reduce external API calls

```typescript
// Example: Cache APR-DRG calculations
const cached = await c.env.BRAINSAIT_CONFIG.get(`drg:${encounterId}`);
if (cached) return JSON.parse(cached);

const result = calculateAPRDRG(...);
await c.env.BRAINSAIT_CONFIG.put(`drg:${encounterId}`, JSON.stringify(result), {
  expirationTtl: 3600  // Cache for 1 hour
});
```

---

## Cost Estimation

### Monthly Cost Breakdown (Small Deployment)

| Service | Usage | Cost |
|---------|-------|------|
| Workers | 10M requests/month | $5 (base) + $0.50/million = $5.50 |
| Durable Objects | 100K requests | Included in Workers Paid |
| R2 Storage | 50 GB | 50 × $0.015 = $0.75 |
| R2 Operations | 1M Class A, 10M Class B | $4.50 + $0.40 = $4.90 |
| KV | 10M reads, 1M writes | $0.50 + $0.50 = $1.00 |
| D1 | 10 GB storage, 5M rows read | $0.75 + $0.00 = $0.75 |
| **Total** | | **~$12.90/month** |

### Cost Optimization Tips

1. **Enable Caching**: Use KV to cache frequently accessed data
2. **Batch Operations**: Combine multiple D1 queries into transactions
3. **R2 Lifecycle Policies**: Automatically delete old audit logs after 90 days
4. **Smart Routing**: Use Durable Objects for session-based operations only

---

## Additional Resources

### Official Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Workers KV Docs](https://developers.cloudflare.com/kv/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)

### Community Support
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Cloudflare Community Forum](https://community.cloudflare.com/)
- [GitHub Issues](https://github.com/Fadil369/brainsait-drg-suite/issues)

---

## Next Steps

1. ✅ Complete the [Quick Start Deployment](#quick-start-deployment)
2. ⚠️ Configure [R2 buckets](#2-r2-object-storage-for-clinical-documents) for document storage
3. ⚠️ Set up [KV namespace](#3-kv-namespace-for-configuration-cache) for configuration
4. ⚠️ Initialize [D1 database](#4-d1-database-sqlite-for-relational-data) with schema
5. ⚠️ Add [GitHub Actions workflow](#github-actions-workflow) for CI/CD
6. ⚠️ Configure [secrets](#secrets-management) for nphies credentials
7. ✅ Monitor deployment via [Cloudflare Dashboard](#1-cloudflare-analytics-dashboard)

---

**Document Version:** 1.0  
**Author:** Technical Deployment Team  
**Contact:** For deployment support, create an issue on GitHub  
**Last Tested:** December 12, 2025
