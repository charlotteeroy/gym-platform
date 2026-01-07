import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="font-bold text-xl">GymPlatform</div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              The Modern Gym Management Platform
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Streamline your gym operations with member management, class scheduling,
              subscriptions, and powerful analytics. Built for fitness businesses that
              want to grow.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">Start Free Trial</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-24">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Member Management</h3>
                <p className="mt-2 text-muted-foreground">
                  Track members, manage subscriptions, and monitor engagement all in one place.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Class Scheduling</h3>
                <p className="mt-2 text-muted-foreground">
                  Create recurring classes, manage bookings, and handle waitlists automatically.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Analytics & Insights</h3>
                <p className="mt-2 text-muted-foreground">
                  Understand your business with real-time metrics, trends, and member insights.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} GymPlatform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
