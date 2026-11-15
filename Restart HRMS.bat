@echo off
setlocal
cd /d "%~dp0"
title Restart Docker HRMS
set "HRMS_HOST=0.0.0.0"

set "PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3210 .*LISTENING"') do set "PID=%%P"

if not defined PID (
  echo No HRMS server is running. Starting a new one...
  echo.
) else (
  echo Stopping the HRMS server that is running now ^(process %PID%^)...
  taskkill /PID %PID% /F >nul 2>nul
  if errorlevel 1 (
    echo.
    echo Could not stop process %PID%. Close its window or end node.exe in
    echo Task Manager, then run this file again.
    pause
    exit /b 1
  )
  timeout /t 1 /nobreak >nul
  echo Stopped. Starting the updated server...
  echo.
)

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
