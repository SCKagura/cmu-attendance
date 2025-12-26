#!/bin/bash

# CMU Attendance - Ubuntu 24.04.3 Deployment Script
# Deploy Next.js with HTTPS (without nginx)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== CMU Attendance Deployment Script ===${NC}"
echo ""

# Configuration
APP_DIR="/home/sckagura/cmu-attendance"
DB_NAME="cmu_attendance"
DB_USER="attendance_user"
DOMAIN="checkin.cpe.eng.cmu.ac.th"

# Prompt for database password
echo ""
echo -e "${YELLOW}Please provide database password:${NC}"
read -sp "Database Password: " DB_PASSWORD
echo ""

# ============================================
# Step 1: Install System Dependencies
# ============================================
echo -e "${GREEN}Step 1: Installing system dependencies${NC}"

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js already installed: $(node -v)"
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    sudo apt install -y postgresql postgresql-contrib
else
    echo "PostgreSQL already installed"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
else
    echo "PM2 already installed"
fi

# Install build tools
sudo apt install -y build-essential

echo ""

# ============================================
# Step 2: Setup PostgreSQL Database
# ============================================
echo -e "${GREEN}Step 2: Setting up PostgreSQL database${NC}"

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOSQL
-- Create user if not exists
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to database and grant schema privileges
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOSQL

echo -e "${GREEN}Database setup complete${NC}"
echo ""

# ============================================
# Step 3: Clone/Update Repository
# ============================================
echo -e "${GREEN}Step 3: Setting up application code${NC}"

cd ~

if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main || git pull
else
    echo "Cloning repository..."
    git clone https://github.com/SCKagura/cmu-attendance.git
    cd $APP_DIR
fi

echo ""

# ============================================
# Step 4: Create Environment File
# ============================================
echo -e "${GREEN}Step 4: Creating environment configuration${NC}"

# Prompt for OAuth credentials
echo ""
echo -e "${YELLOW}Please provide CMU OAuth credentials:${NC}"
read -p "CMU OAuth Client ID: " CMU_CLIENT_ID
read -p "CMU OAuth Client Secret: " CMU_CLIENT_SECRET

# Generate random JWT secret
JWT_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
JWT_SECRET="${JWT_SECRET}"
CMU_OAUTH_CLIENT_ID="${CMU_CLIENT_ID}"
CMU_OAUTH_CLIENT_SECRET="${CMU_CLIENT_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"
NODE_ENV="production"
PORT=443
EOF

echo -e "${GREEN}Environment file created${NC}"
echo ""

# ============================================
# Step 5: Install Dependencies
# ============================================
echo -e "${GREEN}Step 5: Installing application dependencies${NC}"

npm install

echo ""

# ============================================
# Step 6: Setup Database Schema
# ============================================
echo -e "${GREEN}Step 6: Setting up database schema${NC}"

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database
npx prisma db seed || echo -e "${YELLOW}Seed script not found or failed, continuing...${NC}"

echo ""

# ============================================
# Step 7: Build Application
# ============================================
echo -e "${GREEN}Step 7: Building Next.js application${NC}"

npm run build

echo ""

# ============================================
# Step 8: Locate SSL Certificates
# ============================================
echo -e "${GREEN}Step 8: Locating SSL certificates${NC}"

# Common SSL certificate locations
SSL_LOCATIONS=(
    "/etc/ssl/certs/${DOMAIN}.crt"
    "/etc/ssl/certs/${DOMAIN}.pem"
    "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    "/etc/nginx/ssl/${DOMAIN}.crt"
)

SSL_KEY_LOCATIONS=(
    "/etc/ssl/private/${DOMAIN}.key"
    "/etc/ssl/private/${DOMAIN}.pem"
    "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    "/etc/nginx/ssl/${DOMAIN}.key"
)

SSL_CERT=""
SSL_KEY=""

# Find certificate
for cert in "${SSL_LOCATIONS[@]}"; do
    if [ -f "$cert" ]; then
        SSL_CERT="$cert"
        echo -e "${GREEN}Found certificate: $cert${NC}"
        break
    fi
done

# Find key
for key in "${SSL_KEY_LOCATIONS[@]}"; do
    if [ -f "$key" ]; then
        SSL_KEY="$key"
        echo -e "${GREEN}Found key: $key${NC}"
        break
    fi
done

if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
    echo -e "${RED}ERROR: SSL certificate or key not found!${NC}"
    echo "Please provide the paths manually:"
    read -p "SSL Certificate path: " SSL_CERT
    read -p "SSL Key path: " SSL_KEY
    
    if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
        echo -e "${RED}Invalid paths provided. Exiting.${NC}"
        exit 1
    fi
fi

echo ""

# ============================================
# Step 9: Create Custom HTTPS Server
# ============================================
echo -e "${GREEN}Step 9: Creating custom HTTPS server${NC}"

cat > server.js << EOSERVER
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '443', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// SSL certificate paths
const httpsOptions = {
  key: fs.readFileSync('${SSL_KEY}'),
  cert: fs.readFileSync('${SSL_CERT}'),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(\`> Ready on https://\${hostname}:\${port}\`);
  });
});
EOSERVER

echo -e "${GREEN}HTTPS server created${NC}"
echo ""

# ============================================
# Step 10: Create HTTP Redirect Server
# ============================================
echo -e "${GREEN}Step 10: Creating HTTP redirect server${NC}"

cat > redirect-server.js << 'EOREDIRECT'
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(301, { 
    'Location': 'https://' + req.headers.host + req.url 
  });
  res.end();
}).listen(80, '0.0.0.0', () => {
  console.log('> HTTP redirect server running on port 80');
});
EOREDIRECT

echo ""

# ============================================
# Step 11: Create PM2 Ecosystem File
# ============================================
echo -e "${GREEN}Step 11: Creating PM2 configuration${NC}"

# Create logs directory
mkdir -p logs

cat > ecosystem.config.js << 'EOPM2'
module.exports = {
  apps: [
    {
      name: 'cmu-attendance',
      script: 'server.js',
      cwd: '/home/sckagura/cmu-attendance',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 443
      },
      error_file: '/home/sckagura/cmu-attendance/logs/error.log',
      out_file: '/home/sckagura/cmu-attendance/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'http-redirect',
      script: 'redirect-server.js',
      cwd: '/home/sckagura/cmu-attendance',
      instances: 1,
      autorestart: true,
      error_file: '/home/sckagura/cmu-attendance/logs/redirect-error.log',
      out_file: '/home/sckagura/cmu-attendance/logs/redirect-out.log'
    }
  ]
}
EOPM2

echo ""

# ============================================
# Step 12: Configure Firewall
# ============================================
echo -e "${GREEN}Step 12: Configuring firewall${NC}"

# Check if ufw is installed
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp
    echo -e "${GREEN}Firewall rules added${NC}"
else
    echo -e "${YELLOW}UFW not installed, skipping firewall configuration${NC}"
fi

echo ""

# ============================================
# Step 13: Start Application with PM2
# ============================================
echo -e "${GREEN}Step 13: Starting application with PM2${NC}"

# Stop existing processes
sudo pm2 stop cmu-attendance 2>/dev/null || true
sudo pm2 stop http-redirect 2>/dev/null || true
sudo pm2 delete cmu-attendance 2>/dev/null || true
sudo pm2 delete http-redirect 2>/dev/null || true

# Start applications
sudo pm2 start ecosystem.config.js

# Save PM2 process list
sudo pm2 save

# Setup PM2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sckagura --hp /home/sckagura

echo ""

# ============================================
# Deployment Complete
# ============================================
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Application is running on: https://${DOMAIN}"
echo ""
echo "SSL Certificate: $SSL_CERT"
echo "SSL Key: $SSL_KEY"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  sudo pm2 status                    - Check application status"
echo "  sudo pm2 logs cmu-attendance       - View application logs"
echo "  sudo pm2 restart cmu-attendance    - Restart application"
echo "  sudo pm2 monit                     - Monitor resources"
echo ""
echo -e "${YELLOW}Testing:${NC}"
echo "  curl -I https://${DOMAIN}"
echo "  curl -I http://${DOMAIN}  (should redirect to HTTPS)"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Test the application in your browser"
echo "2. Test CMU OAuth login"
echo "3. Setup automated backups"
echo "4. Configure log rotation"
echo ""
