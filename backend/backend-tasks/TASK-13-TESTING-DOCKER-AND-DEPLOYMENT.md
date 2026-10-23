# TASK 13: Testing Suite, Production Docker & PM2 Cluster Deployment

## Objective
Set up comprehensive integration tests with Vitest/Supertest, configure a production-ready multi-stage `Dockerfile`, write a complete `docker-compose.yml` with automated SSL (Caddy), and set up PM2 cluster mode to utilize multiple CPU cores under heavy traffic.

---

## 1. Automated Integration Test Suite (`tests/`)

Set up Vitest and Supertest to run against a test PostgreSQL database:

* **Foundation Tests (`tests/foundation.test.ts`):** Verifies server bootstrap, environment validation, and `/health` and `/ready` endpoints.
* **Auth & Profile Tests (`tests/auth.test.ts`):** Tests PBKDF2 password registration, Google token resolution, `TX26XXXX` sequential ID generation, sliding sessions, and student locking.
* **Team Tests (`tests/teams.test.ts`):** Tests team creation, in-app invitation acceptance, roster caps, and leave/disband logic.
* **Capacity & Concurrency Tests (`tests/purchases-concurrency.test.ts`):**
  * Spawns 10 simultaneous checkout requests attempting to buy the last single remaining seat.
  * Verifies that exactly 1 request succeeds and 9 fail with `409 CAPACITY_FULL` without overselling.
* **Payment Tests (`tests/payments.test.ts`):** Duplicate UTR rejection, self-review blocking, approval state machine, and durable payment truth.
* **Scanning Tests (`tests/scanning.test.ts`):** HMAC verification, pass-back warning, and double-entry prevention for event passes.
* **E-Sports Tests (`tests/esports.test.ts`):** Optimistic concurrency version conflicts (`409 SCORE_VERSION_CONFLICT`) and tie-breaking algorithms.

Add test script to `package.json`:
```json
"scripts": {
  "test": "vitest run"
}
```

---

## 2. Production Multi-Stage Dockerfile (`Dockerfile`)

Create an optimized multi-stage build that keeps production images small and fast:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 4000
CMD ["node", "dist/server.js"]
```

---

## 3. PM2 Multi-Core Cluster Configuration (`ecosystem.config.cjs`)

To ensure the Express server uses all available CPU cores when handling traffic surges:

```javascript
module.exports = {
  apps: [
    {
      name: 'techxetra-backend',
      script: './dist/server.js',
      instances: 'max',       // Spawns one worker per CPU core
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
```

---

## 4. Production Docker Compose with Automated HTTPS (`docker-compose.prod.yml`)

Runs PostgreSQL, the Express app, and Caddy (which automatically provisions free Let's Encrypt SSL certificates):

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: techxetra_db
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: .
    container_name: techxetra_api
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      FRONTEND_ORIGIN: ${FRONTEND_ORIGIN}
      TICKET_HMAC_SECRET: ${TICKET_HMAC_SECRET}
      UPI_VPA: ${UPI_VPA}
      UPI_PAYEE_NAME: ${UPI_PAYEE_NAME}

  caddy:
    image: caddy:alpine
    container_name: techxetra_caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

### Accompanying `Caddyfile`:
```caddy
api.techxetra.in {
    reverse_proxy backend:4000
}
```

---

## Verification Checklist
- [ ] All Vitest integration tests pass with 100% green status.
- [ ] Concurrency test confirms zero overselling under simultaneous requests.
- [ ] Multi-stage Docker image builds cleanly without dev dependencies.
- [ ] Docker Compose starts Postgres, Express backend, and Caddy with healthy statuses.
- [ ] Reverse proxy routes requests and serves valid HTTPS.
