#!/bin/bash

# Auto-commit script for EchoMail
# This script commits changes in relevant parts and then deletes itself

cd /home/Adi/Projects/EchoMail

echo "🔍 Checking for changes..."

# Function to commit a group of files with a message
commit_group() {
    local message="$1"
    shift
    local files=("$@")
    
    # Check if any of the files have changes
    local has_changes=false
    for file in "${files[@]}"; do
        if git diff --quiet "$file" 2>/dev/null || git diff --cached --quiet "$file" 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard "$file" 2>/dev/null)" ]; then
            if ! git diff --quiet "$file" 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard "$file" 2>/dev/null)" ]; then
                has_changes=true
                break
            fi
        fi
    done
    
    if [ "$has_changes" = true ]; then
        git add "${files[@]}" 2>/dev/null
        if ! git diff --cached --quiet; then
            git commit -m "$message"
            echo "✅ Committed: $message"
        fi
    fi
}

# Commit API routes
commit_group "feat(api): update API routes" \
    "app/api/"

# Commit components
commit_group "feat(components): update UI components" \
    "components/"

# Commit hooks
commit_group "feat(hooks): update custom hooks" \
    "hooks/"

# Commit lib/utilities
commit_group "feat(lib): update utility functions" \
    "lib/"

# Commit types
commit_group "feat(types): update type definitions" \
    "types/"

# Commit pages/app routes
commit_group "feat(pages): update app pages" \
    "app/page.tsx" \
    "app/layout.tsx" \
    "app/globals.css" \
    "app/providers.tsx" \
    "app/analytics/" \
    "app/auth/" \
    "app/auth-test/" \
    "app/compose/" \
    "app/contacts/" \
    "app/dashboard/" \
    "app/debug/" \
    "app/debug-campaigns/" \
    "app/env-check/" \
    "app/firebase-test/" \
    "app/privacy/" \
    "app/realtime-send/" \
    "app/test/" \
    "app/test-auth/" \
    "app/test-email/" \
    "app/test-email-delivery/" \
    "app/test-formatting/" \
    "app/tos/"

# Commit config files
commit_group "chore(config): update configuration files" \
    "package.json" \
    "package-lock.json" \
    "bun.lockb" \
    "tsconfig.json" \
    "next.config.mjs" \
    "tailwind.config.ts" \
    "postcss.config.mjs" \
    "components.json" \
    "vercel.json" \
    "middleware.ts"

# Commit test files
commit_group "test: update test files" \
    "test-*.js" \
    "test-*.ts" \
    "debug-*.js"

# Commit documentation
commit_group "docs: update documentation" \
    "README.md" \
    "todo.md"

# Commit styles
commit_group "style: update styles" \
    "styles/" \
    "public/"

# Commit any remaining files
git add -A
if ! git diff --cached --quiet; then
    git commit -m "chore: miscellaneous updates"
    echo "✅ Committed: miscellaneous updates"
fi

# Push to GitHub
echo ""
echo "🚀 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "❌ Failed to push. Please check your connection or credentials."
fi

# Delete this script
echo ""
echo "🗑️  Cleaning up..."
rm -- "$0"
echo "✅ Script deleted."

echo ""
echo "🎉 Done!"
