#!/bin/bash

# CMU Attendance Deployment Script
# This script should be run on the production server

set -e

echo "=== CMU Attendance Deployment Script ==="
echo ""

# Configuration
APP_DIR="/home/sckagura/cmu-attendance"
DB_NAME="cmu_attendance"
DB_USER="attendance_user"
DB_PASSWORD="${DB_PASSWORD:-CHANGE_ME_SECURE_PASSWORD}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Step 1: Creating application directory${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}Step 2: Checking if Git repository exists${NC}"
if [ ! -d ".git" ]; then
    echo "Git repository not found. Please clone or copy your application code to $APP_DIR"
    echo "You can use: git clone <your-repo-url> $APP_DIR"
    echo "Or manually copy files to this directory"
    exit 1
fi

echo -e "${GREEN}Step 3: Installing dependencies${NC}"
npm install

echo -e "${GREEN}Step 4: Setting up environment variables${NC}"
cat > .env.production << EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
JWT_SECRET="$(openssl rand -base64 32)"
CMU_OAUTH_CLIENT_ID="REPLACE_WITH_YOUR_CLIENT_ID"
CMU_OAUTH_CLIENT_SECRET="REPLACE_WITH_YOUR_CLIENT_SECRET"
NEXTAUTH_URL="https://checkin.cpe.eng.cmu.ac.th"
NODE_ENV="production"
EOF

# Create symlink for .env
ln -sf .env.production .env

echo -e "${GREEN}Step 5: Setting up PostgreSQL database${NC}"
echo -e "${YELLOW}Creating database and user...${NC}"

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
EOSQL

echo -e "${GREEN}Step 6: Running database migrations${NC}"
npx prisma generate
npx prisma db push --accept-data-loss

echo -e "${GREEN}Step 7: Seeding database${NC}"
npx prisma db seed || echo "Seed script not found or failed, continuing..."

echo -e "${GREEN}Step 8: Building Next.js application${NC}"
npm run build

echo -e "${GREEN}Step 9: Setting up PM2${NC}"
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOPM2'
module.exports = {
  apps: [{
    name: 'cmu-attendance',
    script: 'npm',
    args: 'start',
    cwd: '/home/sckagura/cmu-attendance',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOPM2

# Stop existing PM2 process if running
pm2 stop cmu-attendance || true
pm2 delete cmu-attendance || true

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}Step 10: Configuring nginx${NC}"
sudo tee /etc/nginx/sites-available/cmu-attendance > /dev/null << 'EONGINX'
server {
    listen 80;
    server_name checkin.cpe.eng.cmu.ac.th;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name checkin.cpe.eng.cmu.ac.th;

    # SSL configuration (adjust paths as needed)
    ssl_certificate /etc/ssl/certs/checkin.cpe.eng.cmu.ac.th.crt;
    ssl_certificate_key /etc/ssl/private/checkin.cpe.eng.cmu.ac.th.key;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/cmu-attendance-access.log;
    error_log /var/log/nginx/cmu-attendance-error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Public static files
    location /static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600";
    }
}
EONGINX

# Enable the site
sudo ln -sf /etc/nginx/sites-available/cmu-attendance /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Application is running on: https://checkin.cpe.eng.cmu.ac.th"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check application status"
echo "  pm2 logs cmu-attendance - View application logs"
echo "  pm2 restart cmu-attendance - Restart application"
echo "  sudo systemctl status nginx - Check nginx status"
echo ""
