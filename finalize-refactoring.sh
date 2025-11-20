#!/bin/bash
# Finalize MainMenuController Refactoring
# This script completes the refactoring by removing the old file and renaming the new one

set -e  # Exit on error

REPO_DIR="/home/jdh/Desktop/g3-grc/galactic-ring-cannon"
cd "$REPO_DIR"

echo "🔍 Verifying files exist..."

if [ ! -f "src/ui/mainMenu/MainMenuController.refactored.js" ]; then
    echo "❌ Error: MainMenuController.refactored.js not found"
    exit 1
fi

if [ ! -f "src/ui/mainMenu/MainMenuController.original.js" ]; then
    echo "❌ Error: Backup file MainMenuController.original.js not found"
    exit 1
fi

echo "✅ Files verified"
echo ""
echo "📋 This script will:"
echo "   1. Remove src/ui/mainMenu/MainMenuController.js"
echo "   2. Rename MainMenuController.refactored.js → MainMenuController.js"
echo "   3. Update index.html script path"
echo "   4. Stage changes for git"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
fi

echo ""
echo "🗑️  Removing original MainMenuController.js..."
rm src/ui/mainMenu/MainMenuController.js

echo "📝 Renaming refactored file..."
mv src/ui/mainMenu/MainMenuController.refactored.js \
   src/ui/mainMenu/MainMenuController.js

echo "🔧 Updating index.html..."
sed -i 's/MainMenuController\.refactored\.js/MainMenuController.js/g' index.html

echo "📦 Staging changes for git..."
git add src/ui/mainMenu/
git add index.html

echo ""
echo "✅ Finalization complete!"
echo ""
echo "📊 Git status:"
git status --short
echo ""
echo "🎯 Next steps:"
echo "   1. Review changes: git diff --cached"
echo "   2. Test the game thoroughly"
echo "   3. Commit: git commit -m 'refactor: modularize MainMenuController'"
echo ""
echo "💡 Suggested commit message:"
echo "────────────────────────────────────────────────────────"
echo "refactor: modularize MainMenuController into focused components"
echo ""
echo "- Extract 1,677-line monolith into 7 focused modules"
echo "- Create PanelBase for shared panel functionality"
echo "- Separate CharacterSelector, ShopPanel, AchievementsPanel, SettingsPanel"
echo "- Extract MenuBackgroundRenderer for canvas rendering"
echo "- MainMenuController now orchestrates via composition"
echo "- Maintain 100% API compatibility"
echo "- Add comprehensive documentation"
echo "────────────────────────────────────────────────────────"
