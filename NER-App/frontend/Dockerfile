# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL="https://nerproject-production.up.railway.app"
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN tr -d '\r' < /docker-entrypoint.sh > /docker-entrypoint-unix.sh && mv /docker-entrypoint-unix.sh /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
