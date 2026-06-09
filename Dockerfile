# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:22-alpine AS backend-build
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app/backend

# Copy backend dist, prisma, and deps
COPY --from=backend-build /build/backend/dist ./dist
COPY --from=backend-build /build/backend/prisma ./prisma
COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/package.json ./

# Copy frontend dist (served as static files by Express)
COPY --from=frontend-build /build/frontend/dist ../frontend/dist

# Create persistent directories
RUN mkdir -p /app/data /app/logs

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
