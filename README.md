# Gym Platform

A full-stack gym management platform with member portal, calendar view, and progress tracking.

## Features

- Staff dashboard for gym management
- Member portal with class booking
- Calendar view for class schedules
- Progress tracking for members
- Stripe integration for payments
- Prisma + PostgreSQL database

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe
- **Testing**: Playwright, Vitest
- **Build**: Turborepo, pnpm

## Getting Started

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

5. Start the development server:
   ```bash
   pnpm dev
   ```
