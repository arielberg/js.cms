#!/bin/bash

# Migration script to split repository into cms-core and site repos
# Usage: ./migrate-to-submodule.sh <cms-core-repo-url>

set -e

CMS_CORE_REPO_URL="$1"

if [ -z "$CMS_CORE_REPO_URL" ]; then
    echo "Usage: $0 <cms-core-repo-url>"
    echo "Example: $0 https://github.com/username/cms-builder-core.git"
    exit 1
fi

echo "🚀 Starting repository migration..."
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if cms-core is already a submodule
if [ -f ".gitmodules" ] && grep -q "cms-core" .gitmodules; then
    echo "⚠️  Warning: cms-core appears to be already configured as a submodule"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if cms-core directory exists
CMS_CORE_EXISTS=0
if [ -d "cms-core" ]; then
    CMS_CORE_EXISTS=1
    echo "📋 Step 1: Creating backup of existing cms-core..."
    BACKUP_DIR="../cms-core-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r cms-core "$BACKUP_DIR"
    echo "✅ Backup created at: $BACKUP_DIR"
    echo ""
    
    echo "📋 Step 2: Removing cms-core from current repository..."
    # Remove from git but keep files
    git rm -r --cached cms-core 2>/dev/null || true
    echo "✅ cms-core removed from git tracking"
    echo ""
    
    echo "📋 Step 3: Removing cms-core directory..."
    rm -rf cms-core
    echo "✅ cms-core directory removed"
    echo ""
else
    echo "📋 Step 1: cms-core directory not found (will add as new submodule)"
    echo ""
fi

STEP_NUM=$((CMS_CORE_EXISTS ? 4 : 2))
echo "📋 Step $STEP_NUM: Setting up cms-core as submodule..."
# Add as submodule
if git submodule add "$CMS_CORE_REPO_URL" cms-core 2>&1; then
    echo "✅ cms-core added as submodule"
else
    echo ""
    echo "❌ Error: Failed to add cms-core as submodule"
    echo ""
    echo "Possible issues:"
    echo "  1. Repository doesn't exist yet - create it first at: $CMS_CORE_REPO_URL"
    echo "  2. SSH key not configured - check: ssh -T git@github.com"
    echo "  3. Repository is private and you don't have access"
    echo ""
    echo "To create the repository:"
    echo "  1. Go to https://github.com/new"
    echo "  2. Create a new repository (e.g., js.cms-core)"
    echo "  3. Don't initialize with README (we'll add cms-core content)"
    echo "  4. Run this script again"
    echo ""
    echo "Or if you want to push cms-core content first:"
    echo "  1. Create the repository on GitHub"
    echo "  2. See REPOSITORY_SPLIT.md for manual steps"
    exit 1
fi
echo ""

STEP_NUM=$((CMS_CORE_EXISTS ? 5 : 3))
echo "📋 Step $STEP_NUM: Creating config directory structure..."
# Create config directory if it doesn't exist
mkdir -p config

# Check if site-specific config exists in cms-core/config
if [ -d "cms-core/config" ]; then
    echo "📝 Note: Review cms-core/config/ files"
    echo "   Site-specific config should be in ./config/ (root level)"
    echo "   cms-core/config/ contains defaults"
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review and move site-specific config from cms-core/config/ to ./config/ if needed"
echo "   2. Test the admin panel: open cms-core/admin/index.html"
echo "   3. Commit changes: git add . && git commit -m 'Migrate to submodule structure'"
echo "   4. Push to remote: git push"
echo ""
echo "💡 To update cms-core later:"
echo "   cd cms-core && git pull && cd .. && git add cms-core && git commit -m 'Update cms-core'"
echo ""

