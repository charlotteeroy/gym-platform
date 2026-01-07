import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getBookingsData() {
  const session = await getSession();
  if (!session) return null;

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id },
  });

  if (!member) return null;

  const now = new Date();

  const [upcomingBookings, pastBookings] = await Promise.all([
    prisma.booking.findMany({
      where: {
        memberId: member.id,
        session: { startTime: { gte: now } },
      },
      include: {
        session: {
          include: {
            class: {
              include: {
                instructor: true,
              },
            },
          },
        },
      },
      orderBy: { session: { startTime: 'asc' } },
    }),
    prisma.booking.findMany({
      where: {
        memberId: member.id,
        session: { startTime: { lt: now } },
      },
      include: {
        session: {
          include: {
            class: {
              include: {
                instructor: true,
              },
            },
          },
        },
      },
      orderBy: { session: { startTime: 'desc' } },
      take: 10,
    }),
  ]);

  return { member, upcomingBookings, pastBookings };
}

function formatDateDisplay(date: Date, format: 'day' | 'time' | 'full'): string {
  const d = new Date(date);
  if (format === 'day') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (format === 'time') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function BookingsPage() {
  const data = await getBookingsData();

  if (!data) {
    redirect('/member-login');
  }

  const { upcomingBookings, pastBookings } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your class bookings
        </p>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Classes</CardTitle>
              <CardDescription>
                {upcomingBookings.length} upcoming{' '}
                {upcomingBookings.length === 1 ? 'class' : 'classes'}
              </CardDescription>
            </div>
            <Button asChild>
              <Link href="/portal/classes">Book More</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No upcoming classes booked</p>
              <Button asChild>
                <Link href="/portal/classes">Browse Classes</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-2 h-16 rounded-full"
                      style={{
                        backgroundColor: booking.session.class.color || '#3b82f6',
                      }}
                    />
                    <div>
                      <p className="font-semibold text-lg">
                        {booking.session.class.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateDisplay(booking.session.startTime, 'day')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateDisplay(booking.session.startTime, 'time')}
                        </span>
                      </div>
                      {booking.session.class.instructor && (
                        <p className="text-sm text-muted-foreground mt-1">
                          with {booking.session.class.instructor.firstName}{' '}
                          {booking.session.class.instructor.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Classes</CardTitle>
            <CardDescription>Your recent class history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-10 rounded-full opacity-50"
                      style={{
                        backgroundColor: booking.session.class.color || '#3b82f6',
                      }}
                    />
                    <div>
                      <p className="font-medium">{booking.session.class.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateDisplay(booking.session.startTime, 'full')} at{' '}
                        {formatDateDisplay(booking.session.startTime, 'time')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {booking.attendedAt ? 'Attended' : 'Completed'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
