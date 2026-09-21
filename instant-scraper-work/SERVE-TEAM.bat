@echo off
title Instant Scraper - TEAM SERVER
cd /d "%~dp0"

:: kill anything already on 3021
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3021 " ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul
timeout /t 1 /nobreak >nul

where node >nul 2>nul || (
  echo Node.js is required. https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing dependencies...
  call npm install --no-audit --no-fund
)

if not exist .next\BUILD_ID (
  echo Building production server, about a minute...
  call npx next build
)

echo Starting production server + public tunnel...
start /min "instant-scraper-server" cmd /c "npx next start -H 0.0.0.0 -p 3021"

echo Waiting for server...
set /a tries=0
:waitloop
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:3021/ 2>nul
if not errorlevel 1 goto tunnel
set /a tries+=1
if %tries% lss 40 goto waitloop
echo Server failed to start.
pause
exit /b 1

:tunnel
echo.
echo   Local:   http://localhost:3021
echo   LAN:     http://10.54.235.152:3021   (same WiFi)
echo   PUBLIC:  starting Cloudflare tunnel...
echo.
start /min "instant-scraper-tunnel" cmd /c "npx --yes cloudflared tunnel --url http://localhost:3021 2>&1 | findstr trycloudflare > TUNNEL-URL.txt"
timeout /t 15 /nobreak >nul
if exist TUNNEL-URL.txt type TUNNEL-URL.txt
echo.
echo   The public https://....trycloudflare.com URL is printed above and saved in TUNNEL-URL.txt
echo   Share it with your team. Stop both windows to shut it down.
echo.
start http://localhost:3021
timeout /t 5 >nul
