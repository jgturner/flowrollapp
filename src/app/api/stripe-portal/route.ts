import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    // Find the user's latest active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    if (subError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    // Get the Stripe subscription to find the customer ID
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
    // Create the portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000/subscriptions',
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error('Stripe portal error:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
