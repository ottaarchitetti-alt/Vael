@echo off
title Ceneri di Vael (LAN)
cd /d "%~dp0"
if not exist node_modules (echo Installo le dipendenze... & call npm install)
node server/index.js
pause
