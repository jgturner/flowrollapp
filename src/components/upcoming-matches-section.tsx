'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPin, Clock, Trophy, Swords } from 'lucide-react';
import { format as formatDate } from 'date-fns';

interface UpcomingMatch {
  id: string;
  event_id: string;
  match_id: string;
  confirmed: boolean;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'requested';
  competitor_position?: number;
  event: {
    title: string;
    event_date: string;
    address: string;
    city: string;
    state: string;
    creator: {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      belt_level: string;
      avatar_url: string;
    };
    image_url?: string; // Added for event image
  };
  match: {
    weight_limit: number | null;
    belt_level: string;
    age_category: string;
    match_format: string;
    time_limit: number | null;
    gender: string | null;
    sub_only: boolean;
    custom_rules: string;
  };
  opponents: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
  }[];
}

export function UpcomingMatchesSection() {
  const { user } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingMatches();
  }, [user]);

  const fetchUpcomingMatches = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch confirmed matches where user is a competitor
      const { data: confirmedMatches, error: confirmedError } = await supabase
        .from('event_match_competitors')
        .select(
          `
          id,
          match_id,
          confirmed,
          competitor_position,
          event_matches!inner (
            id,
            event_id,
            status,
            weight_limit,
            belt_level,
            age_category,
            match_format,
            time_limit,
            gender,
            sub_only,
            custom_rules
          )
        `
        )
        .eq('user_id', user.id)
        .not('confirmed', 'is', null);

      // Fetch pending requests
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('event_match_requests')
        .select(
          `
          id,
          match_id,
          competitor_position,
          event_matches!inner (
            id,
            event_id,
            status,
            weight_limit,
            belt_level,
            age_category,
            match_format,
            time_limit,
            gender,
            sub_only,
            custom_rules
          )
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (confirmedError || requestsError) {
        setError('Failed to load upcoming matches');
        console.error('Error fetching matches:', confirmedError || requestsError);
        return;
      }

      // Get all unique event IDs to fetch event details
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allEventIds = [...(confirmedMatches || []).map((m: any) => m.event_matches.event_id), ...(pendingRequests || []).map((m: any) => m.event_matches.event_id)];
      const uniqueEventIds = [...new Set(allEventIds)];

      // Fetch event details
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_date, address, city, province, user_id, image_url')
        .in('id', uniqueEventIds)
        .gte('event_date', new Date().toISOString());

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        setError('Failed to load event details');
        return;
      }

      // Get creator profiles
      const creatorIds = [...new Set((events || []).map((e) => e.user_id))];
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, belt_level, avatar_url')
        .in('id', creatorIds);

      if (creatorsError) {
        console.error('Error fetching creators:', creatorsError);
      }

      // Transform confirmed matches
      const transformedConfirmed = (confirmedMatches || [])
        .map((match: Record<string, unknown>) => {
          const event = events?.find((e) => e.id === match.event_matches.event_id);
          if (!event) return null;

          return {
            id: match.id,
            event_id: match.event_matches.event_id,
            match_id: match.match_id,
            confirmed: match.confirmed,
            status: match.event_matches.status || 'pending',
            competitor_position: match.competitor_position,
            event: {
              title: event.title,
              event_date: event.event_date,
              address: event.address || '',
              city: event.city,
              state: event.province,
              creator: creators?.find((c) => c.id === event.user_id) || {
                id: '',
                first_name: 'Unknown',
                last_name: 'User',
                username: 'unknown',
                belt_level: 'White',
                avatar_url: '',
              },
              image_url: event.image_url, // Add image_url to the event object
            },
            match: {
              weight_limit: match.event_matches.weight_limit,
              belt_level: match.event_matches.belt_level,
              age_category: match.event_matches.age_category,
              match_format: match.event_matches.match_format,
              time_limit: match.event_matches.time_limit,
              gender: match.event_matches.gender,
              sub_only: match.event_matches.sub_only,
              custom_rules: match.event_matches.custom_rules || '',
            },
            opponents: [],
          };
        })
        .filter(Boolean) as UpcomingMatch[];

      // Transform pending requests
      const transformedPending = (pendingRequests || [])
        .map((request: Record<string, unknown>) => {
          const event = events?.find((e) => e.id === request.event_matches.event_id);
          if (!event) return null;

          return {
            id: request.id,
            event_id: request.event_matches.event_id,
            match_id: request.match_id,
            confirmed: false,
            status: request.event_matches.status || 'pending',
            competitor_position: request.competitor_position,
            event: {
              title: event.title,
              event_date: event.event_date,
              address: event.address || '',
              city: event.city,
              state: event.province,
              creator: creators?.find((c) => c.id === event.user_id) || {
                id: '',
                first_name: 'Unknown',
                last_name: 'User',
                username: 'unknown',
                belt_level: 'White',
                avatar_url: '',
              },
              image_url: event.image_url, // Add image_url to the event object
            },
            match: {
              weight_limit: request.event_matches.weight_limit,
              belt_level: request.event_matches.belt_level,
              age_category: request.event_matches.age_category,
              match_format: request.event_matches.match_format,
              time_limit: request.event_matches.time_limit,
              gender: request.event_matches.gender,
              sub_only: request.event_matches.sub_only,
              custom_rules: request.event_matches.custom_rules || '',
            },
            opponents: [],
          };
        })
        .filter(Boolean) as UpcomingMatch[];

      // Combine and sort by event date
      const allMatches = [...transformedConfirmed, ...transformedPending].sort((a, b) => new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime());

      setMatches(allMatches);
    } catch (err) {
      setError('Failed to load upcoming matches');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Matches</CardTitle>
          <CardDescription>Your confirmed match schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Matches</CardTitle>
          <CardDescription>Your confirmed match schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 ">
          <Swords className="h-5 w-5" />
          Upcoming Matches & Requests
        </CardTitle>
        <CardDescription>Your confirmed matches and pending requests</CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No upcoming matches</h3>
            <p className="text-muted-foreground">Visit the Events page to find matches to join</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow cursor-pointer p-2" onClick={() => router.push(`/matches/${match.match_id}`)}>
                <div className="flex flex-row items-center gap-2">
                  {/* Event Image on the left, flush with card edge */}
                  {match.event.image_url && (
                    <div className="flex-shrink-0 w-48 h-28 rounded-l overflow-hidden bg-muted">
                      <img src={match.event.image_url} alt={match.event.title} className="object-cover w-full h-full" width={192} height={112} />
                    </div>
                  )}
                  {/* Event/Match Details on the right */}
                  <div className="flex-1 min-w-0 py-2 pr-4 pl-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{match.event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {formatDate(new Date(match.event.event_date), 'MMM dd')}
                          </div>
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDate(new Date(match.event.event_date), 'h:mm a')}
                          </div>
                          <div className="flex items-center truncate">
                            <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {match.event.city}, {match.event.state}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-2">
                      <Badge
                        variant={
                          match.status === 'confirmed'
                            ? 'default'
                            : match.status === 'pending'
                            ? 'secondary'
                            : match.status === 'completed'
                            ? 'outline'
                            : match.status === 'cancelled'
                            ? 'outline'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {match.status === 'confirmed' && 'Confirmed'}
                        {match.status === 'pending' && 'Pending'}
                        {match.status === 'completed' && 'Completed'}
                        {match.status === 'cancelled' && 'Cancelled'}
                        {match.status === 'requested' && 'Requested'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {match.match.match_format === 'gi' ? 'Gi' : match.match.match_format === 'no_gi' ? 'No Gi' : 'Both'}
                      </Badge>
                      {match.status === 'requested' && (
                        <Badge variant="outline" className="text-xs">
                          Pos {match.competitor_position}
                        </Badge>
                      )}
                    </div>
                    {/* Quick info row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      {match.match.belt_level && <span>Belt: {match.match.belt_level}</span>}
                      {match.match.weight_limit && <span>Weight: {match.match.weight_limit}lbs</span>}
                      {match.match.gender && <span className="capitalize">{match.match.gender}</span>}
                      {match.match.time_limit && <span>{match.match.time_limit} min</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
