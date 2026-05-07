@echo off
REM ====================================================================
REM  Half the Truth — initial git setup for the page/ folder
REM
REM  Run this once. After it finishes you'll have:
REM    - a clean git repo with one initial commit
REM    - ready to push to a fresh GitHub repository
REM ====================================================================

cd /d "%~dp0"

echo.
echo === Cleaning the broken .git folder Claude created in the sandbox ===
if exist .git rmdir /s /q .git

echo.
echo === Initializing a fresh git repository on main branch ===
git init -b main
if errorlevel 1 (
  echo.
  echo ERROR: git is not installed or not on PATH.
  echo  Install: https://git-scm.com/download/win
  pause
  exit /b 1
)

echo.
echo === Configuring local identity for this repo ===
REM If you already have global git config set, these are still safe to set per-repo
git config user.email "radicalfishtkd@gmail.com"
git config user.name "TheFracturedRealm"

echo.
echo === Staging all site files ===
git add -A
git status --short

echo.
echo === First commit ===
git commit -m "Initial commit: thefracturedrealm.net static site"

echo.
echo ====================================================================
echo  Local git repo is ready.
echo.
echo  Next steps (do these in your browser + terminal):
echo.
echo   1. Create a new repository at https://github.com/new
echo      Suggested name: thefracturedrealm
echo      Public or private — your call. Public is fine for static sites.
echo      DO NOT initialize with README, .gitignore, or license — we have those.
echo.
echo   2. GitHub will show a "...or push an existing repository" block.
echo      Copy the two commands it shows, OR run these (replace USERNAME):
echo.
echo        git remote add origin https://github.com/USERNAME/thefracturedrealm.git
echo        git push -u origin main
echo.
echo   3. Tell Claude "the repo is up at https://github.com/USERNAME/thefracturedrealm"
echo      and Claude will connect Netlify to it via OAuth.
echo ====================================================================
pause
