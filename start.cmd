@echo off
rem Double-click this file to run Smart Review locally.
rem It starts a small static server and opens your browser.
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

echo.
echo   Smart Review - starting the local server...
echo   Keep this window open while using the app. Close it to stop.
echo.
node "scripts\serve.mjs"
echo.
echo   Server stopped.
pause
exit /b 0

:nonode
echo.
echo   Node.js was not found.
echo   Install it from https://nodejs.org/ then double-click this file again.
echo.
pause
exit /b 1
