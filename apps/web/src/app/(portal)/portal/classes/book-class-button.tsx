'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface BookClassButtonProps {
  sessionId: string;
  memberId: string;
  isBooked: boolean;
  isFull: boolean;
}

export function BookClassButton({
  sessionId,
  memberId,
  isBooked,
  isFull,
}: BookClassButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleBook() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/portal/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, memberId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Booking failed',
          description: data.error?.message || 'Unable to book class',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Class booked!',
        description: 'You have successfully booked this class',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancel() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/portal/bookings?sessionId=${sessionId}&memberId=${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Cancellation failed',
          description: data.error?.message || 'Unable to cancel booking',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isBooked) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={handleCancel}
        disabled={isLoading}
      >
        {isLoading ? 'Cancelling...' : 'Cancel Booking'}
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      onClick={handleBook}
      disabled={isLoading || isFull}
    >
      {isLoading ? 'Booking...' : isFull ? 'Class Full' : 'Book Class'}
    </Button>
  );
}
