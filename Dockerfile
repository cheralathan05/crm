# ── Stage 1: Base Dependencies ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm ci

# ── Stage 2: Builder ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client for frontend
ENV DATABASE_URL="file:./dev.db"
RUN npx prisma generate --schema=frontend/prisma/schema.prisma

# Build optimized Next.js bundle
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=@mainproject/frontend

# ── Stage 3: Minimal Production Runner ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy essential runtime files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/package.json ./frontend/package.json
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/frontend/dev.db ./frontend/dev.db

# Prepare uploads directory with correct permissions
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@mainproject/frontend"]
