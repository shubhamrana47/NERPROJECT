#!/bin/sh
set -e

PORT="${PORT:-80}"
echo "Configuring Nginx on port ${PORT}..."

cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen ${PORT};
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass https://nerproject-production.up.railway.app;
        proxy_ssl_server_name on;
        proxy_set_header Host nerproject-production.up.railway.app;
    }
}
EOF

exec nginx -g "daemon off;"
