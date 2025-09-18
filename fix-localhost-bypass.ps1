# Run this script as Administrator to bypass Check Point VPN for BOTH localhost AND 127.0.0.1
# Right-click and select "Run with PowerShell" or run from elevated PowerShell

Write-Host "Configuring Windows to bypass VPN for BOTH localhost AND 127.0.0.1..." -ForegroundColor Green

# Set Windows HTTP proxy bypass list - ALL localhost with ANY PORT
# First check if proxy is set, then configure bypass list
$currentProxy = netsh winhttp show proxy
if ($currentProxy -match "Direct access") {
    Write-Host "No proxy configured, skipping netsh bypass configuration" -ForegroundColor Yellow
} else {
    # Get current proxy server if exists
    netsh winhttp set proxy proxy-server="http=proxy:8080;https=proxy:8080" bypass-list="<local>;localhost;127.0.0.1;*.local;0.0.0.0"
}

# Set SYSTEM-WIDE environment variables for ALL localhost connections on ALL PORTS
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1,::1,[::1],0.0.0.0,*.local,*.localhost,localhost:*,127.0.0.1:*", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("no_proxy", "localhost,127.0.0.1,::1,[::1],0.0.0.0,*.local,*.localhost,localhost:*,127.0.0.1:*", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("HTTP_PROXY", "", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("http_proxy", "", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("https_proxy", "", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("ALL_PROXY", "", [EnvironmentVariableTarget]::Machine)
[Environment]::SetEnvironmentVariable("all_proxy", "", [EnvironmentVariableTarget]::Machine)

# Also set user environment variables for current user - ALL PORTS
[Environment]::SetEnvironmentVariable("NO_PROXY", "localhost,127.0.0.1,::1,[::1],0.0.0.0,*.local,*.localhost,localhost:*,127.0.0.1:*", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("no_proxy", "localhost,127.0.0.1,::1,[::1],0.0.0.0,*.local,*.localhost,localhost:*,127.0.0.1:*", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("HTTP_PROXY", "", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("http_proxy", "", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", "", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("https_proxy", "", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("ALL_PROXY", "", [EnvironmentVariableTarget]::User)
[Environment]::SetEnvironmentVariable("all_proxy", "", [EnvironmentVariableTarget]::User)

# Configure Internet Explorer/Edge proxy settings for ALL localhost ports
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
Set-ItemProperty -Path $regPath -Name "ProxyOverride" -Value "localhost*;127.0.0.1*;[::1]*;*.local;0.0.0.0;<local>;*.localhost"

# Add localhost to Windows Defender firewall exceptions - ALL PORTS
New-NetFirewallRule -DisplayName "Allow ALL Localhost Traffic" -Direction Inbound -LocalAddress 127.0.0.1 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Allow ALL Localhost IPv6 Traffic" -Direction Inbound -LocalAddress ::1 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Allow Localhost All Ports" -Direction Inbound -Protocol TCP -LocalAddress 127.0.0.1 -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Allow Localhost All UDP Ports" -Direction Inbound -Protocol UDP -LocalAddress 127.0.0.1 -Action Allow -ErrorAction SilentlyContinue

Write-Host "Configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Please do the following:" -ForegroundColor Yellow
Write-Host "1. Restart your browser"
Write-Host "2. Restart your terminal/VS Code"
Write-Host "3. Try accessing http://127.0.0.1:3001 instead of localhost:3001"
Write-Host ""
Write-Host "If still blocked, restart your computer for all changes to take effect." -ForegroundColor Cyan

Read-Host "Press Enter to exit"