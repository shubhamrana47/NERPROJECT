#!/bin/sh
set -e

PORT="${PORT:-80}"
echo "Configuring Nginx with primary port ${PORT}..."

# Inject runtime environment variables into env-config.js so Railway variable changes
# take effect immediately on container restart without requiring a Docker rebuild.
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL:-}"
};
EOF
echo "Injected runtime env-config.js (VITE_API_URL=${VITE_API_URL:-<build-default>})"

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
