#!/bin/bash
# BRAINSAIT: Cloudflare optimized build script
# NEURAL: Performance-focused build pipeline

set -e

echo "🚀 BrainSAIT DRG Suite - Cloudflare Build Pipeline"
echo "=================================================="

# Clean previous builds
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist .vite node_modules/.vite

# Install dependencies (frozen lockfile for production)
echo "📦 Installing dependencies..."
bun install --frozen-lockfile

# Run build with optimizations
echo "🔨 Building application..."
NODE_ENV=production bun run build

# Verify build output
echo "✅ Verifying build output..."
if [ ! -d "dist" ]; then
  echo "❌ Build failed: dist directory not found"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "❌ Build failed: index.html not found"
  exit 1
fi

echo "✅ Build completed successfully!"
echo "📊 Build size:"
du -sh dist
