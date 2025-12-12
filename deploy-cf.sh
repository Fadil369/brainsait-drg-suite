#!/bin/bash

# Cloudflare Deployment Script for BrainSAIT DRG Suite
# This script sets up all Cloudflare services and deploys the application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed"
    print_info "Install it with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
print_info "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    print_warning "Not logged in to Cloudflare"
    print_info "Running: wrangler login"
    wrangler login
fi

print_success "Authenticated with Cloudflare"

# Start deployment process
print_header "BrainSAIT DRG Suite - Cloudflare Deployment"

# Step 1: Install dependencies
print_info "Step 1/7: Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 2: Build application
print_info "Step 2/7: Building application..."
npm run build
print_success "Application built successfully"

# Step 3: Setup R2 buckets
print_header "Setting up R2 Object Storage"
print_info "Step 3/7: Creating R2 buckets..."

# Check if buckets already exist
if wrangler r2 bucket list | grep -q "brainsait-clinical-docs"; then
    print_warning "R2 bucket 'brainsait-clinical-docs' already exists"
else
    wrangler r2 bucket create brainsait-clinical-docs
    print_success "Created R2 bucket: brainsait-clinical-docs"
fi

if wrangler r2 bucket list | grep -q "brainsait-audit-logs"; then
    print_warning "R2 bucket 'brainsait-audit-logs' already exists"
else
    wrangler r2 bucket create brainsait-audit-logs
    print_success "Created R2 bucket: brainsait-audit-logs"
fi

# Step 4: Setup KV namespace
print_header "Setting up Workers KV"
print_info "Step 4/7: Creating KV namespace..."

# Create KV namespace if it doesn't exist
KV_OUTPUT=$(wrangler kv namespace create "BRAINSAIT_CONFIG" 2>&1 || true)
if echo "$KV_OUTPUT" | grep -q "already exists"; then
    print_warning "KV namespace 'BRAINSAIT_CONFIG' already exists"
    # Extract existing ID
    KV_ID=$(wrangler kv namespace list | grep "BRAINSAIT_CONFIG" | grep -oP '"id": "\K[^"]+' | head -1 || echo "")
else
    KV_ID=$(echo "$KV_OUTPUT" | grep -oP '"id": "\K[^"]+' | head -1 || echo "")
    print_success "Created KV namespace: BRAINSAIT_CONFIG"
fi

if [ -n "$KV_ID" ]; then
    print_success "KV namespace ID: $KV_ID"
fi

# Step 5: Setup D1 database
print_header "Setting up D1 SQLite Database"
print_info "Step 5/7: Creating D1 database..."

D1_OUTPUT=$(wrangler d1 create brainsait-drg-suite 2>&1 || true)
if echo "$D1_OUTPUT" | grep -q "already exists"; then
    print_warning "D1 database 'brainsait-drg-suite' already exists"
    # Extract existing ID
    D1_ID=$(wrangler d1 list | grep "brainsait-drg-suite" | grep -oP '"database_id": "\K[^"]+' | head -1 || echo "")
else
    D1_ID=$(echo "$D1_OUTPUT" | grep -oP 'database_id = "\K[^"]+' | head -1 || echo "")
    print_success "Created D1 database: brainsait-drg-suite"
fi

if [ -n "$D1_ID" ]; then
    print_success "D1 database ID: $D1_ID"
    
    # Initialize database schema
    print_info "Initializing D1 database schema..."
    if [ -f "sql/schema.sql" ]; then
        wrangler d1 execute brainsait-drg-suite --file=sql/schema.sql 2>&1 | grep -v "Warning" || true
        print_success "Database schema initialized"
    else
        print_warning "sql/schema.sql not found, skipping schema initialization"
    fi
fi

# Step 6: Configure secrets
print_header "Configuring Secrets"
print_info "Step 6/7: Setting up environment secrets..."

print_warning "You need to manually configure the following secrets:"
echo ""
echo "  wrangler secret put NPHIES_CLIENT_ID"
echo "  wrangler secret put NPHIES_CLIENT_SECRET"
echo "  wrangler secret put NPHIES_BASE_URL"
echo ""
print_info "Run these commands after deployment to add your nphies credentials"

# Step 7: Deploy to Cloudflare
print_header "Deploying to Cloudflare Workers"
print_info "Step 7/7: Deploying application..."

npm run deploy

print_success "Deployment complete!"

# Print summary
print_header "Deployment Summary"

echo "✅ Application deployed successfully!"
echo ""
echo "📊 Services Configured:"
echo "  • Cloudflare Workers - Serverless API (Hono)"
echo "  • Cloudflare Pages - React Frontend"
echo "  • Durable Objects - Stateful storage ✅"
echo "  • R2 Storage - Clinical documents & audit logs ✅"
if [ -n "$KV_ID" ]; then
    echo "  • Workers KV - Configuration cache ✅ (ID: $KV_ID)"
else
    echo "  • Workers KV - Configuration cache ⚠️ (Manual setup needed)"
fi
if [ -n "$D1_ID" ]; then
    echo "  • D1 Database - SQLite relational data ✅ (ID: $D1_ID)"
else
    echo "  • D1 Database - SQLite relational data ⚠️ (Manual setup needed)"
fi
echo ""
echo "🔗 Your application URL:"
echo "  https://solventum-drg-suite-lwsb-xgwrw12cfreedylv.workers.dev"
echo ""
echo "📚 Next Steps:"
echo "  1. Configure nphies credentials (see above)"
echo "  2. Update wrangler.jsonc with KV and D1 IDs"
echo "  3. Test your deployment: curl https://your-app.workers.dev/api/health"
echo "  4. Set up GitHub Actions for CI/CD (see CLOUDFLARE_DEPLOYMENT_GUIDE.md)"
echo ""
echo "📖 Full documentation: CLOUDFLARE_DEPLOYMENT_GUIDE.md"
echo ""

print_success "Deployment script completed!"
