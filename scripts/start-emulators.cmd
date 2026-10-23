@echo off
set "PATH=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot\bin;%PATH%"
cd /d "%~dp0.."
npx firebase-tools emulators:start
