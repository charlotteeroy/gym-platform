import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Calendar } from 'lucide-react';

async function getMemberData() {
  const session = await getSession();
  if (!session) return null;

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id },
    include: {
      user: true,
      gym: true,
    },
  });

  return member;
}

function formatDateDisplay(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ProfilePage() {
  const member = await getMemberData();

  if (!member) {
    redirect('/member-login');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {member.firstName} {member.lastName}
              </CardTitle>
              <CardDescription>
                Member at {member.gym.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Your contact details on file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{member.phone || 'Not provided'}</p>
            </div>
          </div>

          {member.dateOfBirth && (
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {formatDateDisplay(member.dateOfBirth)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      {member.emergencyContact && (
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Contact person in case of emergency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="font-medium">
                {(member.emergencyContact as { name?: string; phone?: string })?.name || 'Not provided'}
              </p>
              <p className="text-sm text-muted-foreground">
                {(member.emergencyContact as { name?: string; phone?: string })?.phone || ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Account Email</p>
              <p className="font-medium">{member.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {formatDateDisplay(member.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
