#!/bin/bash
set -e

echo "🚀 Starting deployment..."
echo "📁 Current directory: $(pwd)"

# Get current branch
BRANCH=$(git branch --show-current)
echo "🌿 Current branch: $BRANCH"

echo "📦 Pulling latest changes from branch: $BRANCH..."
git pull origin $BRANCH

echo "🐳 Stopping existing Docker container..."
docker stop education-app || true
docker rm education-app || true

echo "🏗️  Building Docker image..."
docker build -t education-app .

echo "▶️  Starting new container..."
docker run -d --name education-app -p 8000:8000 education-app

echo "✅ Deployment complete!"
echo "📊 Container status:"
docker ps --filter "name=education-app"

echo ""
echo "🌐 Application is available at: http://46.101.148.62:8000"
echo "📌 Deployed branch: $BRANCH"
echo ""