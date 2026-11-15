@echo off
setlocal
cd /d "%~dp0"
title Allow Docker HRMS on the network

net session >nul 2>&1
if errorlevel 1 (
  echo Asking for administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo Opening inbound TCP port 3210 for Docker HRMS...
netsh advfirewall firewall delete rule name="Docker HRMS (TCP 3210)" >nul 2>&1
netsh advfirewall firewall add rule name="Docker HRMS (TCP 3210)" dir=in action=allow protocol=TCP localport=3210 profile=any >nul
if errorlevel 1 (
  echo.
  echo Could not add the firewall rule.
) else (
  echo Done.
)

echo.
echo This computer's network addresses:
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
  for /f "tokens=* delims= " %%B in ("%%A") do echo   http://%%B:3210
)
echo.
echo Open one of those addresses from the other computer.
echo Both computers must be on the same Wi-Fi or office network.
echo.
pause
