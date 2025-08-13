'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Trophy, Swords, Edit, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  event_type: 'tournament' | 'match';
  city: string;
  state: string;
  event_date: string;
  created_at: string;
}

export default function EventManagementPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const { user, eventPlusSubscription, gymEventPlusSubscription } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !eventPlusSubscription && !gymEventPlusSubscription) {
      router.replace('/feed');
    }
  }, [user, eventPlusSubscription, gymEventPlusSubscription, router]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').select('*').eq('user_id', user.id).order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Platform', href: '/events' },
    { label: 'Event Management', isActive: true },
  ];

  if (loading || (!eventPlusSubscription && !gymEventPlusSubscription)) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-7xl">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Event Management</h1>
              <p className="text-muted-foreground">Manage your events and competitions</p>
            </div>
            <Link href="/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>

          {/* Events List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No events yet</h3>
                      <p className="mb-4">Create your first event to get started</p>
                      <Link href="/events/new">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Event
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              events.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  const IconComponent = getEventTypeIcon(event.event_type);

  return (
    <Card className="overflow-hidden py-3">
      {event.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <Image src={event.image_url} alt={event.title} width={400} height={225} className="w-full h-full object-contain" />
        </div>
      )}
      <CardHeader className="mb-[-16px]">
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-primary" />
          <Badge className={getEventTypeColor(event.event_type)}>{event.event_type === 'tournament' ? 'Tournament' : 'Match'}</Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {event.city}, {event.state}
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(event.event_date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Link href={`/events/${event.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </Link>
            <Link href={`/events/${event.id}/edit`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getEventTypeIcon(type: string) {
  return type === 'tournament' ? Trophy : Swords;
}

function getEventTypeColor(type: string) {
  return type === 'tournament' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
}
