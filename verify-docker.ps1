# Script to verify Docker installation and test the home schooling system

Write-Host "Verifying Docker installation..." -ForegroundColor Green

# Check Docker version
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop first using install-docker.ps1" -ForegroundColor Yellow
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose is available: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available" -ForegroundColor Red
    exit 1
}

# Check if Docker daemon is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Docker is ready! You can now run:" -ForegroundColor Cyan
Write-Host "  npm run docker:up     - Start the application with database" -ForegroundColor White
Write-Host "  npm run docker:logs   - View application logs" -ForegroundColor White
Write-Host "  npm run docker:down   - Stop the application" -ForegroundColor White