#!/bin/bash

echo "Starting Ride Operations Portal - All 3 Apps on localhost:3000"
echo "=============================================================="
echo ""

# Create NGINX config
cat > /tmp/ride-nginx.conf << 'EOF'
upstream ride_prd {
    server localhost:3000;
}

upstream ops_portal {
    server localhost:3002;
}

upstream vendor_portal {
    server localhost:3001;
}

server {
    listen 3000;
    server_name localhost;

    location / {
        proxy_pass http://ride_prd;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ops/ {
        proxy_pass http://ops_portal/ops/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /vendor/ {
        proxy_pass http://vendor_portal/vendor/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ops/_next/ {
        proxy_pass http://ops_portal/ops/_next/;
    }

    location /vendor/_next/ {
        proxy_pass http://vendor_portal/vendor/_next/;
    }
}
EOF

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
pkill nginx 2>/dev/null
sleep 2

echo "✅ Starting 3 Next.js servers..."
echo ""

# Start servers in background
cd /home/geelani/Downloads/Ride_polish

cd ride_prd && npm run dev > /tmp/ride-prd.log 2>&1 &
echo "🚀 ride_prd starting on port 3000..."
sleep 3

cd /home/geelani/Downloads/Ride_polish/ride-ops-portal && npm run dev > /tmp/ride-ops.log 2>&1 &
echo "🚀 ride-ops-portal starting on port 3002..."
sleep 3

cd /home/geelani/Downloads/Ride_polish/ride-vendor-portal && npm run dev > /tmp/ride-vendor.log 2>&1 &
echo "🚀 ride-vendor-portal starting on port 3001..."
sleep 3

echo ""
echo "✅ Starting NGINX reverse proxy on port 3000..."
sudo nginx -c /tmp/ride-nginx.conf

echo ""
echo "=============================================================="
echo "🎉 All portals ready! Access them at:"
echo ""
echo "  http://localhost:3000/         (ride_prd)"
echo "  http://localhost:3000/ops/     (ops-portal)"
echo "  http://localhost:3000/vendor/  (vendor-portal)"
echo ""
echo "Logs:"
echo "  tail -f /tmp/ride-prd.log"
echo "  tail -f /tmp/ride-ops.log"
echo "  tail -f /tmp/ride-vendor.log"
echo ""
echo "Stop NGINX: sudo nginx -s stop"
echo "=============================================================="
