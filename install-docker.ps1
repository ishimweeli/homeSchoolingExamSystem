# PowerShell script to install Docker Desktop
# Run this script as Administrator

Write-Host "Installing Docker Desktop for Windows..." -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires Administrator privileges. Please run PowerShell as Administrator." -ForegroundColor Red
    exit 1
}

# Try winget first
try {
    Write-Host "Attempting to install via winget..." -ForegroundColor Yellow
    winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    Write-Host "Docker Desktop installed successfully via winget!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Winget installation failed, trying Chocolatey..." -ForegroundColor Yellow
}

# Try Chocolatey
try {
    # Check if Chocolatey is installed
    choco --version | Out-Null
    Write-Host "Installing Docker Desktop via Chocolatey..." -ForegroundColor Yellow
    choco install docker-desktop -y
    Write-Host "Docker Desktop installed successfully via Chocolatey!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "Chocolatey installation failed or not available." -ForegroundColor Yellow
}

# Manual download instructions
Write-Host @"
Automatic installation failed. Please install Docker Desktop manually:

1. Visit: https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Windows
3. Run the installer as Administrator
4. Enable WSL 2 integration when prompted
5. Restart your computer after installation
6. Launch Docker Desktop and complete the setup

After installation, run 'docker --version' to verify the installation.
"@ -ForegroundColor Cyan