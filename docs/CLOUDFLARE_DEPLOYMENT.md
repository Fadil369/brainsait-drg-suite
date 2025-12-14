# 🌐 Cloudflare Pages Deployment Guide

## 🎯 Overview

BrainSAIT DRG Suite is deployed on Cloudflare Pages with Durable Objects for persistent storage and global edge distribution.

## 🚀 Deployment Methods

### Method 1: Automatic Deployment (Recommended)

**GitHub Integration:**
1. Connect repository to Cloudflare Pages
2. Configure build settings:
   - **Build command:** `bun install && bun run build`
   - **Build output:** `dist`
   - **Root directory:** `/`
   - **Node version:** `22`
   - **Bun version:** `1.2.15`

### Method 2: Manual Deployment via CLI

**Prerequisites:**
```bash
# Install Wrangler CLI
bun add -g wrangler

# Authenticate
wrangler login
```

**Deploy to Preview:**
```bash
bun run deploy:preview
```

**Deploy to Production:**
```bash
bun run deploy:production
```

## 🔧 Configuration

### Environment Variables

Set these in Cloudflare Pages Dashboard:

**Production:**
- `NODE_ENV=production`
- `VITE_API_URL=https://api.brainsait.com`
- `VITE_LOGGER_TYPE=json`

**Preview:**
- `NODE_ENV=staging`
- `VITE_API_URL=https://api-staging.brainsait.com`

### Build Settings

```json
{
  "production_branch": "main",
  "preview_branches": ["develop", "staging"],
  "build_command": "bun install && bun run build",
  "build_output_directory": "dist",
  "root_directory": "/",
  "environment_variables": {
    "NODE_VERSION": "22.16.0",
    "BUN_VERSION": "1.2.15",
    "VITE_LOGGER_TYPE": "json"
  }
}
```

## 🐛 Troubleshooting

### Lockfile Errors

**Error:** `lockfile had changes, but lockfile is frozen`

**Solution:**
```bash
# Regenerate lockfile locally
rm bun.lock
bun install

# Commit the new lockfile
git add bun.lock
git commit -m "chore: regenerate bun.lock"
git push
```

### Build Failures

**Check build logs:**
```bash
wrangler pages deployment tail
```

**Clear build cache:**
1. Go to Cloudflare Dashboard
2. Pages → Your Project → Settings
3. Click "Clear build cache"
4. Retry deployment

### Memory Issues

If build fails with OOM errors:
- Reduce `optimizeDeps.include` in `vite.config.ts`
- Enable chunking in build config
- Contact Cloudflare support for memory limit increase

## 📊 Performance Optimization

### Edge Caching

Static assets are automatically cached at Cloudflare's edge:
- HTML: 4 hours
- JS/CSS: 1 year (with content hashing)
- Images: 1 month

### Durable Objects

Healthcare data persistence via Durable Objects:
- **Location:** Closest to user (auto-selected)
- **Consistency:** Strong consistency
- **Backup:** Automatic SQLite persistence

## 🔐 Security

### Headers

Cloudflare Workers automatically add:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### HIPAA Compliance

**BRAINSAIT: Healthcare compliance requirements**
- All PHI encrypted at rest and in transit
- Audit logging via Durable Objects
- Access controls enforced at edge
- BAA agreement required with Cloudflare

## 📈 Monitoring

### Analytics

Access in Cloudflare Dashboard:
- **Web Analytics:** Real-time visitor metrics
- **Worker Analytics:** API performance
- **Observability:** Error tracking

### Custom Logging

```typescript
// AGENT: Structured logging with audit trails
logger.info({
  event: 'patient_accessed',
  userId: user.id,
  timestamp: new Date().toISOString(),
  compliance: 'HIPAA'
});
```

## 🔄 Rollback

**Instant rollback to previous version:**
```bash
# List deployments
wrangler pages deployment list

# Rollback to specific deployment
wrangler pages deployment promote <deployment-id>
```

## 📚 Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [BrainSAIT Project Documentation](../README.md)
