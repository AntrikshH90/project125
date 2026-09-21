@echo off
title Stop Instant Scraper
echo Stopping Instant Scraper server...
set "found="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3021 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>nul && set "found=1"
)
if defined found (
  echo Stopped.
) else (
  echo Server was not running.
)
timeout /t 2 >nul
