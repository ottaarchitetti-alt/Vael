@echo off
title Ceneri di Vael (Online)
cd /d "%~dp0"
if not exist node_modules (echo Installo le dipendenze... & call npm install)
where cloudflared >nul 2>nul || echo Suggerimento: installa cloudflared per un link migliore:  winget install Cloudflare.cloudflared
node server/index.js --tunnel
pause
