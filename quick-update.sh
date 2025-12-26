#!/bin/bash

# Quick Update Script - Use this for updates after initial deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Quick Update Script ===${NC}"
echo ""

cd ~/cmu-attendance

# Pull latest code
echo -e "${GREEN}Pulling latest code...${NC}"
git pull origin main || git pull

# Install dependencies (if package.json changed)
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Run database migrations (if schema changed)
echo -e "${GREEN}Updating database...${NC}"
npx prisma generate
npx prisma db push

# Rebuild application
echo -e "${GREEN}Building application...${NC}"
npm run build

# Restart PM2
echo -e "${GREEN}Restarting application...${NC}"
sudo pm2 restart cmu-attendance

echo ""
echo -e "${GREEN}Update complete!${NC}"
echo ""
echo "Check status: sudo pm2 status"
echo "View logs: sudo pm2 logs cmu-attendance"
