@echo off
REM Render.com Deployment Setup Script for Windows
REM This script prepares your project for deployment to Render.com

echo.
echo ========================================
echo  Render.com Deployment Setup
echo ========================================
echo.

REM Check if we're in a git repository
if not exist ".git" (
    echo ERROR: Not a git repository. Please initialize git first.
    pause
    exit /b 1
)

REM Check if render.yaml exists
if not exist "render.yaml" (
    echo ERROR: render.yaml not found. Please create it first.
    pause
    exit /b 1
)

REM Test builds
echo Testing server build...
call cd server
call npm run build
if errorlevel 1 (
    echo ERROR: Server build failed. Please fix the errors first.
    call cd ..
    pause
    exit /b 1
)
call cd ..

echo.
echo Testing web build...
call cd web
call npm run build
if errorlevel 1 (
    echo ERROR: Web build failed. Please fix the errors first.
    call cd ..
    pause
    exit /b 1
)
call cd ..

echo.
echo ========================================
echo  Preparing git repository...
echo ========================================
echo.

git add .
git status

echo.
set /p message="Enter commit message: "
git commit -m "%message%"

echo.
set /p answer="Do you want to push to GitHub? (y/n): "
if /i "%answer%"=="y" (
    git push origin main
    echo.
    echo ========================================
    echo  Code pushed to GitHub!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Go to Render.com dashboard
    echo 2. Click 'New +' ^>^> 'Blueprint'
    echo 3. Connect your GitHub repository
    echo 4. Configure environment variables as described in DEPLOYMENT.md
    echo 5. Deploy!
) else (
    echo.
    echo Changes committed but not pushed.
    echo Push manually when ready: git push origin main
)

echo.
echo Don't forget to:
echo    - Set CORS_ORIGIN on the server
echo    - Set NEXT_PUBLIC_API_URL on the web app
echo    - See DEPLOYMENT.md for detailed instructions
echo.
pause