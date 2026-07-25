@echo off
setlocal
cd /d "%~dp0"
title Blockout CS 1.6 Map Builder

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

echo Python 3 was not found on this computer.
echo Install Python 3 or open index.html to use Blockout without compilation.

:done
if errorlevel 1 pause
endlocal
