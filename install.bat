@echo off
echo ============================================
echo   DiscordHost - Installation Script
echo ============================================
echo.

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   Found: %%i

echo.
echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/5] Copying environment file...
if not exist .env (
    copy .env.example .env
    echo   Created .env from .env.example
    echo   IMPORTANT: Edit .env to set SESSION_SECRET and other settings
) else (
    echo   .env already exists, skipping
)

echo.
echo [4/5] Creating directories...
if not exist data mkdir data
if not exist bots mkdir bots
if not exist tmp mkdir tmp
if not exist tmp\uploads mkdir tmp\uploads
echo   Created data, bots, tmp directories

echo.
echo [5/5] Initializing database...
call npx tsx src/server/db/seed.ts
if errorlevel 1 (
    echo ERROR: Failed to initialize database
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo   Default admin login:
echo     Email: admin@discordhost.com
echo     Password: admin123
echo.
echo   To start in development mode:
echo     npm run dev
echo.
echo   To start in production mode:
echo     npm run build
echo     npm start
echo.
echo   Access the panel at: http://localhost:3000
echo.
pause
