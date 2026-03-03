@echo off
REM Use Node.js bundled npm (avoids broken AppData npm)
set "NPM=%ProgramFiles%\nodejs\npm.cmd"
if not exist "%NPM%" set "NPM=%ProgramFiles(x86)%\nodejs\npm.cmd"
if not exist "%NPM%" (
  echo Node.js npm.cmd not found. Please reinstall Node.js from https://nodejs.org
  exit /b 1
)
"%NPM%" install
exit /b %ERRORLEVEL%
