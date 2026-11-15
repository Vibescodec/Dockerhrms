@echo off
setlocal
cd /d "%~dp0"
title Reset Docker HRMS data
echo This clears every employee, training record, health record, reminder,
echo department, user account (except admin) and open session.
echo The logo and company name are kept, and a database backup is saved
echo in data\backups before anything is deleted.
echo.
echo Close the Docker HRMS window (Start HRMS.bat) before continuing.
echo.
choice /c YN /m "Continue"
if errorlevel 2 exit /b

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is required to reset Docker HRMS, but it was not found.
  pause
  exit /b 1
)

node "%~dp0tools\reset-data.js"
if errorlevel 1 (
  echo.
  echo The reset did not complete. Nothing was changed if you cancelled.
)
pause
