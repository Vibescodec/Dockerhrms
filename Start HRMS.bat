@echo off
setlocal
cd /d "%~dp0"
set "HRMS_HOST=0.0.0.0"

set "NODE_EXE="
where node >nul 2>nul && set "NODE_EXE=node"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"

if not defined NODE_EXE (
  echo.
  echo Node.js is required to run Docker HRMS, but it was not found.
  echo Install the LTS version from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)

"%NODE_EXE%" server.js --open
if errorlevel 1 pause
