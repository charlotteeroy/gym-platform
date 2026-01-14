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

      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-3xl">
        {/* Gym Information */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">Gym Information</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Basic information about your gym that will be displayed to members.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gymName" className="text-sm">Gym Name</Label>
                <Input id="gymName" {...register('gymName')} disabled={isLoading} className="h-10" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Contact Email</Label>
                  <Input id="email" type="email" {...register('email')} disabled={isLoading} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                  <Input id="phone" type="tel" {...register('phone')} disabled={isLoading} className="h-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">Address</Label>
                <Input id="address" {...register('address')} disabled={isLoading} className="h-10" />
              </div>

              <Button type="submit" disabled={isLoading} className="min-h-[44px]">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Subscription Plans */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">Membership Plans</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure the membership plans available to your members.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              No membership plans configured yet.
            </p>
            <Button variant="outline" className="min-h-[44px]">
              Add Membership Plan
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Payment Settings */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">Payment Settings</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Connect your Stripe account to accept payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Stripe</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Not connected
                </p>
              </div>
              <Button variant="outline" className="min-h-[44px] self-start sm:self-auto">
                Connect Stripe
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-destructive text-base sm:text-lg">Danger Zone</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Irreversible actions that affect your gym data.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Delete Gym</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Permanently delete your gym and all associated data.
                </p>
              </div>
              <Button variant="destructive" className="min-h-[44px] self-start sm:self-auto">
                Delete Gym
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
