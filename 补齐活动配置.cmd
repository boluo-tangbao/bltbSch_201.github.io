@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 is required. Ask Codex to run: node scripts/init-activities.mjs
  pause
  exit /b 1
)
node scripts/init-activities.mjs
if errorlevel 1 echo Activity setup incomplete. Please review the message above.
pause
