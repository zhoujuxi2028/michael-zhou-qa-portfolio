#!/bin/bash
# Validate development environment before running tests
# Prevents issues: ENV-001-CRITICAL, DEP-001-CRITICAL, PERM-001-HIGH

set -e

echo "🔍 Validating development environment..."
echo ""

# Check Node.js version (ENV-001)
if [ -f ".nvmrc" ]; then
    required_version=$(cat .nvmrc)
    current_version=$(node --version | sed 's/v//')

    if [ "$current_version" != "$required_version" ]; then
        echo "❌ Node.js version mismatch!"
        echo "   Required: $required_version"
        echo "   Current:  $current_version"
        echo "   Fix: nvm use $required_version"
        exit 1
    fi
    echo "✅ Node.js version: v$current_version"
else
    echo "⚠️  .nvmrc not found, skipping version check"
fi

# Check package-lock.json exists (DEP-001)
if [ ! -f "package-lock.json" ]; then
    echo "❌ package-lock.json is missing!"
    echo "   This causes non-deterministic installs"
    echo "   Fix: npm install && git add package-lock.json"
    exit 1
fi
echo "✅ package-lock.json exists"

# Check dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found"
    echo "   Run: npm install"
    exit 1
fi
echo "✅ node_modules exists"

# Check for permission issues (PERM-001)
permission_issues=false

if [ -d "cypress/screenshots" ]; then
    owner=$(stat -c '%U' cypress/screenshots 2>/dev/null || stat -f '%Su' cypress/screenshots 2>/dev/null || echo "$USER")
    if [ "$owner" != "$USER" ] && [ "$owner" != "$(whoami)" ]; then
        echo "⚠️  Permission issue detected in cypress/screenshots (owned by $owner)"
        permission_issues=true
    fi
fi

if [ -d "cypress/videos" ]; then
    owner=$(stat -c '%U' cypress/videos 2>/dev/null || stat -f '%Su' cypress/videos 2>/dev/null || echo "$USER")
    if [ "$owner" != "$USER" ] && [ "$owner" != "$(whoami)" ]; then
        echo "⚠️  Permission issue detected in cypress/videos (owned by $owner)"
        permission_issues=true
    fi
fi

if [ "$permission_issues" = true ]; then
    echo "   Fix: ./scripts/fix-permissions.sh"
    exit 1
fi
echo "✅ Permissions correct"

echo ""
echo "✨ All checks passed! Environment ready for testing."
echo ""
