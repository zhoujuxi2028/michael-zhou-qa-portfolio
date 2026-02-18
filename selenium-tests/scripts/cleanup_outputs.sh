#!/bin/bash
# cleanup_outputs.sh - Automated output cleanup
#
# This script cleans up old test outputs, logs, and temporary files
# to keep the project directory tidy and manageable.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🧹 Cleaning up test outputs..."

# Create archive directories if they don't exist
mkdir -p logs/archive
mkdir -p outputs/screenshots/archive

# Archive old logs (keep last 7 days)
echo "📝 Archiving logs older than 7 days..."
find outputs/logs -name "test_*.log" -mtime +7 -exec mv {} logs/archive/ \; 2>/dev/null

# Archive old screenshots (keep last 14 days)
echo "📷 Archiving screenshots older than 14 days..."
find outputs/screenshots -name "*.png" -mtime +14 -exec mv {} outputs/screenshots/archive/ \; 2>/dev/null

# Clean allure results older than 30 days
echo "📊 Removing allure results older than 30 days..."
find outputs/allure-results -name "*.json" -mtime +30 -delete 2>/dev/null
find outputs/allure-results -name "*.txt" -mtime +30 -delete 2>/dev/null

# Remove all __pycache__ directories
echo "🗑️  Removing __pycache__ directories..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# Remove .pyc files
echo "🗑️  Removing .pyc files..."
find . -type f -name "*.pyc" -delete 2>/dev/null

# Remove .pytest_cache
echo "🗑️  Removing pytest cache..."
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null

echo "✅ Cleanup complete!"
echo ""
echo "Summary:"
echo "  - Logs older than 7 days archived to logs/archive/"
echo "  - Screenshots older than 14 days archived to outputs/screenshots/archive/"
echo "  - Allure results older than 30 days removed"
echo "  - All __pycache__ and .pyc files removed"
