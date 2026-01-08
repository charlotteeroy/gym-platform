# Gym Platform

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/charlotteeroy/gym-platform)

A full-stack gym management platform with member portal, calendar view, and progress tracking.

## Features

- Staff dashboard for gym management
- Member portal with class booking
- Drag-and-drop calendar for class schedules
- Progress tracking for members
- Subscription management
- Prisma + PostgreSQL database

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe
- **Testing**: Playwright, Vitest
- **Build**: Turborepo, pnpm

## Deploy

Click the button above to deploy to Render. It will:
1. Create a PostgreSQL database
2. Build and deploy the Next.js app
3. Set up all environment variables automatically

## Getting Started (Local Development)

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the database:
   ```bash
   docker-compose up -d
   ```

4. Run database migrations:
   ```bash
   pnpm db:push
   ```

5. Seed the database:
   ```bash
   pnpm db:seed
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Gym Owner | owner@testgym.com | TestOwner123! |
| Member | member@testgym.com | TestMember123! |
