import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const buf = await req.arrayBuffer();
  const body = Buffer.from(buf);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Received checkout.session.completed', { session });
      if (session.mode === 'subscription' && session.customer_email && session.subscription) {
        // Determine tier from price ID
        let tier = 'user+';
        // Always fetch line items from Stripe
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
          const priceId = lineItems.data[0]?.price?.id;
          if (priceId === 'price_0RkyORhltoIgZ32nEfTFlrvh') tier = 'gym+';
          else if (priceId === 'price_0RkySdhltoIgZ32nTPukzFPj') tier = 'events+';
          else if (priceId === 'price_0RkyVqhltoIgZ32nb1C3QoBe') tier = 'gym/events+';
          else if (priceId === 'price_0RkwNIhltoIgZ32n8vmlssj9') tier = 'user+';
        } catch (e) {
          console.error('Failed to fetch Stripe line items:', e);
        }
        // Use the new Postgres function to get the profile id by email
        const { data: profileId, error: profileIdError } = await supabase.rpc('get_profile_id_by_email', { email: session.customer_email });
        console.log('Profile ID lookup result:', { profileId, profileIdError });
        if (profileIdError || !profileId) {
          console.error('Profile not found for email:', session.customer_email, profileIdError);
          break;
        }
        // Insert subscription
        const { error: subError, data: subData } = await supabase
          .from('subscriptions')
          .insert({
            user_id: profileId,
            stripe_subscription_id: session.subscription,
            tier,
            status: 'active',
            start_date: new Date().toISOString(),
          })
          .select();
        if (subError) {
          console.error('Failed to insert subscription:', subError);
        } else {
          console.log('Inserted subscription:', subData);
          // Cancel all other active subscriptions for this user in Stripe and Supabase
          const { data: otherSubs, error: otherSubsError } = await supabase
            .from('subscriptions')
            .select('id, stripe_subscription_id')
            .eq('user_id', profileId)
            .eq('status', 'active')
            .neq('stripe_subscription_id', session.subscription);
          if (otherSubsError) {
            console.error('Failed to fetch other active subscriptions:', otherSubsError);
          } else if (otherSubs && otherSubs.length > 0) {
            for (const sub of otherSubs) {
              if (sub.stripe_subscription_id) {
                try {
                  await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
                } catch (e) {
                  console.error('Failed to cancel Stripe subscription:', sub.stripe_subscription_id, e);
                }
              }
              // Update status in Supabase
              await supabase.from('subscriptions').update({ status: 'canceled', end_date: new Date().toISOString() }).eq('id', sub.id);
            }
          }
        }
      } else {
        console.log('Session did not match expected subscription mode or missing email/subscription', { session });
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
