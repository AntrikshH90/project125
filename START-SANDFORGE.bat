@echo off
REM SandForge launcher — starts API (:4021) + dashboard (:3022)
REM Requires: Node 20+, npm. First run: run server\install.bat + dashboard\install.bat

title SandForge

start "SandForge API" cmd /k "cd /d %~dp0server && npx tsx src/index.ts"
timeout /t 3 /nobreak >nul
start "SandForge Dashboard" cmd /k "cd /d %~dp0dashboard && npx next dev -p 3022"
timeout /t 2 /nobreak >nul
start http://localhost:3022
