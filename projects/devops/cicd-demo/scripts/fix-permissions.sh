#!/bin/bash
# Fix Docker-created file permissions
# Issue: PERM-001-HIGH - Docker Root Ownership Blocks Local Tests

echo "🔧 Fixing file permissions after Docker tests..."

# Fix screenshots directory
if [ -d "cypress/screenshots" ]; then
    echo "   Fixing cypress/screenshots..."
    sudo chown -R $(whoami):$(whoami) cypress/screenshots 2>/dev/null || true
fi

# Fix videos directory
if [ -d "cypress/videos" ]; then
    echo "   Fixing cypress/videos..."
    sudo chown -R $(whoami):$(whoami) cypress/videos 2>/dev/null || true
fi

# Fix newman directory
if [ -d "newman" ]; then
    echo "   Fixing newman..."
    sudo chown -R $(whoami):$(whoami) newman 2>/dev/null || true
fi

echo "✅ Permissions fixed successfully"
