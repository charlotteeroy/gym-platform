# Smashbox - Claude Code Documentation

## Project Overview

**Smashbox** is the operating system for modern fitness businesses — a multi-tenant gym management platform that gives independent gym owners the power of a large enterprise with the simplicity of a startup.

### What We're Building

A single platform where gym owners can manage operations, build community, and increase revenue while creating member loyalty that makes businesses resilient.

| Stakeholder | Value Proposition |
|-------------|-------------------|
| **Owners** | Predictable revenue, Stripe-worthy reliability, loyalty tools |
| **Members** | Apple-worthy experience, visible progress, a gym they never want to leave |
| **Coaches** | Tools to retain clients, track progress, earn transparently |

### Target Market

- **Traditional gyms** (50-500 members): Need modern registration, member management, and re-engagement tools
- **CrossFit gyms** (50-200 members): Community-focused, need WOD/PR tracking, coach visibility, leaderboards

### Core Capabilities

| Domain | Features |
|--------|----------|
| **Operations** | Member management, class scheduling, QR check-ins, staff administration |
| **Billing** | Stripe payments, invoices, expense tracking, failed payment recovery |
| **Loyalty** | At-risk member alerts, engagement tiers (Bronze→Platinum), automated flows |
| **Community** | Achievement feeds, opt-in leaderboards, workout partners, coach connections |
| **Analytics** | Revenue forecasts, lifetime value analysis, churn prediction |

### Links

| Environment | URL |
|-------------|-----|
| **Production** | https://smashbox.onrender.com |
| **Local Dev** | http://localhost:3000 |
| **Demo Login** | `owner@demo.com` / `password123` |

---

# DEVELOPMENT GUIDELINES

## Before Building Any Feature

**ALWAYS reference this CLAUDE.md file** to ensure alignment with:
- Product vision and positioning
- Target market needs (Traditional gyms vs CrossFit)
- Feature roadmap and current phase
- Member engagement tier system
- Technical patterns and conventions

## After Completing Any Feature

### 1. Update Documentation

Add the feature to the appropriate section in this file:
- New API endpoints → Add to "Database Schema Overview" or create new section
- New pages → Add to "App Router Structure"
- New models → Add to "Database Schema Overview"
- Bug fixes/patterns → Add to "Known Issues & Solutions"

### 2. Add Code Documentation

```typescript
/**
 * [Feature Name]
 *
 * Purpose: [What this feature does and why]
 * Product Context: [Link to product vision - e.g., "Supports Loyalty Pillar - At-risk member alerts"]
 *
 * @see CLAUDE.md - [Relevant section]
 */
```

### 3. Update Seed Data (if applicable)

If the feature introduces new data models, add realistic demo data to `packages/database/src/seed.ts`.

---

# PART 1: PRODUCT VISION

## Smashbox Product Vision

**The operating system for modern fitness businesses.**

We give gym owners the power of a large enterprise with the simplicity of a startup: manage your operations, build a community, and increase your revenue, all from a single platform that builds member loyalty and makes businesses resilient.

**For owners:** Predictable revenue. Stripe-worthy reliability. A loyalty tool.
**For members:** An Apple-worthy experience. Visible progress. A fitness place they never want to leave.

---

## Target Market

| Segment | Size | Why Smashbox wins |
|---------|------|-------------------|
| **Traditional gyms** | 50 to 500 members | Need for modern registration, member management, and re-engagement tools to compete with brick-and-mortar stores |
| **CrossFit gyms** | 50 to 200 members | Community-focused, enjoy leaderboards, need WOD/PR tracking, coach visibility is important |

**Not initially targeted:** yoga/Pilates studios (gamification does not fit with brand image), large corporate chains (different sales cycle and needs).

---

## The Smashbox Flywheel

```
Member sets goals → Tracks progress via Apple Health → Hits milestones
        ↓                                                      ↓
Earns rewards & status                              Feels invested in journey
        ↓                                                      ↓
Engages with community ← Connects with trainers ← Attends consistently
        ↓                                                      ↓
Refers friends                                      Doesn't want to leave
        ↓                                                      ↓
        └──────────→ Predictable, growing revenue ←────────────┘
```

---

## Owner Experience: Three Pillars

### 1. Operational Simplicity

**One system for everything**
- Members, classes, payments, staff: no more juggling between different tools
- Clear dashboard with daily overview: who's coming, what's due, what needs attention

**Class management**
- Drag-and-drop planning
- Assign coaches to classes (visible to members)
- Capacity limits and automatic waiting lists
- Recurring classes and easy rescheduling

**Registration system**
- QR code scanning (member app or printed card)
- Kiosk mode for reception
- Real-time attendance tracking
- Reporting of absences and late cancellations

**Payment processing**
- Stripe integration: memberships, class packages, single classes, personal training sessions, retail sales
- Automatic recovery of failed payments
- Reminder sequences to preserve revenue
- Clear reports on revenue by source

---

### 2. Loyalty as a System

**Alerts about at-risk members**

Automatic alerts when members show signs of disengagement:
- More than 50% drop in attendance compared to average
- No reservations for more than 14 days
- Failed payment
- Contract expiring within 30 days
- Decrease in engagement score

**Weekly "Members to save" report**
- Priority list of at-risk members
- Suggested actions for each
- One-click communication templates

**Messaging center**

| Feature | Details |
|---------|---------|
| Segmentation | Targeting by status, presence, plan type, risk level |
| Multichannel | Email, push notifications, SMS, integrated app—all in one place |
| Templates | Predefined campaigns: win back, anniversary, milestone, announcement |
| Automation | Behavior-triggered messages (2 weeks missed → automatic contact) |
| Tracking | Open rate, click-through rate, use of offers |

**Example Automated Flows:**

1. **Win-Back Inactive Members**
   - Trigger: Member hasn't checked in for 14 days
   - Condition: Membership is still active
   - Action: Send email "We miss you! Here's 20% off a PT session"
   - Wait: 7 days
   - Action: If still inactive, send SMS reminder

2. **New Member Welcome**
   - Trigger: Member signs up
   - Action: Send welcome email immediately
   - Wait: 3 days
   - Action: Send "Book your first class" email
   - Wait: 7 days
   - Action: Send "Meet our trainers" email

3. **Renewal Reminder**
   - Trigger: Membership expires in 14 days
   - Action: Send renewal reminder email
   - Wait: 7 days
   - Action: If not renewed, send discount offer
   - Wait: 3 days
   - Action: Send final reminder SMS

4. **Birthday Reward**
   - Trigger: Member's birthday is tomorrow
   - Action: Send birthday email with free guest pass

---

### 3. Long-term Resilience

**Revenue forecasts**
- 30/60/90-day revenue forecasts
- Based on active subscriptions, renewal dates, and churn probability
- "If current trends continue, expect €14,200 next month."

**Diversified revenue tracking**
- View revenue by source: subscriptions, class packages, personal training, single classes, retail sales
- Identify sources of revenue that are growing or declining
- Reduce your dependence on a single type of revenue

**Lifetime value analysis**
- Which member segments are the most profitable?
- Which acquisition channels generate long-term members?
- Which types of courses are associated with the longest retention?

**Contract and renewal visibility**
- Upcoming renewal calendar
- Automatic renewal reminders to members
- Flagging members who are likely to unsubscribe upon renewal

**Reliable infrastructure**
- 99.9% availability target
- Automatic backups
- Stripe-level payment reliability
- Designed to scale: start with a single site, grow without changing platforms

---

## Coach Experience

Coaches are often the best lever for customer loyalty. They need to be given the tools that make their work easier and keep their clients coming back.

**Coach dashboard**
- Their upcoming classes
- Their PT clients and session history
- Client progress at a glance

**Program creator**
- Create training programs spanning several weeks
- Assign them to individual clients
- Track completion and progress

**Client information**
- View attendance habits
- Apple Health data (with member permission)
- Notes and session history

**Revenue transparency**
- Tracking of PT sessions provided
- Visibility into revenue distribution
- Payment history

---

## Member Engagement Tiers

| Tier | Visits/Month | % of Typical Gym | Profile |
|------|--------------|------------------|---------|
| **Super Active** | 16+ | 5-10% | Your champions. Come almost daily. |
| **High Active** | 10-15 | 15-20% | Consistent regulars. 3-4x per week. |
| **Active** | 5-9 | 25-30% | Solid members. 1-2x per week. |
| **Low Active** | 1-4 | 20-25% | Occasional. Risk of fading out. |
| **Dormant** | 0 (last 30 days) | 15-25% | Haven't shown up. High churn risk. |

---

### Detailed Tier Breakdown

#### Super Active (16+ visits/month)

**Who they are:**
- Your gym's core. Almost daily attendance.
- Often training for something (competition, transformation, lifestyle)
- Likely use multiple services (classes + PT + open gym)

**Value to gym:**
- Highest lifetime value
- Word-of-mouth ambassadors
- Community anchors (other members know them)

**Risk:**
- Burnout or injury could cause sudden drop
- If they leave, they take social connections with them

**Actions:**
- Recognize publicly (leaderboards, shoutouts)
- Invite to be ambassadors or beta testers
- Watch for sudden attendance drops (injury signal)
- Offer leadership roles (help with new members)

**Rewards tier mapping:** Platinum

---

#### High Active (10-15 visits/month)

**Who they are:**
- Consistent 3-4x per week
- Established routine
- Likely have favorite classes/trainers

**Value to gym:**
- Reliable revenue, low churn risk
- Often convert to higher tiers with encouragement

**Risk:**
- Schedule changes (new job, life event) can disrupt

**Actions:**
- Encourage toward Super Active ("You're 2 visits from Platinum this month")
- Feature in community feed achievements
- Offer first access to new classes/programs

**Rewards tier mapping:** Gold

---

#### Active (5-9 visits/month)

**Who they are:**
- 1-2x per week, decent habit
- May not have strong community ties yet
- Often newer members finding their rhythm

**Value to gym:**
- Solid base, room to grow
- Responsive to engagement efforts

**Risk:**
- Habit not fully locked in
- Easily disrupted by life events

**Actions:**
- Encourage consistency ("3 more visits this month for Silver status")
- Suggest workout buddies or community events
- Personalized class recommendations based on preferences

**Rewards tier mapping:** Silver (or working toward it)

---

#### Low Active (1-4 visits/month)

**Who they are:**
- Sporadic attendance
- May have lost motivation or facing barriers
- Often paying but not using membership

**Value to gym:**
- Revenue now, but high churn risk
- "Zombie members" — paying but disengaged

**Risk:**
- Next step is often cancellation
- May feel guilty and avoid gym entirely

**Actions:**
- Proactive outreach ("We haven't seen you in a while — everything okay?")
- Offer low-commitment re-engagement (one class, no pressure)
- Ask about barriers (time, intimidation, goals unclear)
- Suggest PT intro session to reignite motivation

**Rewards tier mapping:** Bronze

---

#### Dormant (0 visits in last 30 days)

**Who they are:**
- Stopped coming entirely
- May have mentally quit but not canceled yet
- Some are seasonal (vacation, travel, illness)

**Value to gym:**
- Revenue at risk
- Recovery possible with right approach

**Risk:**
- Cancellation imminent
- Negative word-of-mouth if they feel ignored

**Actions:**
- Immediate win-back campaign (personal message, not blast)
- Offer pause option instead of cancel
- "We miss you" with specific incentive (free PT session, guest pass)
- If contract ending, prioritize personal call

---

## Member Experience: Four Pillars

### 1. Visible, Personal Progress

Members set their goals and Smashbox automatically tracks all their progress.

**Goal dashboard**
- Choose the type of goal: attendance-based ("3 times a week"), results-based ("lose 5 kg"), or program-based ("complete the 8-week strength training program")
- Visual progress bar: "You have achieved 67% of your goal for the first quarter."
- Weekly review: "You've completed 4 sessions this week, one more than last week."

**Apple Health integration**
- Automatic synchronization: workouts, heart rate, calories, steps, recovery
- History: view your fitness trends over several months

**Achievements and milestones**
- Visual badges: "First 10 classes," "30 consecutive days," "5 a.m. warrior," "Personal best"
- Progress timeline: where you started and where you are today
- Shareable moments: post your achievements on the community news feed

---

### 2. Rewards That Reward Consistency

**Multi-level status system**

| Level | Requirements | Rewards |
|-------|--------------|---------|
| **Bronze** | Active Member | Basic access |
| **Silver** | 8+ classes/month for 2 months | Priority booking, free guest pass/month |
| **Gold** | 12+ classes/month for 3 months | Exclusive classes, free promotional item, intro PT session |
| **Platinum** | 16+ classes/month for 6 months | Full VIP experience, new class notifications, members' wall recognition |

**Why prioritize non-monetary benefits**
- Priority booking (no extra cost, feeling of privilege)
- Exclusive access to classes (creates scarcity and status)
- Free guest passes (acquisition channel disguised as a reward)
- Merchandise (low cost, high perceived value)
- Public recognition (free, highly motivating)

**Financial rewards reserved for:**
- Recapture campaigns (at-risk members)
- Referral bonuses (acquisition of new members)
- Gifts marking an important milestone (100th class = one month free)

---

### 3. A Community That Creates Belonging

**Community news feed**
- Publicly celebrate members' achievements: "Sarah has just reached 100 classes!"
- Gym announcements by owners
- Class recaps and photos
- Opt-in: members control what is shared

**Leaderboards (opt-in)**
- Monthly attendance leaderboards
- Series rankings
- CrossFit-specific: WOD times, personal record tracking, benchmark comparisons
- Friendly competition without pressure — always optional

**Workout partners**
- Connect members with similar goals or schedules
- "3 members like you also participate in HIIT on Tuesdays at 6 p.m."
- Encourages accountable partnerships

**Class community**
- Find out who else is enrolled in your class
- Regulars become familiar faces
- Builds relationships that make leaving seem like a loss

---

### 4. Connection with Coaches

**Trainer profiles**
- Photo, biography, specialties, certifications
- Member reviews and ratings
- "Book a training session" directly from the profile

**Visibility of coaches in classes**
- Each class indicates which trainer is teaching
- Members can filter schedules based on their preferred trainer
- "Follow" a coach to be notified when they are teaching

**Relationship between coach and member**
- Coaches can assign programs to members
- Progress notes visible to both the member and the coach
- Direct messaging for accountability and support

---

## Onboarding

### For Members (First 30 Days)

| Day | Touchpoint |
|-----|------------|
| 0 | Welcome email + invitation to download the app |
| 1 | Guided goal-setting process in the app |
| 3 | "How did your first class go?" |
| 7 | First achievement unlocked ("First week completed") |
| 14 | Progress check: "You've attended X classes — here's where you are in relation to your goal" |
| 21 | Suggest a coach introduction or pairing |
| 30 | "First month completed" badge + invitation to book the following week |

**Quick progress tracking**
- Easy-to-achieve milestones to build momentum
- "First class booked," "First workout completed," "Goal set," "Apple Health connected"
- Psychological investment from day one
- Trigger a notification to trainers that someone new is coming in (autopilot welcome)

### For Owners

| Step | Time |
|------|------|
| Create an account | 2 min |
| Import members (CSV or manually) | 5 to 15 min |
| Connect Stripe | 5 min |
| Set up your first class | 3 min |
| Invite the first member | 1 min |

**Goal: be up and running in less than 30 minutes.**

---

## Segment-Specific Features

| Feature | Traditional Gym | CrossFit |
|---------|-----------------|----------|
| Registration via QR code | Essential | Useful |
| Course booking | Useful | Essential |
| Waiting lists | Optional | Useful |
| Rankings | Optional | Essential |
| WOD/PR tracking | N/A | Essential |
| Coach visibility | Useful | Essential |
| Community news feed | Optional | Essential |
| Premium app | Useful | Useful |

---

## Feature Roadmap

| Phase | Focus | Features | Why Now |
|-------|-------|----------|---------|
| **2** | Get paid | Full Stripe billing, recovery of failed payments | Can't monetize without this |
| **2** | Daily touchpoint | QR code registration, attendance tracking | Makes the product more concrete |
| **3** | Build loyalty | Messaging center, risk alerts, basic segments | Stop the bleeding first |
| **3** | Integration | New member flow, quick win tracking, owner setup wizard | Win the first 30 days |
| **4** | Engagement | Goal setting, Apple Health sync, achievements | Emotional investment |
| **4** | Reward | Multi-level system, non-monetary rewards | Incentive to participate |
| **5** | Community | Feeds, rankings (opt-in), training partners | Cost of social change |
| **5** | Coaches | Profiles, course assignment visibility, PT booking | Unlocking the coach relationship |
| **6** | Scalability | White label app, multi-site, benchmarking | Growth infrastructure |

---

## Positioning Summary

**Smashbox: the operating system for gyms that builds member loyalty and strengthens business resilience.**

**For investors:** "We are building the Shopify of fitness, a platform that enables independent gyms to compete with high-end chains by providing them with professional tools, member engagement, and predictable economics."

**For gym owners:** "Stop chasing members. Create a gym they won't want to leave."

**For members:** "Your fitness journey tracked. Your efforts rewarded. Your community integrated."

---

# PART 2: TECHNICAL DOCUMENTATION

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.3+ |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui (Radix primitives) |
| **Icons** | Lucide React |
| **Validation** | Zod |
| **Build** | Turborepo |
| **Package Manager** | pnpm 8.15+ |
| **Node Version** | 20+ |
| **Hosting** | Render.com |

---

## Monorepo Structure

```
gym-platform/
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   │   ├── (auth)/     # Public auth pages (login, register)
│       │   │   ├── (dashboard)/# Staff/admin dashboard pages
│       │   │   ├── (portal)/   # Member portal pages
│       │   │   └── api/        # API routes
│       │   ├── components/     # React components
│       │   │   ├── layout/     # Sidebar, header, etc.
│       │   │   ├── members/    # Member-related components
│       │   │   ├── admin/      # Admin panel components
│       │   │   └── ui/         # shadcn/ui components
│       │   └── lib/            # Utilities (auth, api helpers)
│       └── next.config.js
├── packages/
│   ├── core/                   # Business logic & services
│   │   └── src/
│   │       ├── services/       # auth.service, member.service, etc.
│   │       └── index.ts
│   ├── database/               # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── index.ts        # Exports prisma client
│   │       └── seed.ts         # Database seeding
│   └── shared/                 # Shared types & schemas
│       └── src/
│           ├── types/          # TypeScript types
│           └── schemas/        # Zod validation schemas
├── turbo.json                  # Turborepo configuration
├── render.yaml                 # Render deployment config
└── package.json
```

### Package Dependencies

- `@gym/web` imports from `@gym/core`, `@gym/database`, `@gym/shared`
- `@gym/core` imports from `@gym/database`, `@gym/shared`
- `@gym/shared` has no internal dependencies

---

## Key Commands

```bash
# Development
pnpm dev                    # Start dev server (runs all workspaces)
pnpm build                  # Build all packages

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:push                # Push schema to database (no migration)
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed database with demo data
pnpm db:studio              # Open Prisma Studio GUI

# Testing
pnpm test                   # Run all tests
pnpm test:e2e               # Run Playwright E2E tests

# Linting & Formatting
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript check
pnpm format                 # Prettier
```

---

## Authentication System

**Type**: Custom session-based authentication (NOT NextAuth)

### How It Works

1. **Login**: User submits credentials to `/api/auth/login`
2. **Session Creation**: Server creates a `Session` record in database with unique token
3. **Cookie**: Session token stored in HTTP-only `session` cookie
4. **Validation**: Each request validates session via `getSession()` in `lib/auth.ts`

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/auth.ts` | Session helpers (`getSession`, `getCurrentUser`, `getStaffWithGym`) |
| `apps/web/src/middleware.ts` | Route protection |
| `packages/core/src/services/auth.service.ts` | Auth business logic |
| `apps/web/src/app/api/auth/login/route.ts` | Login endpoint |
| `apps/web/src/app/api/auth/logout/route.ts` | Logout endpoint |

### Route Protection

```typescript
// middleware.ts routes
const publicRoutes = ['/', '/login', '/register', '/member-login', '/member-signup'];
const adminRoutes = ['/dashboard', '/members', '/subscriptions', '/settings'];
const memberRoutes = ['/classes', '/portal'];
```

- **Public routes**: No authentication required
- **Admin routes**: Redirect to `/login` if not authenticated
- **Member routes**: Redirect to `/member-login` if not authenticated
- **API routes**: Not handled by middleware, use `getSession()` directly

---

## Multi-Tenancy

The platform supports multiple gyms with data isolation.

### Tenant Isolation

- Every data model has a `gymId` foreign key
- All queries filter by `gymId` from the authenticated staff's gym
- `getStaffWithGym()` returns staff record with associated gym

### Data Access Pattern

```typescript
// Example: Getting data for current staff's gym
const staff = await getStaffWithGym();
if (!staff) return apiForbidden('No gym access');

const members = await prisma.member.findMany({
  where: { gymId: staff.gymId },  // Always filter by gym
});
```

---

## API Response Format

All API endpoints return a consistent JSON structure:

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR",
    message: "Human readable message",
    details?: { ... }  // Optional field-level errors
  }
}
```

### API Helper Functions (`lib/api.ts`)

| Function | HTTP Status | Usage |
|----------|-------------|-------|
| `apiSuccess(data, status?)` | 200 | Successful response |
| `apiError(error, status?)` | varies | Generic error |
| `apiValidationError(details)` | 400 | Validation failure |
| `apiUnauthorized(message?)` | 401 | Not logged in |
| `apiForbidden(message?)` | 403 | No permission |
| `apiNotFound(message?)` | 404 | Resource not found |

---

## Database Schema Overview

### Core Models

| Model | Purpose |
|-------|---------|
| **Gym** | Multi-tenant root, contains all gym settings |
| **User** | Authentication credentials |
| **Session** | Active login sessions |
| **Member** | Gym members (customers) |
| **Staff** | Gym employees with roles |

### Membership & Billing

| Model | Purpose |
|-------|---------|
| **MembershipPlan** | Pricing plans (monthly, yearly, etc.) |
| **Subscription** | Member's active plan subscription |
| **Payment** | Payment records |
| **Invoice** | Invoices with line items |
| **InvoiceItem** | Invoice line items |
| **Expense** | Business expense tracking |
| **Payout** | Stripe payouts tracking |

### Classes & Scheduling

| Model | Purpose |
|-------|---------|
| **Class** | Class templates (Yoga, HIIT, etc.) |
| **RecurrenceRule** | Class scheduling rules |
| **ClassSession** | Individual class instances |
| **Booking** | Member class reservations |
| **WaitlistEntry** | Waitlist for full classes |
| **CheckIn** | Member check-in records |

### Marketing & Automation

| Model | Purpose |
|-------|---------|
| **Tag** | Member segmentation tags |
| **MemberTag** | Tag-member associations |
| **AutomatedFlow** | Triggered email/SMS sequences |
| **FlowStep** | Steps within a flow |
| **Campaign** | One-time email/SMS campaigns |

### Opportunities & Sales

| Model | Purpose |
|-------|---------|
| **Opportunity** | Upsell opportunities (upgrade, PT, renewal, add-on) |
| **OpportunityAction** | Actions taken on opportunities (calls, emails) |
| **OpportunityConversion** | Successful conversions with revenue tracking |

### Staff Roles

| Role | Permissions |
|------|-------------|
| `OWNER` | Full access, billing, can delete gym |
| `ADMIN` | Full access except billing |
| `MANAGER` | Members, classes, basic reports |
| `INSTRUCTOR` | Classes, own schedule |
| `FRONT_DESK` | Check-ins, basic member info |

---

## App Router Structure

### Route Groups

| Group | Path | Purpose |
|-------|------|---------|
| `(auth)` | `/login`, `/register` | Staff authentication |
| `(dashboard)` | `/dashboard`, `/members`, `/admin/*` | Staff dashboard |
| `(portal)` | `/portal/*` | Member self-service portal |

### Key Dashboard Pages

```
/dashboard              # Main dashboard with stats + opportunities widget
/members                # Member list and management
/members/[id]           # Individual member details
/opportunities          # Upsell opportunities with priority scoring
/admin/gym              # Gym profile settings
  /branding             # Logo, colors, theme
  /hours                # Business hours
  /policies             # Gym policies
/admin/plans            # Membership plans CRUD
/admin/staff            # Staff management
/admin/billing          # Accounting dashboard with revenue forecasting
  /payments             # Payment history
  /invoices             # Invoice management
  /expenses             # Expense tracking
  /payouts              # Payout management
```

---

## Deployment (Render)

### Configuration

Deployment is configured in `render.yaml` (Render Blueprint).

```yaml
# Database
databases:
  - name: smashbox-db
    plan: free
    region: oregon

# Web Service
services:
  - type: web
    name: smashbox
    runtime: node
    plan: free
    region: oregon
```

### Build Process

```bash
npm install -g pnpm &&
NODE_ENV=development pnpm install &&
pnpm db:generate &&
pnpm db:push &&
pnpm db:seed &&
pnpm build
```

### Start Command

```bash
pnpm --filter @gym/web start
```

### Environment Variables (Render)

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Auto-linked | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Auto-generated | Session encryption key |
| `NEXTAUTH_URL` | Manual | Production URL |
| `NODE_ENV` | `production` | Environment |
| `NODE_VERSION` | `20` | Node.js version |
| `PORT` | `10000` | Server port |
| `HOSTNAME` | `0.0.0.0` | Bind address |

### Prisma Binary Targets

For Render deployment (Debian-based), the schema includes:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

---

## Known Issues & Solutions

### 1. Standalone Mode + Prisma + pnpm

**Problem**: Next.js standalone output mode doesn't correctly include Prisma engine files in pnpm monorepos.

**Solution**: Don't use standalone mode. Regular `next start` works correctly.

```javascript
// next.config.js - DO NOT add these:
// output: 'standalone',
// outputFileTracingRoot: path.join(__dirname, '../../'),
```

### 2. Render Dashboard vs render.yaml

**Problem**: After code changes, Render may use cached settings from dashboard instead of render.yaml.

**Solution**: Manually update Build Command and Start Command in Render dashboard, or use "Clear build cache & deploy".

### 3. Members API Response Structure

**Pattern**: The members list API returns:
```typescript
{
  success: true,
  data: {
    items: [...],  // Array of members
    meta: { ... }  // Pagination metadata
  }
}
```

When fetching members for dropdowns, access `data.data.items` not `data.data.members`.

---

## Seed Data

The database seed (`packages/database/src/seed.ts`) creates:

- 1 Demo Gym ("SmashBox Fitness")
- 1 Owner account (`owner@demo.com` / `password123`)
- 3 Membership plans (Basic, Premium, VIP)
- 5 Staff members (various roles)
- 20 Members with subscriptions
- Sample classes (Yoga, HIIT, Spin, etc.)
- Sample payments, invoices, expenses, payouts

---

## Code Conventions

### File Naming

- Components: `PascalCase.tsx`
- API routes: `route.ts`
- Utils/hooks: `camelCase.ts`
- Schema files: `*.schema.ts`
- Service files: `*.service.ts`

### Component Structure

```typescript
// Typical page component
export default async function PageName() {
  // Server-side data fetching
  const session = await getSession();
  const data = await prisma.model.findMany({ ... });

  return <ClientComponent initialData={data} />;
}
```

### API Route Structure

```typescript
import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const schema = z.object({ ... });

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const staff = await getStaffWithGym();
    if (!staff) return apiForbidden('No gym access');

    // Check role permissions
    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('Permission denied');
    }

    // Business logic
    const data = await prisma.model.findMany({
      where: { gymId: staff.gymId },
    });

    return apiSuccess(data);
  } catch (error) {
    console.error('Error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed' }, 500);
  }
}
```

---

## Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd gym-platform

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your DATABASE_URL

# 4. Set up database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 5. Start development server
pnpm dev

# 6. Open http://localhost:3000
# Login: owner@demo.com / password123
```

---

## Implemented Features

### Revenue Forecasting & Churn Prediction

**Purpose:** Provides 30/60/90-day revenue projections and churn risk analysis for the billing dashboard.
**Product Context:** Supports Owner Pillar - "Long-term Resilience" with predictive analytics.

#### Components

| File | Purpose |
|------|---------|
| `packages/core/src/services/forecast.service.ts` | Core forecasting calculations and churn risk analysis |
| `apps/web/src/app/api/admin/billing/forecast/route.ts` | API endpoint for forecast data |
| `apps/web/src/components/admin/forecast-cards.tsx` | 30/60/90 day revenue forecast cards |
| `apps/web/src/components/admin/churn-risk-panel.tsx` | At-risk members panel with risk scores |
| `apps/web/src/components/admin/revenue-chart.tsx` | Historical + projected revenue chart (recharts) |
| `apps/web/src/components/admin/scenario-modal.tsx` | What-if analysis for scenario modeling |

#### Key Algorithms

**Normalized MRR Calculation:**
```typescript
// Convert billing intervals to monthly equivalent
WEEKLY: 4.33     // 52 weeks / 12 months
MONTHLY: 1
QUARTERLY: 0.333 // 1/3
YEARLY: 0.0833   // 1/12
```

**Churn Risk Score (0-100):**
- No activity in 14 days: +25 points
- No activity in 30+ days: +20 points
- Never checked in: +15 points
- No recent bookings: +10 points
- Scheduled to cancel: +30 points
- Payment past due: +20 points
- New member (< 90 days): +5 points
- Activity decline 50%+: +15 points

#### API Response Structure

```typescript
GET /api/admin/billing/forecast

{
  success: true,
  data: {
    currentMRR: number,
    normalizedMRR: number,
    activeSubscriptions: number,
    avgSubscriptionValue: number,
    forecasts: RevenueForecast[],  // 30/60/90 day projections
    churn: ChurnMetrics,
    atRiskMembers: ChurnRiskMember[],
    history: { months: string[], actualRevenue: number[] },
    renewalsByWeek: { week: string, count: number, revenue: number }[]
  }
}
```

---

### Opportunities & Upsell System

**Purpose:** Automatically detects upsell opportunities based on member behavior and provides tools to send personalized offers.
**Product Context:** Supports Owner Pillar - "Long-term Resilience" with revenue diversification and proactive member engagement.

#### Database Models

```prisma
model Opportunity {
  id                  String                @id @default(cuid())
  type                OpportunityType       // UPGRADE, PERSONAL_TRAINING, RENEWAL, ADDON, CROSS_SELL
  status              OpportunityStatus     // NEW, CONTACTED, FOLLOW_UP, WON, LOST, DISMISSED, EXPIRED
  confidence          OpportunityConfidence // HIGH, MEDIUM, LOW
  title               String
  reason              String
  potentialValue      Decimal
  recommendedAction   String
  contactedAt         DateTime?
  memberId            String
  gymId               String
}

model OpportunityAction {
  id              String      @id @default(cuid())
  opportunityId   String
  action          String      // "email_sent", "call_made", "discount_offered"
  notes           String?
}

model OpportunityConversion {
  id              String      @id @default(cuid())
  opportunityId   String      @unique
  convertedTo     String
  revenueAmount   Decimal
  daysToConvert   Int
}
```

#### Components

| File | Purpose |
|------|---------|
| `packages/core/src/services/opportunity.service.ts` | Detection algorithms and management |
| `apps/web/src/app/api/opportunities/route.ts` | List opportunities + trigger detection |
| `apps/web/src/app/api/opportunities/[id]/route.ts` | Get/update single opportunity |
| `apps/web/src/app/api/opportunities/[id]/actions/route.ts` | Log actions taken |
| `apps/web/src/app/api/opportunities/[id]/convert/route.ts` | Record conversions |
| `apps/web/src/app/(dashboard)/opportunities/page.tsx` | Opportunities page with filters |
| `apps/web/src/components/opportunities/send-offer-modal.tsx` | Personalized offer modal |
| `apps/web/src/components/dashboard/opportunities-widget.tsx` | Dashboard widget |

#### Detection Algorithms

| Type | Target Members | Key Signals | Potential Value |
|------|----------------|-------------|-----------------|
| **Upgrade** | Members on lower plans with 5+ visits/month | Engagement tier, class bookings, tenure | Plan price difference × 12 |
| **Personal Training** | Active members without PT purchases | New member window (90 days), high engagement | Starter PT package price |
| **Save from Cancellation** | Subscriptions with `cancelAtPeriodEnd=true` | Days until cancel, engagement level | Annual retention value |
| **Add-on** | Members with 6+ of same class type/month | Class frequency, no recent pack purchase | Class pack price |

#### Priority Scoring (0-100 points)

```typescript
// Confidence: HIGH = 30pts, MEDIUM = 18pts, LOW = 8pts
// Value: Up to 25pts based on relative value to max
// Type urgency: RENEWAL = 20pts, UPGRADE = 12pts, PT = 10pts
// Expiration: ≤3 days = 15pts, ≤7 days = 10pts, ≤14 days = 5pts
// Status: NEW = 10pts, FOLLOW_UP = 8pts, CONTACTED = 3pts

Priority Labels:
- 75+: 🔥 Hot
- 55-74: ⚡ High
- 35-54: 📊 Medium
- <35: 📋 Low
```

#### Cooling Off Period

Members contacted within the last **5 days** are automatically filtered out to prevent over-contacting:

```typescript
const COOLING_OFF_DAYS = 5;

function isRecentlyContacted(opportunity: Opportunity): boolean {
  if (!opportunity.contactedAt) return false;
  const daysSinceContact = (Date.now() - contactedAt) / (1000 * 60 * 60 * 24);
  return daysSinceContact < COOLING_OFF_DAYS;
}
```

#### Personalized Offer Modal

The send offer modal includes:
- **Channel Selection**: Email, SMS, or Push notification
- **AI-Suggested Messages**: Pre-generated based on opportunity type and member context
- **Follow-up Scheduling**: Date picker for reminder
- **Action Logging**: All sent messages are logged to opportunity history

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/opportunities` | GET | List with filters (type, status, confidence) |
| `/api/opportunities` | POST | Trigger detection scan |
| `/api/opportunities/[id]` | GET | Full opportunity details |
| `/api/opportunities/[id]` | PATCH | Update status (contacted, won, lost) |
| `/api/opportunities/[id]/actions` | POST | Log action taken |
| `/api/opportunities/[id]/convert` | POST | Record conversion |

#### UI Features

1. **Value-Based Grouping**: Opportunities split into "High Potential Value" and "Medium Potential Value" sections
2. **Priority Ranking**: Numbered 1, 2, 3... with gold/silver/bronze styling for top 3
3. **Quick Actions**: Send Offer, Call, Mark Won/Lost, Dismiss
4. **Dashboard Widget**: Top 5 opportunities with quick links

---

## Future Considerations

- **Stripe Integration**: Models include `stripeCustomerId`, `stripeSubscriptionId`, `stripePayoutId` fields ready for Stripe Connect
- **Email/SMS**: `AutomatedFlow` and `Campaign` models support future email/SMS integration
- **Apple Health**: Member experience pillar requires iOS app with HealthKit integration
- **Mobile App**: API-first design supports future React Native or native mobile clients
- **White Label**: Phase 6 roadmap includes white-label app capability for gyms
