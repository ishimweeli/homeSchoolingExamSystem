# PowerShell Script to Generate Secrets for GitHub Actions
# Run this in PowerShell on Windows

Write-Host "🔐 Generating Secrets for GitHub Actions Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate random string
function Get-RandomString {
    param([int]$Length = 64)
    -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $Length | ForEach-Object {[char]$_})
}

# Generate JWT secrets
$jwtSecret = Get-RandomString
$jwtRefreshSecret = Get-RandomString

Write-Host "✅ Generated Secrets:" -ForegroundColor Green
Write-Host ""

Write-Host "JWT_SECRET:" -ForegroundColor Yellow
Write-Host $jwtSecret
Write-Host ""

Write-Host "JWT_REFRESH_SECRET:" -ForegroundColor Yellow
Write-Host $jwtRefreshSecret
Write-Host ""

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📋 Copy these values to GitHub Secrets" -ForegroundColor Cyan
Write-Host ""

# Optionally copy to clipboard
Write-Host "💡 Tip: These secrets are now displayed above." -ForegroundColor Cyan
Write-Host "   Copy them one by one to GitHub Actions secrets." -ForegroundColor Cyan
Write-Host ""

# Read SSH private key
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "🔑 SSH Private Key Location:" -ForegroundColor Green
$sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
if (Test-Path $sshKeyPath) {
    Write-Host "   Found at: $sshKeyPath" -ForegroundColor White
    Write-Host ""
    Write-Host "To copy SSH private key to clipboard, run:" -ForegroundColor Yellow
    Write-Host "   Get-Content $sshKeyPath | Set-Clipboard" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "   ⚠️  Not found at: $sshKeyPath" -ForegroundColor Red
    Write-Host "   Please locate your SSH private key manually." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📝 Summary - Add these to GitHub Secrets:" -ForegroundColor Green
Write-Host ""
Write-Host "1. SSH_PRIVATE_KEY        → (Copy from: $sshKeyPath)" -ForegroundColor White
Write-Host "2. SSH_PASSPHRASE         → Paccy@123" -ForegroundColor White
Write-Host "3. SERVER_USER            → root" -ForegroundColor White
Write-Host "4. SERVER_IP              → 46.101.148.62" -ForegroundColor White
Write-Host "5. JWT_SECRET             → (Generated above)" -ForegroundColor White
Write-Host "6. JWT_REFRESH_SECRET     → (Generated above)" -ForegroundColor White
Write-Host "7. OPENROUTER_API_KEY     → (From your backend/.env file)" -ForegroundColor White
Write-Host "8. AI_MODEL               → openai/gpt-4o-mini" -ForegroundColor White
Write-Host "9. SITE_NAME              → Homeschool Exam System Staging" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Go to: https://github.com/ishimweeli/homeSchoolingExamSystem/settings/secrets/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Done! Add these secrets to GitHub, then re-run the deployment." -ForegroundColor Green

