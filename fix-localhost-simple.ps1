# Simple localhost bypass configuration for Check Point VPN
# Run as Administrator in PowerShell

Write-Host "`nConfiguring Windows to allow ALL localhost connections..." -ForegroundColor Green

# Set SYSTEM environment variables (requires Admin)
Write-Host "`nSetting system environment variables..." -ForegroundColor Yellow
try {
    [Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1,::1,0.0.0.0,*.local", "Machine")
    [Environment]::SetEnvironmentVariable("no_proxy", "localhost,127.0.0.1,::1,0.0.0.0,*.local", "Machine")
    Write-Host "✓ System variables set successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Could not set system variables (need Admin rights)" -ForegroundColor Red
}

# Set USER environment variables (always works)
Write-Host "`nSetting user environment variables..." -ForegroundColor Yellow
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1,::1,0.0.0.0,*.local", "User")
[Environment]::SetEnvironmentVariable("no_proxy", "localhost,127.0.0.1,::1,0.0.0.0,*.local", "User")
Write-Host "✓ User variables set successfully" -ForegroundColor Green

# Configure Windows Firewall
Write-Host "`nConfiguring Windows Firewall..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Allow All Localhost" -Direction Inbound -LocalAddress 127.0.0.1,::1 -Action Allow -ErrorAction Stop | Out-Null
    Write-Host "✓ Firewall rules added" -ForegroundColor Green
} catch {
    Write-Host "✓ Firewall rules already exist or no permission" -ForegroundColor Yellow
}

# Set Internet Explorer/Edge proxy bypass
Write-Host "`nConfiguring browser proxy settings..." -ForegroundColor Yellow
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
Set-ItemProperty -Path $regPath -Name "ProxyOverride" -Value "<local>;localhost;127.0.0.1;*.local" -ErrorAction SilentlyContinue
Write-Host "✓ Browser settings configured" -ForegroundColor Green

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "`nIMPORTANT: Please do the following:" -ForegroundColor Yellow
Write-Host "1. Close and restart ALL browsers" -ForegroundColor White
Write-Host "2. Close and restart VS Code/Terminal" -ForegroundColor White
Write-Host "3. Your localhost URLs should now work:" -ForegroundColor White
Write-Host "   - http://localhost:3001" -ForegroundColor Cyan
Write-Host "   - http://127.0.0.1:3001" -ForegroundColor Cyan
Write-Host "   - http://localhost:2000 (any port)" -ForegroundColor Cyan
Write-Host "`n4. If still blocked, restart Windows" -ForegroundColor Yellow

Write-Host "`nPress Enter to exit..."
Read-Host