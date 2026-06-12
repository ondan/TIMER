#!/bin/bash

# Render.com Deployment Setup Script
# This script prepares your project for deployment to Render.com

echo "🚀 Preparing project for Render.com deployment..."

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Please initialize git first."
    exit 1
fi

# Check if render.yaml exists
if [ ! -f render.yaml ]; then
    echo "❌ Error: render.yaml not found. Please run the setup first."
    exit 1
fi

# Test builds
echo "🔨 Testing server build..."
cd server
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Server build failed. Please fix the errors first."
    exit 1
fi
cd ..

echo "🔨 Testing web build..."
cd web
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Web build failed. Please fix the errors first."
    exit 1
fi
cd ..

# Git operations
echo "📦 Preparing git repository..."
git add .
git status

read -p "Enter commit message: " message
git commit -m "$message"

echo "🔄 Do you want to push to GitHub? (y/n)"
read -p "> " answer
if [ "$answer" = "y" ]; then
    git push origin main
    echo "✅ Code pushed to GitHub!"
    echo ""
    echo "🎉 Next steps:"
    echo "1. Go to Render.com dashboard"
    echo "2. Click 'New +' → 'Blueprint'"
    echo "3. Connect your GitHub repository"
    echo "4. Configure environment variables as described in DEPLOYMENT.md"
    echo "5. Deploy!"
else
    echo "✅ Changes committed but not pushed."
    echo "Push manually when ready: git push origin main"
fi

echo ""
echo "📋 Don't forget to:"
echo "   - Set CORS_ORIGIN on the server"
echo "   - Set NEXT_PUBLIC_API_URL on the web app"
echo "   - See DEPLOYMENT.md for detailed instructions"