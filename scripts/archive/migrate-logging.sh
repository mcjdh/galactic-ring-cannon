#!/bin/bash
# Logging System Migration Script
# Migrates from dual logging systems (Logger.js + LoggerUtils.js + console.*) to unified window.logger

set -e

echo "🔧 Migrating Logging System to Unified window.logger..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup directory
BACKUP_DIR="./backup-logging-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in $BACKUP_DIR..."
# Backup all src files
cp -r src "$BACKUP_DIR/"
echo -e "${GREEN}✓${NC} Backup created"
echo ""

# Function to migrate a file
migrate_file() {
    local file="$1"
    local changes=0
    
    # Skip test files, debug scripts, and already migrated files
    if [[ "$file" == *"test"* ]] || [[ "$file" == *"Test"* ]] || \
       [[ "$file" == */debug/* ]] || [[ "$file" == */Logger.js ]] || \
       [[ "$file" == */LoggerUtils.js ]]; then
        return 0
    fi
    
    # Create temp file
    local temp_file="${file}.tmp"
    
    # Migrate window.LoggerUtils.* calls to window.logger.*
    if grep -q "window\.LoggerUtils\." "$file" 2>/dev/null; then
        sed -i.bak \
            -e 's/window\.LoggerUtils\.log(/window.logger.log(/g' \
            -e 's/window\.LoggerUtils\.warn(/window.logger.warn(/g' \
            -e 's/window\.LoggerUtils\.error(/window.logger.error(/g' \
            -e 's/window\.LoggerUtils\.info(/window.logger.info(/g' \
            -e 's/window\.LoggerUtils\.debug(/window.logger.log(/g' \
            "$file"
        ((changes++))
    fi
    
    # Migrate standalone console.log to window.logger.log (production code only)
    # BUT preserve debug-guarded console.logs and initialization messages
    if grep -E "^\s*console\.log\(" "$file" 2>/dev/null | grep -v "Debug mode" | grep -q .; then
        # Only migrate unguarded console.log calls
        sed -i.bak2 \
            -e '/if.*debug.*{/,/}/!s/^\(\s*\)console\.log(/\1window.logger.log(/g' \
            "$file"
        ((changes++))
    fi
    
    # Migrate console.warn to window.logger.warn
    if grep -q "console\.warn(" "$file" 2>/dev/null; then
        sed -i.bak3 's/console\.warn(/window.logger.warn(/g' "$file"
        ((changes++))
    fi
    
    # Migrate console.error to window.logger.error
    if grep -q "console\.error(" "$file" 2>/dev/null; then
        sed -i.bak4 's/console\.error(/window.logger.error(/g' "$file"
        ((changes++))
    fi
    
    # Clean up backup files
    rm -f "${file}.bak" "${file}.bak2" "${file}.bak3" "${file}.bak4"
    
    if [ $changes -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Migrated: $file ($changes pattern(s))"
    fi
}

# Export function for use in find -exec
export -f migrate_file
export GREEN YELLOW NC

echo "🔄 Migrating JavaScript files..."
echo ""

# Find and migrate all JS files in src/
find src -name "*.js" -type f | while read -r file; do
    migrate_file "$file"
done

echo ""
echo -e "${GREEN}✓${NC} Migration complete!"
echo ""
echo "📊 Summary:"
echo "  - Migrated window.LoggerUtils.* → window.logger.*"
echo "  - Migrated console.log → window.logger.log"
echo "  - Migrated console.warn → window.logger.warn"
echo "  - Migrated console.error → window.logger.error"
echo ""
echo "  Backup stored in: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "  1. Test the game to ensure logging works correctly"
echo "  2. Check console for any deprecation warnings"
echo "  3. Remove LoggerUtils.js in a future cleanup (after confirming stability)"
echo ""
