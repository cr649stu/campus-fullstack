@echo off
setlocal
if "%~1"=="" (
  echo Usage: push-to-github.cmd https://github.com/USER/REPO.git
  echo Example: push-to-github.cmd https://github.com/cr649stu/before-graduation.git
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Install Git for Windows first: https://git-scm.com/download/win
  exit /b 1
)
git remote remove origin >nul 2>nul
git remote add origin %~1
git branch -M main
git push -u origin main
if errorlevel 1 (
  echo Push failed. Check the repository URL and your GitHub login.
  exit /b 1
)
echo Done. Repository: %~1
