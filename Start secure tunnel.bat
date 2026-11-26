@echo off
setlocal
cd /d "%~dp0"
title Docker HRMS secure Cloudflare tunnel

if not defined HRMS_PORT set "HRMS_PORT=3210"

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

set "CLOUDFLARED_EXE="
where cloudflared >nul 2>nul && set "CLOUDFLARED_EXE=cloudflared"
if not defined CLOUDFLARED_EXE if exist "%LocalAppData%\Microsoft\WinGet\Links\cloudflared.exe" set "CLOUDFLARED_EXE=%LocalAppData%\Microsoft\WinGet\Links\cloudflared.exe"
if not defined CLOUDFLARED_EXE if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CLOUDFLARED_EXE=%ProgramFiles%\cloudflared\cloudflared.exe"
if not defined CLOUDFLARED_EXE if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CLOUDFLARED_EXE=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"

if not defined CLOUDFLARED_EXE (
  echo.
  echo The Cloudflare Tunnel client ^(cloudflared^) is required.
  echo Install it from PowerShell or Command Prompt with:
  echo   winget install --exact --id Cloudflare.cloudflared
  echo.
  echo Close and reopen this window after installation so PATH updates.
  echo.
  pause
  exit /b 1
)

"%NODE_EXE%" "%~dp0tools\secure-tunnel.js"
if errorlevel 1 (
  echo.
  echo The secure tunnel did not start or has stopped.
  echo.
  pause
)
