#!/bin/bash
set -e

echo "🚀 Starting PRODUCTION deployment..."

echo "📁 Current directory: $(pwd)"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found!"
  echo "Please create a .env file from .env.deployment template"
  exit 1
fi

echo "📦 Pulling latest changes from production branch..."
git pull origin production

echo "🐳 Stopping existing Docker containers..."
docker-compose -f docker-compose.production.yml down || true

echo "🏗️  Building Docker images..."
docker-compose -f docker-compose.production.yml build

echo "▶️  Starting containers..."
docker-compose -f docker-compose.production.yml up -d

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Production deployment complete!"
echo "📊 Container status:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🌐 Production application is available at:"
echo "   Frontend: http://YOUR_PRODUCTION_SERVER_IP:5001"
echo "   Backend API: http://YOUR_PRODUCTION_SERVER_IP:5000"
echo ""
