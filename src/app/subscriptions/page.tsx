'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { User, Dumbbell, Swords, Medal } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const subscriptions = [
  {
    name: 'user+',
    price: '$12',
    description: 'Access to user features.',
    icon: User,
  },
  {
    name: 'gym+',
    price: '$39',
    description: 'Access to gym features.',
    icon: Dumbbell,
  },
  {
    name: 'events+',
    price: '$39',
    description: 'Access to events features.',
    icon: Swords,
  },
  {
    name: 'gym/events+',
    price: '$49',
    description: 'Access to both gym and events features.',
    icon: Medal,
  },
];

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      if (!user) {
        setCurrentTier(null);
        return;
      }
      const { data } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();
      setCurrentTier(data?.tier || null);
    };
    fetchCurrentSubscription();
  }, [user]);

  const handleSubscribe = async (tier: string) => {
    if (!user?.email) {
      alert('You must be logged in to subscribe.');
      return;
    }
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create Stripe session.');
      }
    } catch {
      alert('An error occurred.');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    if (!user?.id) {
      alert('You must be logged in to manage your subscription.');
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open Stripe portal.');
      }
    } catch {
      alert('An error occurred.');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="py-10 px-4">
        <h1 className="text-3xl font-bold mb-2">Subscriptions</h1>
        <p className="text-lg text-muted-foreground text-left mb-6">Unlock exclusive features and take your experience to the next level by upgrading your account!</p>
        <Separator className="mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => (
            <Card key={sub.name} className="flex flex-col h-full">
              <CardHeader>
                {(() => {
                  const Icon = sub.icon;
                  return (
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <Icon className="h-7 w-7 text-primary" />
                      {sub.name}
                    </CardTitle>
                  );
                })()}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-semibold mb-2">{sub.price}</div>
                  <div className="text-muted-foreground mb-4">
                    {sub.description}
                    {sub.name === 'user+' && (
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>AI Analytics for Training, Stats, and Competitions Trends</li>
                        <li>Create/Sell Instructions</li>
                        <li>Sell Videos</li>
                      </ul>
                    )}
                    {sub.name === 'gym+' && (
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>AI Analytics for Gym Members Training, Stats, and Competition Trends</li>
                        <li>Create/Sell Instructionals</li>
                        <li>Create/Sell Videos</li>
                        <li>Gym Only Videos</li>
                        <li>Gym Only Video Syllabus</li>
                        <li>Gym Only Training Planner</li>
                        <li>Assign instructors, editors, and trusted users to help manage your gym.</li>
                      </ul>
                    )}
                    {sub.name === 'events+' && (
                      <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>Super Fight Event Manager</li>
                        <li>Invite Only Super Fights</li>
                        <li>Invite Fighters to Super Fights</li>
                        <li>Super Fight Records for Users and Rankings</li>
                        <li>Find, invite, and manage referees for Superfights and Tournaments.</li>
                        <li>Manage helpers, photographers, and other event personnel.</li>
                        <li>Ad Free Tournament Feature.</li>
                      </ul>
                    )}
                    {sub.name === 'gym/events+' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <div className="font-semibold mb-2">Gym Features</div>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>AI Analytics for Gym Members Training, Stats, and Competition Trends</li>
                            <li>Create/Sell Instructionals</li>
                            <li>Create/Sell Videos</li>
                            <li>Gym Only Videos</li>
                            <li>Gym Only Video Syllabus</li>
                            <li>Gym Only Training Planner</li>
                            <li>Assign instructors, editors, and trusted users to help manage your gym.</li>
                          </ul>
                        </div>
                        <div>
                          <div className="font-semibold mb-2">Events Features</div>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>Super Fight Event Manager</li>
                            <li>Invite Only Super Fights</li>
                            <li>Invite Fighters to Super Fights</li>
                            <li>Super Fight Records for Users and Rankings</li>
                            <li>Find, invite, and manage referees for Superfights and Tournaments.</li>
                            <li>Manage helpers, photographers, and other event personnel.</li>
                            <li>Ad Free Tournament Feature.</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  {currentTier === sub.name ? (
                    <Button onClick={handleManage} disabled={portalLoading}>
                      {portalLoading ? 'Loading...' : 'Manage Subscription'}
                    </Button>
                  ) : (
                    <Button onClick={() => handleSubscribe(sub.name)} disabled={loadingTier !== null && loadingTier !== sub.name}>
                      {loadingTier === sub.name ? 'Redirecting...' : currentTier ? 'Upgrade' : 'Subscribe'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
