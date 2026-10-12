#!/bin/sh
set -e

PORT="${PORT:-80}"
echo "Configuring Nginx with primary port ${PORT}..."

cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen ${PORT};
EOF

# Also listen on standard ports 80 and 8080 if PORT is different, avoiding duplicates
if [ "$PORT" != "80" ]; then
    echo "    listen 80;" >> /etc/nginx/conf.d/default.conf
fi

if [ "$PORT" != "8080" ]; then
    echo "    listen 8080;" >> /etc/nginx/conf.d/default.conf
fi

cat <<EOF >> /etc/nginx/conf.d/default.conf
    server_name _;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "Generated Nginx configuration:"
cat /etc/nginx/conf.d/default.conf

# Validate syntax
nginx -t

exec nginx -g "daemon off;"
