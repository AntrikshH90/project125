@echo off
title Resume Adjuster
cd /d %~dp0
echo Starting Resume Adjuster on http://localhost:4173 ...
echo Close this window to stop the server.
echo.
if not exist node_modules (
  echo Installing dependencies (first run only)...
  call npm install
)
call node server.js
pause
