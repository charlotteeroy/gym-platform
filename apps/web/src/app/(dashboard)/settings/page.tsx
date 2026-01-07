'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      gymName: '',
      email: '',
      phone: '',
      address: '',
      timezone: 'UTC',
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setIsLoading(true);

    try {
      // TODO: Implement settings update API
      console.log('Settings data:', data);

      toast({
        title: 'Settings saved',
        description: 'Your gym settings have been updated.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header title="Settings" description="Manage your gym settings and preferences" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Gym Information */}
        <Card>
          <CardHeader>
            <CardTitle>Gym Information</CardTitle>
            <CardDescription>
              Basic information about your gym that will be displayed to members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gymName">Gym Name</Label>
                <Input id="gymName" {...register('gymName')} disabled={isLoading} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" {...register('email')} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" {...register('phone')} disabled={isLoading} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} disabled={isLoading} />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Subscription Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Membership Plans</CardTitle>
            <CardDescription>
              Configure the membership plans available to your members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No membership plans configured yet.
            </p>
            <Button variant="outline">
              Add Membership Plan
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>
              Connect your Stripe account to accept payments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Stripe</h4>
                <p className="text-sm text-muted-foreground">
                  Not connected
                </p>
              </div>
              <Button variant="outline">
                Connect Stripe
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your gym data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Delete Gym</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your gym and all associated data.
                </p>
              </div>
              <Button variant="destructive">
                Delete Gym
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
