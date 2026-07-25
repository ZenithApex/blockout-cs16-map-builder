@echo off
setlocal
cd /d "%~dp0"
title Set up Blockout CS 1.6 Map Builder

echo Installing the verified SDHLT compiler toolchain...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\install-sdhlt.ps1"
if errorlevel 1 goto :failed

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found. Map compilation is ready, but importing new
  echo textures requires Node.js 20 or newer from https://nodejs.org/
  goto :done
)

echo.
echo Installing the small local PNG dependency used by texture imports...
call npm install --prefix "%~dp0tools" --omit=dev --no-audit --no-fund
if errorlevel 1 goto :failed

:done
echo.
echo Setup completed. Double-click "Start Blockout.cmd".
pause
exit /b 0

:failed
echo.
echo Setup stopped before completion. Read the error above, then try again.
pause
exit /b 1
