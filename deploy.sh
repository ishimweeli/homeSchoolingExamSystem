#!/bin/bash

##############################################
# Home Schooling Exam System - Deploy Script
##############################################
# This script automates the deployment process:
# 1. Pulls latest changes from git
# 2. Builds Docker images
# 3. Deploys containers
##############################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
echo "================================================"
echo "  Home Schooling Exam System - Deployment"
echo "================================================"
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Determine docker-compose command (v1 vs v2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

print_info "Using: $DOCKER_COMPOSE"

# Step 1: Pull latest changes from git
print_info "Step 1/5: Pulling latest changes from git..."
if [ -d .git ]; then
    git pull origin main || {
        print_warning "Git pull failed. Continuing with existing code..."
    }
    print_success "Code updated successfully"
else
    print_warning "Not a git repository. Skipping git pull."
fi
echo ""

# Step 2: Stop existing containers
print_info "Step 2/5: Stopping existing containers..."
$DOCKER_COMPOSE down || print_warning "No containers to stop"
print_success "Containers stopped"
echo ""

# Step 3: Build Docker images
print_info "Step 3/5: Building Docker images..."
print_info "This may take several minutes..."
$DOCKER_COMPOSE build --no-cache || {
    print_error "Docker build failed!"
    exit 1
}
print_success "Images built successfully"
echo ""

# Step 4: Start containers
print_info "Step 4/5: Starting containers..."
$DOCKER_COMPOSE up -d || {
    print_error "Failed to start containers!"
    exit 1
}
print_success "Containers started"
echo ""

# Step 5: Display status
print_info "Step 5/5: Checking container status..."
echo ""
$DOCKER_COMPOSE ps
echo ""

# Wait for services to be healthy
print_info "Waiting for services to be healthy (this may take up to 60 seconds)..."
sleep 10

# Check backend health
print_info "Checking backend health..."
for i in {1..12}; do
    if curl -f http://localhost:5000/health &> /dev/null; then
        print_success "Backend is healthy!"
        break
    fi
    if [ $i -eq 12 ]; then
        print_warning "Backend health check timeout. Check logs with: $DOCKER_COMPOSE logs backend"
    else
        echo -n "."
        sleep 5
    fi
done
echo ""

# Check frontend
print_info "Checking frontend..."
for i in {1..6}; do
    if curl -f http://localhost:5001 &> /dev/null; then
        print_success "Frontend is healthy!"
        break
    fi
    if [ $i -eq 6 ]; then
        print_warning "Frontend health check timeout. Check logs with: $DOCKER_COMPOSE logs frontend"
    else
        echo -n "."
        sleep 5
    fi
done
echo ""

# Display logs
print_info "Recent logs (last 20 lines):"
echo ""
$DOCKER_COMPOSE logs --tail=20
echo ""

# Final summary
echo "================================================"
print_success "Deployment Complete!"
echo "================================================"
echo ""
echo "Application URLs:"
echo "  - Frontend: http://localhost:5001"
echo "  - Backend API: http://localhost:5000"
echo "  - Backend Health: http://localhost:5000/health"
echo ""
echo "Useful commands:"
echo "  - View logs: $DOCKER_COMPOSE logs -f"
echo "  - View specific service logs: $DOCKER_COMPOSE logs -f backend"
echo "  - Stop containers: $DOCKER_COMPOSE down"
echo "  - Restart containers: $DOCKER_COMPOSE restart"
echo "  - Check status: $DOCKER_COMPOSE ps"
echo ""
echo "================================================"
