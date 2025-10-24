<#
.SYNOPSIS
    Deployment script for Homeschool Exam System

.DESCRIPTION
    This PowerShell script orchestrates the build and deployment of the Homeschool Exam System
    to DigitalOcean droplets. It builds Docker images, pushes to registry, and deploys via SSH.

.PARAMETER Environment
    Target environment: Development, Staging, or Production

.PARAMETER Tag
    Docker image tag (default: git commit SHA)

.PARAMETER DropletHost
    IP address or hostname of the DigitalOcean droplet

.PARAMETER User
    SSH user for the droplet (default: root)

.PARAMETER ComposeFile
    Docker compose file to use on the server (default: docker-compose.{environment}.yml)

.PARAMETER SkipBuild
    Skip building images (only deploy existing images)

.PARAMETER SkipPush
    Skip pushing images to registry (for local testing)

.EXAMPLE
    .\deploy.ps1 -Environment Production -DropletHost 192.168.1.100

.EXAMPLE
    .\deploy.ps1 -Environment Staging -Tag v1.2.3 -User admin

.NOTES
    Author: Homeschool Exam System Team
    Requires: Docker, Docker Compose, SSH access to droplet
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Development", "Staging", "Production")]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [string]$Tag,

    [Parameter(Mandatory=$false)]
    [string]$DropletHost,

    [Parameter(Mandatory=$false)]
    [string]$User = "root",

    [Parameter(Mandatory=$false)]
    [string]$ComposeFile,

    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory=$false)]
    [switch]$SkipPush,

    [Parameter(Mandatory=$false)]
    [string]$Registry = "registry.digitalocean.com/homeschool-registry",

    [Parameter(Mandatory=$false)]
    [switch]$HealthCheck
)

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Step { param($Message) Write-Host "`n🔹 $Message" -ForegroundColor Blue }

# Error handling
$ErrorActionPreference = "Stop"
trap {
    Write-Error "Deployment failed: $_"
    exit 1
}

# Start deployment
Write-Host "`n🚀 Starting Homeschool Exam System Deployment" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# 1. Validate prerequisites
Write-Step "Validating prerequisites..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or not in PATH"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not in PATH"
}

Write-Success "Prerequisites validated"

# 2. Resolve version/tag
Write-Step "Resolving version tag..."

if (-not $Tag) {
    try {
        $Tag = (git rev-parse --short HEAD).Trim()
        Write-Info "Using git commit SHA as tag: $Tag"
    } catch {
        Write-Warning "Could not get git commit SHA, using 'latest'"
        $Tag = "latest"
    }
}

Write-Success "Version tag: $Tag"

# 3. Set environment-specific variables
Write-Step "Configuring environment: $Environment"

$EnvLower = $Environment.ToLower()

if (-not $ComposeFile) {
    if ($Environment -eq "Development") {
        $ComposeFile = "docker-compose.yml"
    } else {
        $ComposeFile = "docker-compose.$EnvLower.yml"
    }
}

if (-not $DropletHost -and $Environment -ne "Development") {
    # Try to get from environment variables
    $DropletHost = [Environment]::GetEnvironmentVariable("${Environment}_SERVER_IP")
    if (-not $DropletHost) {
        throw "DropletHost is required for $Environment environment. Set it via -DropletHost parameter or ${Environment}_SERVER_IP environment variable"
    }
}

# Image names
$BackendImage = "$Registry/homeschool-backend:$Tag"
$FrontendImage = "$Registry/homeschool-frontend:$Tag"

Write-Info "Backend image: $BackendImage"
Write-Info "Frontend image: $FrontendImage"
Write-Info "Compose file: $ComposeFile"
if ($DropletHost) {
    Write-Info "Target server: $User@$DropletHost"
}

# 4. Build images
if (-not $SkipBuild) {
    Write-Step "Building Docker images..."

    # Build backend
    Write-Info "Building backend image..."
    Push-Location backend
    try {
        docker build -t $BackendImage .
        if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
        Write-Success "Backend image built successfully"
    } finally {
        Pop-Location
    }

    # Build frontend
    Write-Info "Building frontend image..."
    Push-Location frontend
    try {
        # Get API URL from environment or use default
        $ViteApiUrl = [Environment]::GetEnvironmentVariable("VITE_API_URL")
        if (-not $ViteApiUrl) {
            if ($DropletHost) {
                $ViteApiUrl = "http://${DropletHost}:5004/api"
            } else {
                $ViteApiUrl = "http://localhost:5000/api"
            }
        }

        Write-Info "Building with VITE_API_URL=$ViteApiUrl"
        docker build --build-arg VITE_API_URL=$ViteApiUrl -t $FrontendImage .
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
        Write-Success "Frontend image built successfully"
    } finally {
        Pop-Location
    }

    Write-Success "All images built successfully"
} else {
    Write-Warning "Skipping image build (SkipBuild flag set)"
}

# 5. Push images to registry
if (-not $SkipPush -and $Environment -ne "Development") {
    Write-Step "Pushing images to registry..."

    Write-Info "Logging in to registry..."
    # Try to login (assumes docker login was done previously or via CI)
    # docker login $Registry

    Write-Info "Pushing backend image..."
    docker push $BackendImage
    if ($LASTEXITCODE -ne 0) { throw "Failed to push backend image" }
    Write-Success "Backend image pushed"

    Write-Info "Pushing frontend image..."
    docker push $FrontendImage
    if ($LASTEXITCODE -ne 0) { throw "Failed to push frontend image" }
    Write-Success "Frontend image pushed"

    Write-Success "All images pushed to registry"
} else {
    Write-Warning "Skipping image push (SkipPush flag or Development environment)"
}

# 6. Deploy to server
if ($Environment -ne "Development" -and $DropletHost) {
    Write-Step "Deploying to $Environment server..."

    # Create deployment commands
    $DeployCommands = @"
cd /opt/homeschool-app-$EnvLower || exit 1
echo '📁 Current directory: \$(pwd)'

echo '📦 Pulling latest changes...'
git fetch origin
git checkout $EnvLower
git pull origin $EnvLower

echo '🐳 Pulling latest Docker images...'
docker-compose -f $ComposeFile pull

echo '🛑 Stopping existing containers...'
docker-compose -f $ComposeFile down || true

echo '▶️  Starting containers...'
docker-compose -f $ComposeFile up -d

echo '🧹 Cleaning up old images...'
docker image prune -f

echo '✅ Deployment complete!'
echo '📊 Container status:'
docker-compose -f $ComposeFile ps

echo ''
echo '🌐 Application URLs:'
echo '   Frontend: http://${DropletHost}:5005'
echo '   Backend API: http://${DropletHost}:5004'
echo ''
"@

    Write-Info "Connecting to server via SSH..."

    # Execute deployment via SSH
    $DeployCommands | ssh "${User}@${DropletHost}" "bash -s"

    if ($LASTEXITCODE -ne 0) {
        throw "Deployment to server failed"
    }

    Write-Success "Deployment to $Environment completed successfully"

    # 7. Health check
    if ($HealthCheck) {
        Write-Step "Running health checks..."

        Start-Sleep -Seconds 5  # Wait for containers to start

        try {
            $BackendHealth = Invoke-WebRequest -Uri "http://${DropletHost}:5004/health" -TimeoutSec 10 -UseBasicParsing
            if ($BackendHealth.StatusCode -eq 200) {
                Write-Success "Backend health check passed"
            } else {
                Write-Warning "Backend health check returned status: $($BackendHealth.StatusCode)"
            }
        } catch {
            Write-Warning "Backend health check failed: $_"
        }

        try {
            $FrontendHealth = Invoke-WebRequest -Uri "http://${DropletHost}:5005" -TimeoutSec 10 -UseBasicParsing
            if ($FrontendHealth.StatusCode -eq 200) {
                Write-Success "Frontend health check passed"
            } else {
                Write-Warning "Frontend health check returned status: $($FrontendHealth.StatusCode)"
            }
        } catch {
            Write-Warning "Frontend health check failed: $_"
        }
    }

} elseif ($Environment -eq "Development") {
    Write-Step "Starting local development environment..."

    Write-Info "Starting containers with docker-compose..."
    docker-compose -f $ComposeFile up -d

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start development containers"
    }

    Write-Success "Development environment started"
    Write-Info "Frontend: http://localhost:5001"
    Write-Info "Backend API: http://localhost:5000"
    Write-Info "`nView logs with: docker-compose logs -f"
}

# 8. Summary
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Success "Deployment completed successfully!"
Write-Host "============================================`n" -ForegroundColor Magenta

Write-Info "Summary:"
Write-Host "  Environment: $Environment"
Write-Host "  Tag: $Tag"
Write-Host "  Backend Image: $BackendImage"
Write-Host "  Frontend Image: $FrontendImage"
if ($DropletHost) {
    Write-Host "  Server: $User@$DropletHost"
    Write-Host "  Frontend URL: http://${DropletHost}:5005"
    Write-Host "  Backend URL: http://${DropletHost}:5004"
}

Write-Host "`n"

exit 0
