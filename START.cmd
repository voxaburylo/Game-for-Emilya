@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missing
node server.cjs --open
pause
exit /b
:missing
echo Node.js is not installed. Open index.html directly in Chrome or install Node.js from nodejs.org.
pause
