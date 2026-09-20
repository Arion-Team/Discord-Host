#!/bin/bash
set -e

echo "============================================"
echo "  DiscordHost - Installation Script"
echo "============================================"
echo

echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "  Found: $(node --version)"

echo
echo "[2/5] Installing dependencies..."
npm install

echo
echo "[3/5] Copying environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
    echo "  IMPORTANT: Edit .env to set SESSION_SECRET and other settings"
else
    echo "  .env already exists, skipping"
fi

echo
echo "[4/5] Creating directories..."
mkdir -p data bots tmp/uploads
echo "  Created data, bots, tmp directories"

echo
echo "[5/5] Initializing database..."
npx tsx src/server/db/seed.ts

echo
echo "============================================"
echo "  Installation Complete!"
echo "============================================"
echo
echo "  Default admin login:"
echo "    Email: admin@discordhost.com"
echo "    Password: admin123"
echo
echo "  To start in development mode:"
echo "    npm run dev"
echo
echo "  To start in production mode:"
echo "    npm run build"
echo "    npm start"
echo
echo "  Access the panel at: http://localhost:3000"
echo
