import { Users, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  {
    name: 'Total Members',
    value: '0',
    change: '+0%',
    icon: Users,
  },
  {
    name: 'Active Subscriptions',
    value: '0',
    change: '+0%',
    icon: TrendingUp,
  },
  {
    name: 'Classes This Week',
    value: '0',
    change: '+0%',
    icon: Calendar,
  },
  {
    name: 'Monthly Revenue',
    value: '$0',
    change: '+0%',
    icon: DollarSign,
  },
];

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" description="Overview of your gym performance" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recent activity to display. Start by adding members or creating classes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No upcoming classes scheduled. Create your first class to get started.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                1
              </div>
              <div>
                <h4 className="font-medium">Create your gym profile</h4>
                <p className="text-sm text-muted-foreground">
                  Set up your gym details, branding, and preferences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                2
              </div>
              <div>
                <h4 className="font-medium">Add membership plans</h4>
                <p className="text-sm text-muted-foreground">
                  Create subscription plans for your members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                3
              </div>
              <div>
                <h4 className="font-medium">Set up classes</h4>
                <p className="text-sm text-muted-foreground">
                  Create your class schedule and start accepting bookings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
