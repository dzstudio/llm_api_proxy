# Multi-stage build for LLM API Proxy
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine
WORKDIR /app

# Create directories
RUN mkdir -p /app/data /app/logs

# Copy backend
COPY --from=backend-builder /app/backend/dist /app/dist
COPY --from=backend-builder /app/backend/node_modules /app/node_modules
COPY --from=backend-builder /app/backend/package.json /app/package.json
COPY --from=backend-builder /app/backend/prisma /app/prisma

# Copy frontend dist
COPY --from=frontend-builder /app/frontend/dist /app/static

# Generate Prisma client at runtime
RUN npx prisma generate

EXPOSE 8080

CMD ["node", "dist/index.js"]
