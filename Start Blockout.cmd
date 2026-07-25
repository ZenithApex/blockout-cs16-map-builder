@echo off
setlocal
cd /d "%~dp0"
title Blockout CS 1.6 Map Builder

if exist "%~dp0Blockout.exe" (
  "%~dp0Blockout.exe"
  goto :done
)

where py >nul 2>nul
if not errorlevel 1 (
  py -3 blockout_companion.py
  goto :done
)

where python >nul 2>nul
if not errorlevel 1 (
  python blockout_companion.py
  goto :done
)

echo Blockout.exe and Python 3 were not found on this computer.
echo Download the Windows beta package again, or open index.html for editor-only mode.

:done
if errorlevel 1 pause
endlocal
