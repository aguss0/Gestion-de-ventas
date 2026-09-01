@echo off
setlocal

set "BASE_DATOS=D:\Sistema-Agus\gestion-de-ventas-main\backend\prisma\dev.db"
set "CARPETA_BACKUP=D:\Sistema-Agus\backups"

if not exist "%BASE_DATOS%" (
  echo.
  echo ERROR: No se encontro la base de datos:
  echo %BASE_DATOS%
  echo.
  pause
  exit /b 1
)

if not exist "%CARPETA_BACKUP%" (
  mkdir "%CARPETA_BACKUP%"
  if errorlevel 1 (
    echo.
    echo ERROR: No se pudo crear la carpeta de backups:
    echo %CARPETA_BACKUP%
    echo.
    pause
    exit /b 1
  )
)

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "FECHA=%%I"
set "ARCHIVO_BACKUP=%CARPETA_BACKUP%\dev_%FECHA%.db"

copy /Y "%BASE_DATOS%" "%ARCHIVO_BACKUP%" >nul

if errorlevel 1 (
  echo.
  echo ERROR: No se pudo generar el backup.
  echo.
  pause
  exit /b 1
)

echo.
echo Backup generado correctamente:
echo %ARCHIVO_BACKUP%
echo.
pause
exit /b 0
