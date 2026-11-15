# Multi-stage Dockerfile for Angular Frontend

# --- Stage 1: Build ---
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build -- --configuration production

# --- Stage 2: Runtime (Nginx) ---
FROM nginx:alpine AS runtime

ENV DEBUG_LOGS=false

# Copy custom Nginx configuration for Angular SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled files from build stage
COPY --from=build /app/dist/keystroke-auth-frontend/browser /usr/share/nginx/html

# Generate /runtime-config.json on container startup from DEBUG_LOGS
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
