# Multi-stage Dockerfile for Frontend Vue SPA
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build Vite production bundle
COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/
RUN npm run build

# Nginx production runner
FROM nginx:alpine AS runner

# Copy customized Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

