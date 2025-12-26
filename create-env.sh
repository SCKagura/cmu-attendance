#!/bin/bash

# CMU Attendance - Simple Deployment Script
# This script creates the deployment files on the server

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== CMU Attendance - Creating Deployment Files ===${NC}"
echo ""

# Get OAuth credentials
echo -e "${YELLOW}Please provide the following information:${NC}"
read -p "CMU OAuth Client ID: " CMU_CLIENT_ID
read -p "CMU OAuth Client Secret: " CMU_CLIENT_SECRET
read -p "Database Password: " DB_PASSWORD

# Generate random JWT secret
JWT_SECRET=$(openssl rand -base64 32)

echo ""
echo -e "${GREEN}Creating .env file...${NC}"

cat > .env << EOF
DATABASE_URL="postgresql://attendance_user:${DB_PASSWORD}@localhost:5432/cmu_attendance"
JWT_SECRET="${JWT_SECRET}"
CMU_OAUTH_CLIENT_ID="${CMU_CLIENT_ID}"
CMU_OAUTH_CLIENT_SECRET="${CMU_CLIENT_SECRET}"
NEXTAUTH_URL="https://checkin.cpe.eng.cmu.ac.th"
NODE_ENV="production"
PORT=443
EOF

echo -e "${GREEN}.env file created successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the .env file: cat .env"
echo "2. Continue with the deployment process"
