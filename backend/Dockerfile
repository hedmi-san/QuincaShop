# Multi-stage Dockerfile for Backend API
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source code and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]

