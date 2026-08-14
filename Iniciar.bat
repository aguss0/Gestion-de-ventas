@echo off
echo Iniciando sistema de ventas...
cd /d D:\Proyectos\Papa\backend
start /B node src/index.js
timeout /t 2 /nobreak > nul
start "" "http://localhost:3001"