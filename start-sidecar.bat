@echo off
title Brandev Inspector - Sidecar Server
cd /d "%~dp0"
echo Iniciando Brandev Inspector Sidecar na porta 39999...
node sidecar.js
pause
