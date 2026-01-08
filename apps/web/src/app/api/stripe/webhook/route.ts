import { headers } from 'next/headers';
import { handleStripeWebhook } from '@gym/core';

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const result = await handleStripeWebhook(body, signature);

  if (!result || !result.success) {
    return new Response(result?.error || 'Webhook processing failed', { status: 400 });
  }

  return new Response('OK', { status: 200 });
}
