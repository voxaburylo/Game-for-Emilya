@echo off
cd /d "%~dp0"
node build-apk.cjs
if errorlevel 1 pause
