#!/bin/bash

# Whitelabel Reset Script
# This script resets the repository to a clean whitelabel state by:
# 1. Resetting all config files to defaults
# 2. Deleting all content items
# 3. Creating a commit with the changes

# Don't use set -e here as we want to handle errors gracefully

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONFIG_DIR="config"
CONTENT_DIRS=("post" "search")
BACKUP_DIR=".whitelabel-backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Whitelabel Reset Script                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
    echo -e "${YELLOW}The script will commit all changes as part of the whitelabel reset.${NC}"
    echo ""
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 1
    fi
fi

echo -e "${YELLOW}This script will:${NC}"
echo ""
echo "  1. Reset config files to whitelabel defaults:"
echo "     - config/appSettings.json → whitelabel (your-username, your-repo-name)"
echo "     - config/contentTypes.json → empty array []"
echo "     - config/modules.json → empty active/disabled"
echo "     - config/customPages.json → empty structure"
echo ""
echo "  2. Delete all content items:"
for dir in "${CONTENT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        count=$(find "$dir" -type f -name "*.json" 2>/dev/null | wc -l)
        echo "     - $dir/ ($count items)"
    fi
done

# Find other content type directories
for dir in */; do
    dir_name="${dir%/}"
    # Skip protected directories
    if [[ "$dir_name" =~ ^(config|cms-core|assets|localServer|site|\.git)$ ]] || [[ "$dir_name" =~ ^\.whitelabel-backup- ]]; then
        continue
    fi
    if [ -d "$dir_name" ]; then
        # Check if it looks like a content directory (has subdirectories with index.json)
        if find "$dir_name" -mindepth 2 -name "index.json" -type f 2>/dev/null | head -1 | grep -q .; then
            count=$(find "$dir_name" -type f -name "*.json" 2>/dev/null | wc -l)
            echo "     - $dir_name/ ($count items)"
        fi
    fi
done

echo ""
echo "  3. Create a commit: 'Reset to whitelabel state'"
echo ""

# Show what will be kept
echo -e "${GREEN}The following will be KEPT:${NC}"
echo "  - cms-core/ (submodule)"
echo "  - assets/ (site assets)"
echo "  - index.html (root page)"
echo "  - Documentation files"
echo ""

# Final confirmation
echo -e "${RED}⚠️  WARNING: This action cannot be undone!${NC}"
echo -e "${RED}All your content and configuration will be reset.${NC}"
echo ""
read -p "Type 'RESET' to confirm: " confirm

if [ "$confirm" != "RESET" ]; then
    echo -e "${YELLOW}Aborted. Nothing was changed.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting whitelabel reset...${NC}"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup config files
echo "📦 Creating backup..."
cp -r "$CONFIG_DIR" "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created in: $BACKUP_DIR${NC}"
echo ""

# Step 1: Reset config files
echo "📝 Resetting config files..."

# Reset appSettings.json to whitelabel
cat > "$CONFIG_DIR/appSettings.json" << 'EOF'
{
    "API_Gate": "GitHubAPI",
    "API_Params": [
        "your-username",
        "your-repo-name"
    ],
    "GIT_Account": "your-username",
    "GIT_Repository": "your-repo-name",
    "Lanugages": [
        "en"
    ],
    "LanugageLabels": {
        "en": "English"
    },
    "Admin_Lanaguage": "en",
    "Default_Language": "en",
    "Authentication_Mode": "token"
}
EOF

# Reset contentTypes.json to empty array
echo "[]" > "$CONFIG_DIR/contentTypes.json"

# Reset modules.json to empty
cat > "$CONFIG_DIR/modules.json" << 'EOF'
{
  "active": [],
  "disabled": []
}
EOF

# Reset customPages.json to empty structure
cat > "$CONFIG_DIR/customPages.json" << 'EOF'
{
    "en": [],
    "he": []
}
EOF

# Keep SEOFields.json and translations.json as they match defaults
# (They're already at default values)

echo -e "${GREEN}✓ Config files reset${NC}"
echo ""

# Step 2: Delete content directories
echo "🗑️  Deleting content items..."

for dir in "${CONTENT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        count=$(find "$dir" -type f -name "*.json" 2>/dev/null | wc -l)
        rm -rf "$dir"
        echo -e "${GREEN}✓ Deleted $dir/ ($count items)${NC}"
    else
        echo -e "${YELLOW}  $dir/ (not found, skipping)${NC}"
    fi
done

# Find and delete other content type directories
for dir in */; do
    dir_name="${dir%/}"
    # Skip protected directories
    if [[ "$dir_name" =~ ^(config|cms-core|assets|localServer|site|\.git)$ ]] || [[ "$dir_name" =~ ^\.whitelabel-backup- ]]; then
        continue
    fi
    if [ -d "$dir_name" ]; then
        # Check if it looks like a content directory (has subdirectories with index.json)
        if find "$dir_name" -mindepth 2 -name "index.json" -type f 2>/dev/null | head -1 | grep -q .; then
            rm -rf "$dir_name"
            echo -e "${GREEN}✓ Deleted $dir_name/${NC}"
        fi
    fi
done

echo -e "${GREEN}✓ Content items deleted${NC}"
echo ""

# Step 3: Stage all changes
echo "📋 Staging changes..."
git add -A

# Check if there are any changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  No changes to stage (repository may already be in whitelabel state)${NC}"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     No Changes Needed                                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "The repository appears to already be in whitelabel state."
    echo -e "${YELLOW}Backup saved in: $BACKUP_DIR${NC}"
    exit 0
fi

echo -e "${GREEN}✓ Changes staged${NC}"
echo ""

# Step 4: Show what will be committed
echo "📊 Changes summary:"
echo ""
git status --short
echo ""

# Step 5: Create commit
echo "💾 Creating commit..."
if git commit -m "Reset to whitelabel state

- Reset all config files to default whitelabel values
- Deleted all content items and content directories
- Site is now in clean whitelabel state ready for new configuration" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Commit created successfully${NC}"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     Whitelabel Reset Complete!                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the commit: git log -1"
    echo "  2. Push to remote: git push origin main"
    echo "  3. Run setup wizard to configure your site"
    echo ""
    echo -e "${YELLOW}Backup saved in: $BACKUP_DIR${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  No changes to commit (repository already in whitelabel state?)${NC}"
fi

