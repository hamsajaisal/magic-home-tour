@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed. Please install it from https://nodejs.org  ^(the "LTS" button^), then double-click this file again.
  echo.
  pause
  exit /b
)
start "" http://localhost:8080
node tools\server.js
pause
