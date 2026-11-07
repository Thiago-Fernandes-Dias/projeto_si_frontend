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

# Copy custom Nginx configuration for Angular SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled files from build stage
COPY --from=build /app/dist/keystroke-auth-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
