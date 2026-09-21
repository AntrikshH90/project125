@echo off
title Voltix Home — 8-Channel Smart Home & Gate Controller (Everywhere Access)
color 0A

echo ======================================================================
echo           VOLTIX HOME — ACCESS FROM EVERYWHERE (4G/5G)
echo   Self-Hosted Sinric Pro Alternative + AI Face Recognition Gate
echo ======================================================================
echo.
echo [1/3] Checking Node.js dependencies...
call npm run postinstall

echo.
echo [2/3] Starting Voltix Core Server & Embedded MQTT Broker (:1883)...
start "Voltix Core Server" cmd /k "npx cross-env NODE_ENV=production tsx server.ts"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Launching Global 4G/5G Cloudflare Tunnel...
start "Voltix Global Tunnel" cmd /k "npx -y cloudflared tunnel --url http://localhost:3000"

echo.
echo ======================================================================
echo  SUCCESS! Voltix Home is now active and accessible EVERYWHERE:
echo.
echo  Local Dashboard:    http://localhost:3000
echo  Remote Dashboard:   Check the 'Voltix Global Tunnel' window for your
echo                      secure https://*.trycloudflare.com URL!
echo ======================================================================
echo.
pause
