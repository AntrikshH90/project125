@echo off
title Instant Scraper
cd /d "%~dp0"

:: already running? just open the browser
curl -s -o nul http://localhost:3021/ 2>nul
if not errorlevel 1 (
  start http://localhost:3021
  exit /b 0
)

where node >nul 2>nul || (
  echo Node.js is required but not installed. https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing dependencies, about a minute...
  call npm install --no-audit --no-fund
)

echo Starting Instant Scraper server...
start /min "instant-scraper-server" cmd /c "npx next dev --turbopack -p 3021"

echo Waiting for server...
set /a tries=0
:waitloop
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:3021/ 2>nul
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% lss 40 goto waitloop
echo Server took too long to start. Try running:
echo    npx next dev --turbopack -p 3021
pause
exit /b 1

:ready
start http://localhost:3021
echo.
echo   Instant Scraper is running at http://localhost:3021
echo   Files download to the downloads\ folder next to this script.
echo   To stop the server, run STOP-SCRAPER.bat
echo.
timeout /t 4 >nul
