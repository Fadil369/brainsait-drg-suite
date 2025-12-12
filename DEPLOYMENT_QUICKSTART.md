# Cloudflare Deployment - Quick Start Guide
## 3 Ways to Deploy BrainSAIT DRG Suite

---

## 🚀 Option 1: One-Click Deploy (Fastest - 2 minutes)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Fadil369/brainsait-drg-suite)

**Steps:**
1. Click the button above
2. Authenticate with GitHub
3. Connect your Cloudflare account
4. Click "Deploy"
5. Done! 🎉

**What you get:**
- ✅ Cloudflare Workers (Hono API)
- ✅ Cloudflare Pages (React UI)
- ✅ Durable Objects (stateful storage)

---

## 🤖 Option 2: Automated Script (Recommended - 5 minutes)

```bash
# Clone repository
git clone https://github.com/Fadil369/brainsait-drg-suite.git
cd brainsait-drg-suite

# Run deployment script
./deploy-cf.sh
```

**What it does:**
1. ✅ Installs dependencies
2. ✅ Builds application
3. ✅ Creates R2 buckets (brainsait-clinical-docs, brainsait-audit-logs)
4. ✅ Sets up Workers KV (BRAINSAIT_CONFIG)
5. ✅ Initializes D1 database with schema
6. ✅ Deploys to Cloudflare Workers

**After deployment:**
```bash
# Add nphies credentials
wrangler secret put NPHIES_CLIENT_ID
wrangler secret put NPHIES_CLIENT_SECRET
wrangler secret put NPHIES_BASE_URL
```

---

## 🛠️ Option 3: Manual Step-by-Step (10-15 minutes)

### Step 1: Prerequisites
```bash
npm install -g wrangler
wrangler login
```

### Step 2: Build Application
```bash
npm install
npm run build
```

### Step 3: Create R2 Buckets
```bash
wrangler r2 bucket create brainsait-clinical-docs
wrangler r2 bucket create brainsait-audit-logs
```

### Step 4: Create KV Namespace
```bash
wrangler kv namespace create "BRAINSAIT_CONFIG"
# Copy the ID and add to wrangler.jsonc
```

### Step 5: Create D1 Database
```bash
wrangler d1 create brainsait-drg-suite
# Copy the ID and add to wrangler.jsonc

# Initialize schema
wrangler d1 execute brainsait-drg-suite --file=sql/schema.sql
```

### Step 6: Update wrangler.jsonc
Add the IDs from steps 4-5 to your `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "BRAINSAIT_CONFIG",
      "id": "YOUR_KV_ID_HERE"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "brainsait-drg-suite",
      "database_id": "YOUR_D1_ID_HERE"
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
  ]
}
```

### Step 7: Deploy
```bash
npm run deploy
```

### Step 8: Configure Secrets
```bash
wrangler secret put NPHIES_CLIENT_ID
wrangler secret put NPHIES_CLIENT_SECRET
wrangler secret put NPHIES_BASE_URL
```

---

## 🔍 Verify Deployment

```bash
# Check health endpoint
curl https://your-app.workers.dev/api/health

# View live logs
wrangler tail

# Check analytics
open https://dash.cloudflare.com/[account]/workers/analytics
```

---

## 📊 Services Deployed

| Service | Purpose | Status |
|---------|---------|--------|
| Workers | Hono API backend | ✅ Auto |
| Pages | React frontend | ✅ Auto |
| Durable Objects | Stateful sessions | ✅ Auto |
| R2 Storage | Documents & logs | 🆕 Script/Manual |
| Workers KV | Configuration cache | 🆕 Script/Manual |
| D1 Database | Relational data | 🆕 Script/Manual |

---

## 💰 Cost Estimate

| Plan | Monthly Cost | What's Included |
|------|--------------|-----------------|
| **Workers Paid** | $5 | Workers, Durable Objects, KV |
| **R2 Storage** | ~$1-3 | 50-100 GB documents |
| **D1 Database** | ~$1-2 | 10 GB SQLite data |
| **Total** | **$7-10/month** | Full stack deployment |

**Free Tier Available:**
- Workers: 100K requests/day
- Pages: Unlimited
- R2: 10 GB free
- KV: 100K reads/day
- D1: 5 GB free

---

## 🆘 Troubleshooting

### "Durable Objects requires paid plan"
```bash
# Upgrade to Workers Paid ($5/month)
# Visit: https://dash.cloudflare.com/[account]/workers/plans
```

### "Binding not found"
```bash
# Verify resources exist
wrangler r2 bucket list
wrangler kv namespace list
wrangler d1 list

# Update wrangler.jsonc with correct IDs
```

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite node_modules
npm install
npm run build
```

---

## 📚 Full Documentation

- **Complete Guide**: [`CLOUDFLARE_DEPLOYMENT_GUIDE.md`](./CLOUDFLARE_DEPLOYMENT_GUIDE.md)
- **Audit Reports**: [`AUDIT_README.md`](./AUDIT_README.md)
- **Technical Specs**: [`TECHNICAL_AUDIT_REPORT.md`](./TECHNICAL_AUDIT_REPORT.md)

---

## 🎯 Next Steps After Deployment

1. ✅ Test your deployment: `curl https://your-app.workers.dev/api/health`
2. ⚠️ Configure nphies credentials (see above)
3. ⚠️ Set up GitHub Actions CI/CD (see CLOUDFLARE_DEPLOYMENT_GUIDE.md)
4. ⚠️ Configure custom domain (optional)
5. ⚠️ Enable analytics and monitoring
6. ✅ Start pilot program with 2-3 facilities

---

**Need Help?**
- 📖 Read: CLOUDFLARE_DEPLOYMENT_GUIDE.md (complete documentation)
- 🐛 Issues: https://github.com/Fadil369/brainsait-drg-suite/issues
- 💬 Discord: https://discord.gg/cloudflaredev

---

**Last Updated:** December 12, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
