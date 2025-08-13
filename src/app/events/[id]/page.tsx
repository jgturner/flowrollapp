'use client';

import React from 'react';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Trophy, Swords, ExternalLink, Weight, Medal, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { UserProfileDisplay } from '@/components/user-profile-display';

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  event_type: 'tournament' | 'match';
  address: string;
  city: string;
  state: string;
  country: string;
  event_date: string;
  registration_url: string;
  log_withdrawals: boolean;
  allow_open_requests: boolean;
  user_id: string;
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
  };
}

interface EventMatch {
  id: string;
  weight_limit: number | null;
  belt_level: string;
  age_category: 'kids' | 'normal' | 'masters';
  match_format: 'gi' | 'no_gi' | 'both';
  time_limit: number | null;
  gender: string | null;
  sub_only: boolean;
  custom_rules: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  result: 'competitor_1_win' | 'competitor_2_win' | 'draw' | null;
  method_of_victory: string;
  finish_time: number | null;
  competitors: {
    competitor_position: number;
    competitor_type: 'registered_user' | 'manual_entry';
    user_id: string | null;
    manual_name: string | null;
    manual_belt: string | null;
    manual_weight: number | null;
    manual_photo_url: string | null;
    confirmed: boolean;
    user?: {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      belt_level: string;
      avatar_url: string;
      spotify_id?: string;
    };
  }[];
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  console.log('EventDetailPage loaded');
  const resolvedParams = use(params);
  const [event, setEvent] = useState<Event | null>(null);
  const [matches, setMatches] = useState<EventMatch[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    Array<{
      id: string;
      match_id: string;
      user_id: string;
      competitor_position: number;
      status: string;
      message: string;
      created_at: string;
      user: {
        id: string;
        first_name: string;
        last_name: string;
        username: string;
        belt_level: string;
        avatar_url: string;
      };
      type: 'invite' | 'request';
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchEvent();
  }, [resolvedParams.id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase.from('events').select('*').eq('id', resolvedParams.id).single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Event not found');

      // Fetch creator profile separately
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, belt_level, avatar_url')
        .eq('id', eventData.user_id)
        .single();

      if (creatorError) throw creatorError;

      setEvent({
        ...eventData,
        creator: creatorData,
      });

      // Fetch matches for both tournaments and match events
      const { data: matchData, error: matchError } = await supabase
        .from('event_matches')
        .select(
          `
          *,
          competitors:event_match_competitors (
            competitor_position,
            competitor_type,
            user_id,
            manual_name,
            manual_belt,
            manual_weight,
            manual_photo_url,
            confirmed
          )
        `
        )
        .eq('event_id', resolvedParams.id)
        .order('created_at', { ascending: true });

      if (matchError) throw matchError;

      // Get all unique user IDs from competitors
      const userIds = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchData?.forEach((match: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        match.competitors?.forEach((competitor: any) => {
          if (competitor.user_id) {
            userIds.add(competitor.user_id);
          }
        });
      });

      // Fetch user profiles for competitors
      type UserProfile = {
        id: string;
        first_name: string;
        last_name: string;
        username: string;
        belt_level: string;
        avatar_url: string;
      };
      let userProfiles: UserProfile[] = [];
      if (userIds.size > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, belt_level, avatar_url, spotify_id')
          .in('id', Array.from(userIds));

        if (profileError) throw profileError;
        userProfiles = profileData || [];
      }

      // Merge user profile data with competitors
      const matchesWithProfiles =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matchData?.map((match: any) => ({
          ...match,
          competitors:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            match.competitors?.map((competitor: any) => ({
              ...competitor,
              user: competitor.user_id ? userProfiles.find((profile) => profile.id === competitor.user_id) : undefined,
            })) || [],
        })) || [];

      setMatches(matchesWithProfiles);

      // Fetch pending requests for this event (for event creator)
      if (eventData.user_id === user?.id) {
        const { data: requestData, error: requestError } = await supabase
          .from('event_match_requests')
          .select(
            `
            id,
            match_id,
            user_id,
            competitor_position,
            status,
            message,
            created_at,
            type,
            user:profiles!user_id (
              id,
              first_name,
              last_name,
              username,
              belt_level,
              avatar_url
            )
          `
          )
          .in('match_id', matchData?.map((match) => match.id) || [])
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (!requestError && requestData) {
          // Get user profiles for the requests
          const requestUserIds = requestData.map((req) => req.user_id);
          const { data: requestUserData, error: requestUserError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, belt_level, avatar_url')
            .in('id', requestUserIds);

          if (!requestUserError) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const requestsWithUsers = requestData.map((request: any) => ({
              ...request,
              user: requestUserData?.find((u) => u.id === request.user_id) || {
                id: request.user_id,
                first_name: 'Unknown',
                last_name: 'User',
                username: 'unknown',
                belt_level: 'White',
                avatar_url: '',
              },
            }));
            setPendingRequests(requestsWithUsers);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, matchId: string, userId: string, position: number) => {
    try {
      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('event_match_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
          responded_by: user?.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add competitor to the match
      const { error: competitorError } = await supabase.from('event_match_competitors').insert({
        match_id: matchId,
        competitor_position: position,
        competitor_type: 'registered_user',
        user_id: userId,
        confirmed: true,
      });

      if (competitorError) throw competitorError;

      // Refresh data
      fetchEvent();
      alert('Request approved successfully!');
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('event_match_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
          responded_by: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh data
      fetchEvent();
      alert('Request rejected.');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request. Please try again.');
    }
  };

  const handleMatchRequest = async (matchId: string, position: number) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Check if user already has a pending request for this match and position
      const { data: existingRequest, error: checkError } = await supabase
        .from('event_match_requests')
        .select('id, status')
        .eq('match_id', matchId)
        .eq('user_id', user.id)
        .eq('competitor_position', position)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if no request exists
        throw checkError;
      }

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          alert('You already have a pending request for this position.');
          return;
        } else if (existingRequest.status === 'rejected') {
          // Update the existing rejected request to pending
          const { error: updateError } = await supabase
            .from('event_match_requests')
            .update({
              status: 'pending',
              message: 'Request to join match',
              response_message: null,
              responded_at: null,
              responded_by: null,
            })
            .eq('id', existingRequest.id);

          if (updateError) throw updateError;
        } else {
          alert('You already have a request for this position.');
          return;
        }
      } else {
        // Create new request
        const { error } = await supabase.from('event_match_requests').insert({
          match_id: matchId,
          user_id: user.id,
          competitor_position: position,
          message: 'Request to join match',
        });

        if (error) throw error;
      }

      // Refresh data
      fetchEvent();
      alert('Match request submitted successfully!');
    } catch (err) {
      console.error('Error requesting match:', err);
      alert('Failed to submit match request. Please try again.');
    }
  };

  const handleCancelInvite = async (requestId: string) => {
    try {
      const { error } = await supabase.from('event_match_requests').delete().eq('id', requestId);

      if (error) throw error;

      fetchEvent();
      alert('Invite cancelled.');
    } catch (err) {
      console.error('Error cancelling invite:', err);
      alert('Failed to cancel invite. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeIcon = (type: string) => {
    return type === 'tournament' ? Trophy : Swords;
  };

  const getEventTypeColor = (type: string) => {
    return type === 'tournament' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Events', href: '/events' },
    { label: event?.title || 'Event Detail', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !event) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'This event does not exist or has been removed.'}</p>
          <Link href="/events">
            <Button>Back to Events</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const IconComponent = getEventTypeIcon(event.event_type);

  console.log(
    'Pending Request Types:',
    pendingRequests.map((r) => r.type)
  );

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl">
        <div>
          {/* Main Content */}
          <div className="w-full space-y-6">
            {/* Event Header */}
            <Card>
              <CardContent className="p-6">
                {/* Event Image - Full Width Above Title */}
                {event.image_url && (
                  <div className="w-full h-64 rounded-lg overflow-hidden mb-6">
                    <Image src={event.image_url} alt={event.title} width={800} height={256} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <IconComponent className="h-6 w-6 text-primary" />
                  <Badge className={getEventTypeColor(event.event_type)}>{event.event_type === 'tournament' ? 'Tournament' : 'Match'}</Badge>
                </div>
                <h1 className="text-3xl font-bold mb-4">{event.title}</h1>

                {event.description && <p className="text-muted-foreground mb-4">{event.description}</p>}

                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {event.address && `${event.address}, `}
                      {event.city}, {event.state}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tournament Registration */}
            {event.event_type === 'tournament' && event.registration_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Registration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Register for this tournament through the external platform</p>
                      <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {event.registration_url}
                      </a>
                    </div>
                    <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                      <Button>
                        Register Now
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Match/Division Listing */}
            {event.event_type !== 'tournament' && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  {matches.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No matches available for this event yet.</p>
                      <p className="text-sm mt-2">Matches will appear here once they are created.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {matches.map((match) => (
                        <EventMatchCard
                          key={match.id}
                          match={match}
                          onRequestMatch={handleMatchRequest}
                          isTournament={false}
                          pendingRequests={pendingRequests.filter((req) => req.match_id === match.id)}
                          allowOpenRequests={event.allow_open_requests}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Event Settings - Only for Match Events */}
            {event.event_type === 'match' && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Withdrawal Logging</span>
                    <Badge variant={event.log_withdrawals ? 'default' : 'secondary'}>{event.log_withdrawals ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Open Requests</span>
                    <Badge variant={event.allow_open_requests ? 'default' : 'secondary'}>{event.allow_open_requests ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending Requests - Only for Event Creator */}
            {user?.id === event.user_id && pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Match Requests</CardTitle>
                  <CardDescription>Review and approve requests from users wanting to join matches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.map((request) => {
                      const match = matches.find((m) => m.id === request.match_id);
                      return (
                        <div key={request.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {request.user.first_name?.[0]}
                                  {request.user.last_name?.[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {request.user.first_name} {request.user.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {request.user.belt_level} Belt • Position {request.competitor_position}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {request.type === 'invite' ? (
                                <Button size="sm" variant="destructive" onClick={() => handleCancelInvite(request.id)}>
                                  Cancel Request
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" onClick={() => handleApproveRequest(request.id, request.match_id, request.user_id, request.competitor_position)}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleRejectRequest(request.id)}>
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {match && (
                            <div className="text-sm text-muted-foreground">
                              Match: {match.belt_level} Belt • {match.weight_limit}lbs • {match.match_format}
                            </div>
                          )}
                          {request.message && (
                            <div className="text-sm">
                              <span className="font-medium">Message:</span> {request.message}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          {/* <div className="space-y-6">
            <AdPlaceholder />
          </div> */}
        </div>
      </div>
    </DashboardLayout>
  );
}

interface EventMatchCardProps {
  match: EventMatch;
  onRequestMatch: (matchId: string, position: number) => void;
  isTournament?: boolean;
  pendingRequests?: Array<{
    id: string;
    competitor_position: number;
    user: {
      first_name: string;
      last_name: string;
    };
  }>;
  allowOpenRequests?: boolean;
}

type PendingRequestUser = {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  belt_level?: string;
  avatar_url?: string;
};

function EventMatchCard({ match, onRequestMatch, isTournament = false, pendingRequests = [], allowOpenRequests = true }: EventMatchCardProps) {
  const { user, profile } = useAuth();
  const getAgeDisplay = (age: string) => {
    switch (age) {
      case 'kids':
        return 'Kids';
      case 'masters':
        return 'Masters';
      default:
        return 'Adult';
    }
  };

  const getFormatDisplay = (format: string) => {
    switch (format) {
      case 'gi':
        return 'Gi';
      case 'no_gi':
        return 'No-Gi';
      case 'both':
        return 'Both';
      default:
        return format;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(match.status)}>{match.status.charAt(0).toUpperCase() + match.status.slice(1)}</Badge>
            {match.result && <Badge variant="outline">{match.result === 'draw' ? 'Draw' : match.result === 'competitor_1_win' ? 'P1 Win' : 'P2 Win'}</Badge>}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {match.weight_limit && (
              <div className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                <span>{match.weight_limit} lbs</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Medal className="h-3 w-3" />
              <span>{match.belt_level} Belt</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{getAgeDisplay(match.age_category)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{getFormatDisplay(match.match_format)}</span>
            </div>
            {match.gender && (
              <div className="flex items-center gap-1">
                <span>{match.gender.charAt(0).toUpperCase() + match.gender.slice(1)}</span>
              </div>
            )}
            {match.time_limit && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{match.time_limit} min</span>
              </div>
            )}
          </div>

          {match.sub_only && (
            <div className="flex gap-2">
              <Badge variant="outline">Sub Only</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Competitors - Only show for match events, not tournaments */}
      {!isTournament && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((position) => {
            const competitor = match.competitors.find((c) => c.competitor_position === position);
            // Eligibility check for open slot
            let eligible = true;
            if (!competitor && profile) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const profileAny = profile as any;
              if (!profileAny.gender || !profileAny.belt_level || profileAny.weight === null || profileAny.weight === undefined) {
                eligible = false;
              } else if (match.gender && match.gender.toLowerCase() !== String(profileAny.gender).toLowerCase()) {
                eligible = false;
              } else if (match.belt_level && match.belt_level.toLowerCase() !== String(profileAny.belt_level).toLowerCase()) {
                eligible = false;
              } else if (typeof match.weight_limit === 'number' && Number(profileAny.weight) > match.weight_limit) {
                eligible = false;
              }
            }
            return (
              <div key={position} className="border rounded-lg p-3">
                <div className="text-sm font-medium mb-2">Competitor {position}</div>
                {competitor ? (
                  competitor.competitor_type === 'registered_user' && competitor.user ? (
                    <UserProfileDisplay
                      user={{
                        id: competitor.user.id,
                        first_name: competitor.user.first_name,
                        last_name: competitor.user.last_name,
                        username: competitor.user.username,
                        belt_level: competitor.user.belt_level,
                        avatar_url: competitor.user.avatar_url,
                        spotify_id: competitor.user.spotify_id,
                      }}
                      size="md"
                      showMusicPlayer={!!competitor.user.spotify_id}
                      showUsername={true}
                      showBelt={true}
                      linkToProfile={true}
                    />
                  ) : (
                    <UserProfileDisplay
                      user={{
                        id: '',
                        first_name: competitor.manual_name || 'Manual',
                        last_name: '',
                        username: '',
                        belt_level: competitor.manual_belt || '',
                        avatar_url: competitor.manual_photo_url || '',
                      }}
                      size="md"
                      showMusicPlayer={false}
                      showUsername={false}
                      showBelt={true}
                      linkToProfile={false}
                    />
                  )
                ) : (
                  <div className="text-center py-4">
                    {pendingRequests.some((req) => req.competitor_position === position) ? (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Pending Request</p>
                        {pendingRequests
                          .filter((req: { competitor_position: number }) => req.competitor_position === position)
                          .map((req: { id: string; user: PendingRequestUser; user_id?: string }) => (
                            <UserProfileDisplay
                              key={req.id}
                              user={{
                                id: 'id' in req.user ? String(req.user.id) : req.user_id || '',
                                first_name: 'first_name' in req.user ? String(req.user.first_name) : '',
                                last_name: 'last_name' in req.user ? String(req.user.last_name) : '',
                                username: 'username' in req.user ? String(req.user.username) : '',
                                belt_level: 'belt_level' in req.user ? String(req.user.belt_level) : '',
                                avatar_url: 'avatar_url' in req.user ? String(req.user.avatar_url) : '',
                              }}
                              size="sm"
                              showMusicPlayer={false}
                              showUsername={true}
                              showBelt={true}
                              linkToProfile={true}
                            />
                          ))}
                      </div>
                    ) : !allowOpenRequests ? (
                      <span className="text-xs text-muted-foreground font-semibold">Invite Only</span>
                    ) : !user ? (
                      <Button size="sm" variant="outline" onClick={() => onRequestMatch(match.id, position)}>
                        Request Match
                      </Button>
                    ) : profile && !eligible ? (
                      <span className="text-xs text-destructive font-semibold">User does not meet reqs/rule set</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onRequestMatch(match.id, position)}>
                        Request Match
                      </Button>
                    )}
                  </div>
                )}
                {!competitor?.confirmed && competitor && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    Pending
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tournament Division Info */}
      {isTournament && (
        <div className="text-center py-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">This is a tournament division. Register through the registration link above to compete.</p>
        </div>
      )}

      {match.custom_rules && (
        <div className="text-sm">
          <span className="font-medium">Custom Rules: </span>
          <span className="text-muted-foreground">{match.custom_rules}</span>
        </div>
      )}

      {match.method_of_victory && (
        <div className="text-sm">
          <span className="font-medium">Method of Victory: </span>
          <span className="text-muted-foreground">{match.method_of_victory}</span>
          {match.finish_time && (
            <span className="text-muted-foreground">
              {' '}
              at {Math.floor(match.finish_time / 60)}:{(match.finish_time % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
