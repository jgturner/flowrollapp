import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Add all price IDs
const PRICE_IDS: Record<string, string> = {
  'user+': 'price_0RkwNIhltoIgZ32n8vmlssj9',
  'gym+': 'price_0RkyORhltoIgZ32nEfTFlrvh',
  'events+': 'price_0RkySdhltoIgZ32nTPukzFPj',
  'gym/events+': 'price_0RkyVqhltoIgZ32nb1C3QoBe',
};

export async function POST(req: NextRequest) {
  try {
    const { email, tier } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!tier || !PRICE_IDS[tier]) {
      return NextResponse.json({ error: 'Invalid or missing subscription tier' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscriptions?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subscriptions?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = typeof error === 'object' && error && 'message' in error ? (error as { message: string }).message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
