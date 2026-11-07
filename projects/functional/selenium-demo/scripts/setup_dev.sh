#!/bin/bash
# setup_dev.sh - Development environment setup
#
# This script sets up the development environment for the IWSVA Selenium tests.
# It installs dependencies, creates necessary directories, and configures the environment.

set -e  # Exit on error

echo "🚀 Setting up development environment for IWSVA Selenium Tests..."
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check Python version
echo "📌 Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Python version: $python_version"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "   ✅ Virtual environment created"
else
    echo "   ℹ️  Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "⬆️  Upgrading pip..."
pip install --upgrade pip -q

# Install package in editable mode
echo ""
echo "📦 Installing package in editable mode..."
pip install -e . -q
echo "   ✅ Package installed"

# Install dev dependencies
echo ""
echo "📦 Installing development dependencies..."
pip install -e ".[dev]" -q
echo "   ✅ Dev dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo ""
        echo "⚙️  Creating .env file from .env.example..."
        cp .env.example .env
        echo "   ✅ .env file created - please configure it with your credentials"
        echo "   📝 Edit .env and add your IWSVA credentials and settings"
    else
        echo ""
        echo "⚠️  Warning: .env.example not found, cannot create .env file"
    fi
else
    echo ""
    echo "   ℹ️  .env file already exists"
fi

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p outputs/{logs,screenshots,reports,videos,debug}
mkdir -p logs/archive
echo "   ✅ Directories created"

# Display next steps
echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next steps:"
echo "   1. Configure .env file with your IWSVA credentials"
echo "   2. Activate virtual environment: source venv/bin/activate"
echo "   3. Verify installation: pytest --version"
echo "   4. Test collection: pytest --collect-only"
echo "   5. Run a demo test: pytest tests/dev/demo_test.py -v"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
