# Deployment Documentation

## Overview

This document covers the complete deployment setup for the Gym Platform application on Render, including all issues encountered and their solutions.

---

## Table of Contents

1. [Architecture](#architecture)
2. [TypeScript Fixes](#typescript-fixes)
3. [Render Configuration](#render-configuration)
4. [Environment Variables](#environment-variables)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Test Accounts](#test-accounts)

---

## Architecture

### Monorepo Structure

```
gym-platform/
├── apps/
│   └── web/                    # Next.js frontend application
├── packages/
│   ├── core/                   # Business logic and services
│   ├── database/               # Prisma schema and database client
│   └── shared/                 # Shared types, schemas, utilities
├── render.yaml                 # Render deployment configuration
└── package.json                # Root package.json with workspace scripts
```

### Technology Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: PostgreSQL (hosted on Render)
- **ORM**: Prisma
- **Package Manager**: pnpm with workspaces
- **Build Tool**: Turborepo

---

## TypeScript Fixes

### Issue: Discriminated Union Type Narrowing

**Problem**: TypeScript errors when accessing `result.session`, `result.user`, or `result.error` after checking `result.success`.

**Root Cause**: The `AuthResult` type is a discriminated union:

```typescript
// packages/core/src/services/auth.service.ts
export type AuthResult =
  | { success: true; user: User; session: Session }
  | { success: false; error: ApiError };
```

When `success` is `false`, `error` is guaranteed to exist. When `success` is `true`, `user` and `session` are guaranteed to exist.

**Solution**: Use proper type narrowing without defensive fallbacks:

```typescript
// CORRECT - TypeScript narrows the type properly
if (!result.success) {
  return apiError(result.error, 401);  // error is guaranteed here
}
// session and user are guaranteed here
cookieStore.set(setSessionCookie(result.session.token, result.session.expiresAt));

// WRONG - Unnecessary defensive coding
if (!result || !result.success) {
  return apiError(result?.error || { code: 'FALLBACK' }, 401);
}
```

**Files Fixed**:
- `apps/web/src/app/api/auth/login/route.ts`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/member-login/route.ts`

---

## Render Configuration

### Why We Don't Use Standalone Mode

Initially, we configured Next.js with `output: 'standalone'` which creates a minimal self-contained server. This caused issues because:

1. **Static files must be manually copied** to the standalone output directory
2. **Complex paths in monorepos**: Files end up at `apps/web/.next/standalone/apps/web/.next/static`
3. **Silent failures**: Copy commands can fail without clear errors
4. **Designed for Docker**: Standalone mode is optimized for containerized deployments, not Render

**Solution**: Use standard Next.js deployment with `next start`.

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE: We intentionally DO NOT use 'output: standalone'
  // Standalone mode requires manual static file copying which is error-prone on Render
  // Standard next start handles everything automatically
  transpilePackages: ['@gym/core', '@gym/database', '@gym/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
};

module.exports = nextConfig;
```

### render.yaml

```yaml
databases:
  - name: smashbox-db
    databaseName: smashbox
    user: smashbox_admin
    plan: free
    region: oregon

services:
  - type: web
    name: smashbox
    runtime: node
    plan: free
    region: oregon
    buildCommand: |
      npm install -g pnpm &&
      NODE_ENV=development pnpm install &&
      pnpm db:generate &&
      pnpm db:push &&
      pnpm db:seed &&
      pnpm build
    startCommand: pnpm --filter @gym/web start
    envVars:
      - key: NODE_VERSION
        value: 20
      - key: DATABASE_URL
        fromDatabase:
          name: smashbox-db
          property: connectionString
      - key: NEXTAUTH_SECRET
        generateValue: true
      - key: NEXTAUTH_URL
        sync: false
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: HOSTNAME
        value: 0.0.0.0
```

### Build Command Breakdown

```bash
npm install -g pnpm &&           # Install pnpm globally (Render doesn't have it by default)
NODE_ENV=development pnpm install &&  # Install all dependencies (dev mode to get all deps)
pnpm db:generate &&              # Generate Prisma client
pnpm db:push &&                  # Push schema to database
pnpm db:seed &&                  # Seed database with test data
pnpm build                       # Build all packages via Turborepo
```

### Start Command

```bash
pnpm --filter @gym/web start     # Runs 'next start' in the web app
```

---

## Environment Variables

### Required Variables in Render Dashboard

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | (from database) | PostgreSQL connection string - link to your Render database |
| `NODE_VERSION` | `20` | Node.js version to use |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Port for the web server (Render's default) |
| `HOSTNAME` | `0.0.0.0` | Bind to all network interfaces |
| `NEXTAUTH_SECRET` | (auto-generated) | Secret for session encryption |
| `NEXTAUTH_URL` | Your Render URL | Full URL of your deployed app |

### How to Link DATABASE_URL

1. Go to your Render dashboard
2. Click on your web service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Key: `DATABASE_URL`
6. Click **Connect** and select your database
7. Save

---

## Common Issues & Solutions

### Issue 1: "Environment variable not found: DATABASE_URL"

**Cause**: DATABASE_URL not set or not linked to database.

**Solution**:
- Verify DATABASE_URL exists in Environment tab
- Ensure it's linked to the actual database (not just a placeholder)
- The value should look like: `postgresql://user:pass@host:5432/dbname`

### Issue 2: "Cannot find module 'server.js'" (502 Error)

**Cause**: Using standalone mode start command without standalone build.

**Solution**:
- If NOT using standalone: Start command should be `pnpm --filter @gym/web start`
- If using standalone: Ensure `output: 'standalone'` is in next.config.js AND static files are copied

### Issue 3: 502 Error with 176 byte responses

**Cause**: Standalone server running but can't find static files (JS/CSS).

**Solution**: Either:
1. Remove standalone mode (recommended for Render)
2. Or ensure static files are copied: `cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static`

### Issue 4: "cp: cannot stat 'apps/web/public': No such file or directory"

**Cause**: Build command trying to copy a public folder that doesn't exist.

**Solution**: Remove the public folder copy from build command, or create an empty public folder.

### Issue 5: Build succeeds but old version deployed

**Cause**: Render build cache serving stale build.

**Solution**:
1. Go to Render dashboard
2. Navigate to your service
3. Go to **Settings** → **Build & Deploy**
4. Click **Clear build cache & deploy**

### Issue 6: TypeScript errors about possibly undefined values

**Cause**: Not using discriminated unions properly, or using defensive checks that confuse TypeScript.

**Solution**: Trust the discriminated union types. If `AuthResult` says `success: false` means `error` exists, don't add `|| fallback`.

---

## Test Accounts

After deployment, the database is seeded with these test accounts:

### Gym Owner (Staff Dashboard)

- **URL**: `https://your-app.onrender.com/login`
- **Email**: `owner@testgym.com`
- **Password**: `TestOwner123!`

### Gym Member (Member Portal)

- **URL**: `https://your-app.onrender.com/member-login`
- **Email**: `member@testgym.com`
- **Password**: `TestMember123!`

---

## Manual Render Setup (If Not Using Blueprint)

If you create the Render service manually instead of using the render.yaml Blueprint:

### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Name: `smashbox-db`
3. Database: `smashbox`
4. User: `smashbox_admin`
5. Region: Oregon (or your preference)
6. Plan: Free
7. Click **Create Database**

### Step 2: Create Web Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `gym-app-management` (or your choice)
   - **Region**: Same as database
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**:
     ```
     npm install -g pnpm && NODE_ENV=development pnpm install && pnpm db:generate && pnpm db:push && pnpm db:seed && pnpm build
     ```
   - **Start Command**:
     ```
     pnpm --filter @gym/web start
     ```

### Step 3: Add Environment Variables

Add each variable from the [Environment Variables](#environment-variables) section.

**Important**: For DATABASE_URL, use the **Connect** button to link to your database.

### Step 4: Deploy

Click **Create Web Service** and wait for the build to complete.

---

## Deployment Checklist

Before deploying, verify:

- [ ] `next.config.js` does NOT have `output: 'standalone'`
- [ ] `render.yaml` has correct build and start commands
- [ ] All environment variables are set in Render
- [ ] DATABASE_URL is linked to actual database (not empty)
- [ ] Build cache is cleared if making config changes

---

## Troubleshooting Commands

### Check if app is responding

```bash
curl -v https://your-app.onrender.com
```

### View Render logs

1. Go to Render Dashboard
2. Click on your web service
3. Click **Logs** tab

### Force fresh build

1. Go to **Settings** → **Build & Deploy**
2. Click **Clear build cache & deploy**

---

## Contact & Support

For issues with this deployment:
1. Check the [Common Issues](#common-issues--solutions) section
2. Review Render logs for specific error messages
3. Ensure all environment variables are correctly set
