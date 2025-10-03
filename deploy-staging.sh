#!/bin/bash
set -e

echo "🚀 Starting STAGING deployment..."

echo "📁 Current directory: $(pwd)"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  echo "Please create a .env file from .env.deployment template"
  exit 1
fi

echo "📦 Pulling latest changes from staging branch..."
git pull origin staging

echo "🐳 Stopping existing Docker containers..."
docker-compose -f docker-compose.staging.yml down || true

echo "🏗️  Building Docker images..."
docker-compose -f docker-compose.staging.yml build

echo "▶️  Starting containers..."
docker-compose -f docker-compose.staging.yml up -d

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Staging deployment complete!"
echo "📊 Container status:"
docker-compose -f docker-compose.staging.yml ps

echo ""
echo "🌐 Staging application is available at:"
echo "   Frontend: http://YOUR_STAGING_SERVER_IP:5001"
echo "   Backend API: http://YOUR_STAGING_SERVER_IP:5000"
echo ""
