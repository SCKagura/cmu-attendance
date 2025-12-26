#!/bin/bash
# Quick Deploy Script - Copy and paste this entire script into your SSH session

set -e

echo "=== Starting CMU Attendance Deployment ==="

# 1. Clone repository
cd ~
if [ -d "cmu-attendance" ]; then
    echo "Directory exists, pulling latest changes..."
    cd cmu-attendance
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/SCKagura/cmu-attendance.git
    cd cmu-attendance
fi

# 2. Create .env file
echo "Creating environment file..."
echo "Please provide the following credentials:"
read -p "Database Password: " DB_PASSWORD
read -p "CMU OAuth Client ID: " CMU_CLIENT_ID
read -p "CMU OAuth Client Secret: " CMU_CLIENT_SECRET

JWT_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
DATABASE_URL="postgresql://attendance_user:${DB_PASSWORD}@localhost:5432/cmu_attendance"
JWT_SECRET="${JWT_SECRET}"
CMU_OAUTH_CLIENT_ID="${CMU_CLIENT_ID}"
CMU_OAUTH_CLIENT_SECRET="${CMU_CLIENT_SECRET}"
NEXTAUTH_URL="https://checkin.cpe.eng.cmu.ac.th"
NODE_ENV="production"
EOF

# 3. Setup PostgreSQL
echo "Setting up PostgreSQL database..."
sudo -u postgres psql << EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'attendance_user') THEN
    CREATE USER attendance_user WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE cmu_attendance OWNER attendance_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cmu_attendance')\gexec

GRANT ALL PRIVILEGES ON DATABASE cmu_attendance TO attendance_user;
EOSQL

# 4. Install and build
echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma db push

echo "Seeding database..."
npx prisma db seed || echo "Seed failed or not available, continuing..."

echo "Building application..."
npm run build

# 5. Setup PM2
echo "Creating PM2 ecosystem file..."
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

echo "Starting application with PM2..."
pm2 stop cmu-attendance 2>/dev/null || true
pm2 delete cmu-attendance 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Next steps:"
echo "1. Configure nginx (see deployment_guide.md)"
echo "2. Setup SSL certificate"
echo "3. Test the application"
echo ""
echo "Useful commands:"
echo "  pm2 status"
echo "  pm2 logs cmu-attendance"
echo "  pm2 restart cmu-attendance"
