'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Trophy, Swords, Filter, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard-layout';
import { UpcomingMatchesSection } from '@/components/upcoming-matches-section';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchList } from '@/components/match-list';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string;
  event_type: 'tournament' | 'match';
  city: string;
  state: string;
  country: string;
  event_date: string;
  registration_url: string;
  user_id: string;
  created_at: string;
  belt_level: string;
  format: 'gi' | 'no-gi';
  gender: 'male' | 'female';
  rule_set: 'IBJJF' | 'ADCC' | 'EBI' | 'WNO/FloGrappling' | 'F2W' | 'BJJ Fanatics/Local Tournaments';
  sub_only: boolean;
  no_time_limit: boolean;
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
  };
}

interface AvailableMatch {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  belt_level: string;
  match_format: 'gi' | 'no_gi' | 'both';
  time_limit: number | null;
  sub_only: boolean;
  custom_rules: string | null;
  gender: 'male' | 'female';
  weight_limit: number | null;
  current_competitors: number;
  competitors: (SupabaseCompetitor | undefined)[];
  status: string;
  allow_open_requests: boolean;
}

// Extend Profile type to include spotify_id
type Profile = { id: string; first_name: string; last_name: string; username: string; belt_level: string; avatar_url: string; spotify_id?: string | null };
type SupabaseCompetitor = {
  id: string;
  competitor_position: number;
  user_id?: string;
  manual_name?: string;
  manual_belt?: string;
  manual_photo_url?: string;
  walkout_music?: string;
  walkout_music_url?: string;
  user?: Profile & { spotify_id?: string | null };
  spotify_id?: string | null; // for manual competitors
};

interface Invite {
  id: string;
  match_id: string;
  competitor_position: number;
  match: Match;
  event: { id: string; title: string };
}

// Add minimal Match type for invites
interface Match {
  id: string;
  event_id: string;
  belt_level: string;
  match_format: string;
  time_limit: number | null;
  sub_only: boolean;
  custom_rules: string | null;
  gender: string;
  weight_limit: number | null;
  status: string;
  competitors?: SupabaseCompetitor[];
}

function hasConfirmed(obj: unknown): obj is { confirmed: boolean } {
  return typeof obj === 'object' && obj !== null && 'confirmed' in obj && typeof (obj as { confirmed?: unknown }).confirmed === 'boolean';
}

export default function EventsPage() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [availableMatches, setAvailableMatches] = useState<AvailableMatch[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<AvailableMatch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeTab, setEventTypeTab] = useState('all');
  const [mainTab, setMainTab] = useState('events');
  const [loading, setLoading] = useState(true);
  const [matchTypeFilter, setMatchTypeFilter] = useState('all');
  const [beltFilter, setBeltFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ruleSetFilter, setRuleSetFilter] = useState('all');
  const [subOnlyFilter, setSubOnlyFilter] = useState(false);
  const [noTimeLimitFilter, setNoTimeLimitFilter] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  // Removed unused state: playingMusic, setPlayingMusic, spotifyModalOpen, setSpotifyModalOpen

  useEffect(() => {
    // Set mainTab from query param on mount
    const tabParam = searchParams.get('tab');
    if (tabParam === 'my-events') {
      setMainTab('upcoming');
    } else {
      setMainTab('events');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEvents();
    fetchAvailableMatches();
    if (mainTab === 'invites' && user) {
      fetchInvites();
    }
  }, []);

  // Also fetch invites when switching to the invites tab
  useEffect(() => {
    if (mainTab === 'invites' && user) {
      fetchInvites();
    }
  }, [mainTab, user]);

  useEffect(() => {
    filterEvents();
    filterMatches();
  }, [events, availableMatches, searchTerm, eventTypeTab, matchTypeFilter, beltFilter, formatFilter, genderFilter, ruleSetFilter, subOnlyFilter, noTimeLimitFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // First get all events
      const { data: eventsData, error: eventsError } = await supabase.from('events').select('*').order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(eventsData.map((event) => event.user_id))];

      // Fetch profiles for all creators
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, belt_level, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine events with creator profiles
      const eventsWithCreators = eventsData.map((event) => ({
        ...event,
        // Map database fields to interface fields
        state: event.province,
        belt_level: 'White', // Default value since events table doesn't have this
        format: 'gi' as 'gi' | 'no-gi', // Default value
        gender: 'male' as 'male' | 'female', // Default value
        rule_set: 'IBJJF' as 'IBJJF' | 'ADCC' | 'EBI' | 'WNO/FloGrappling' | 'F2W' | 'BJJ Fanatics/Local Tournaments',
        sub_only: false, // Default value
        no_time_limit: false, // Default value
        creator: profilesData?.find((profile) => profile.id === event.user_id) || null,
      }));

      setEvents(eventsWithCreators);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMatches = async () => {
    try {
      console.log('Fetching available matches...');
      // Get matches with event details and competitor count
      const { data: matchesData, error: matchesError } = await supabase
        .from('event_matches')
        .select(
          `
          id,
          event_id,
          belt_level,
          match_format,
          time_limit,
          sub_only,
          custom_rules,
          gender,
          weight_limit,
          status,
          events!inner(id, title, event_date, allow_open_requests),
          competitors:event_match_competitors(
            id,
            competitor_position,
            user_id,
            manual_name,
            manual_belt,
            manual_photo_url
          )
        `
        )
        .gte('events.event_date', new Date().toISOString());

      if (matchesError) {
        console.error('Matches error:', matchesError);
        throw matchesError;
      }

      // Gather all user_ids from competitors
      type MatchData = { competitors?: SupabaseCompetitor[] };
      const allCompetitors = (Array.isArray(matchesData) ? (matchesData as MatchData[]) : []).flatMap((match) => match.competitors || []);
      const userIds = allCompetitors.map((c) => c.user_id).filter((id): id is string => !!id);
      const uniqueUserIds = Array.from(new Set(userIds));

      // Fetch user profiles for all competitors with user_id
      let userProfiles: Record<string, Profile> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, belt_level, avatar_url, spotify_id')
          .in('id', uniqueUserIds);
        if (profilesError) throw profilesError;
        userProfiles = (profilesData || []).reduce((acc: Record<string, Profile>, profile: Profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      type SupabaseMatch = {
        id: string;
        event_id: string;
        belt_level: string;
        match_format: 'gi' | 'no_gi' | 'both';
        time_limit: number | null;
        sub_only: boolean;
        custom_rules: string | null;
        gender: 'male' | 'female';
        weight_limit: number | null;
        status: string;
        events?:
          | { id: string; title: string; event_date: string; allow_open_requests: boolean }
          | { id: string; title: string; event_date: string; allow_open_requests: boolean }[];
        competitors?: SupabaseCompetitor[];
      };
      const availableMatchesData =
        (Array.isArray(matchesData) ? (matchesData as SupabaseMatch[]) : [])
          .filter((match) => {
            // Only show matches with less than 2 competitors (open slots)
            const competitorCount = match.competitors?.length || 0;
            // Filter out invite-only matches
            const eventObj = Array.isArray(match.events) ? match.events[0] : match.events;
            if (eventObj && eventObj.allow_open_requests === false) return false;
            return competitorCount < 2;
          })
          .map((match) => {
            // Ensure competitors array has two slots (positions 1 and 2)
            const competitors: (SupabaseCompetitor | undefined)[] = [1, 2].map((position) => {
              const c = (match.competitors || []).find((comp) => comp.competitor_position === position);
              if (c) {
                return {
                  ...c,
                  competitor_position: position,
                  user: c.user_id ? userProfiles[c.user_id] : undefined,
                };
              } else {
                // Open slot: return undefined
                return undefined;
              }
            });
            const eventObj = Array.isArray(match.events) ? match.events[0] : match.events;
            return {
              id: match.id,
              event_id: match.event_id,
              event_title: eventObj?.title || 'Unknown Event',
              event_date: eventObj?.event_date || '',
              belt_level: match.belt_level,
              match_format: match.match_format,
              time_limit: match.time_limit,
              sub_only: match.sub_only,
              custom_rules: match.custom_rules,
              gender: match.gender,
              weight_limit: match.weight_limit,
              current_competitors: (match.competitors || []).length,
              competitors, // now always [c1, c2] (undefined for open slots)
              status: match.status,
              allow_open_requests: eventObj?.allow_open_requests !== false, // default to true if missing
            };
          }) || [];

      console.log('Processed available matches:', availableMatchesData);
      setAvailableMatches(availableMatchesData);
    } catch (error) {
      console.error('Error fetching available matches:', error);
    }
  };

  const fetchInvites = async () => {
    if (!user) return;
    setInvitesLoading(true);
    try {
      const { data: inviteData } = await supabase
        .from('event_match_requests')
        .select('*, event_matches(*)')
        .eq('user_id', user.id)
        .eq('type', 'invite')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (!inviteData || inviteData.length === 0) {
        setInvites([]);
        setInvitesLoading(false);
        return;
      }
      // Step 2: Collect unique match_ids
      const matchIds = Array.from(new Set(inviteData.map((invite) => invite.match_id).filter(Boolean)));
      // Step 3: Fetch competitors for those match_ids
      const competitorsByMatch: Record<string, SupabaseCompetitor[]> = {};
      const userIds: string[] = [];
      if (matchIds.length > 0) {
        const { data: competitorsData } = await supabase.from('event_match_competitors').select('*').in('match_id', matchIds);
        (competitorsData || []).forEach((comp) => {
          if (!competitorsByMatch[comp.match_id]) competitorsByMatch[comp.match_id] = [];
          competitorsByMatch[comp.match_id].push(comp);
          if (comp.user_id) userIds.push(comp.user_id);
        });
      }
      // Step 4: Fetch user profiles for all competitors
      let profilesById: Record<string, Profile> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, belt_level, avatar_url, spotify_id')
          .in('id', Array.from(new Set(userIds)));
        profilesById = (profilesData || []).reduce((acc: Record<string, Profile>, profile: Profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
      // Step 5: Fetch event details for those event_ids
      const eventIds = Array.from(new Set(inviteData.map((invite) => invite.event_matches?.event_id).filter(Boolean)));
      const eventsMap = new Map<string, { id: string; title: string }>();
      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase.from('events').select('id, title').in('id', eventIds);
        (eventsData || []).forEach((event: { id: string; title: string }) => {
          eventsMap.set(event.id, event);
        });
      }
      // Step 6: Merge event info and build competitors array for each invite
      const invitesWithEvent: Invite[] = inviteData.map((invite) => {
        let event: { id: string; title: string } | null = null;
        const eventId = invite.event_matches && typeof invite.event_matches.event_id === 'string' ? invite.event_matches.event_id : undefined;
        if (eventId && eventsMap.has(eventId)) {
          event = eventsMap.get(eventId) || null;
        }
        const matchId = invite.match_id;
        const dbCompetitors = competitorsByMatch[matchId] || [];
        // Fill slots 1 and 2 with actual DB competitors, attach user profile if available
        const competitors = [1, 2].map((position) => {
          const comp = dbCompetitors.find((c) => c.competitor_position === position);
          if (comp) {
            // Type-safe access to confirmed property
            const compWithConfirmed = comp as SupabaseCompetitor & { confirmed?: boolean };
            return {
              ...compWithConfirmed,
              competitor_position: position,
              competitor_type: compWithConfirmed.user_id ? 'registered_user' : 'manual_entry',
              user: compWithConfirmed.user_id ? profilesById[compWithConfirmed.user_id] : undefined,
              confirmed: typeof compWithConfirmed.confirmed === 'boolean' ? compWithConfirmed.confirmed : true,
            };
          } else if (position === invite.competitor_position) {
            // This is the slot the user is being invited to, and it's empty
            return {
              competitor_position: position,
              competitor_type: 'registered_user',
              user_id: user.id,
              confirmed: false,
              user: profile
                ? {
                    id: user.id,
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    username: profile.username,
                    belt_level: profile.belt_level,
                    avatar_url: profile.avatar_url,
                    spotify_id: profile.spotify_id,
                  }
                : {
                    id: user.id,
                    first_name: 'Unknown',
                    last_name: 'User',
                    username: 'unknown_user',
                    belt_level: 'White',
                    avatar_url: '',
                    spotify_id: undefined,
                  },
            };
          } else {
            // Open slot
            return { competitor_position: position };
          }
        });
        return {
          ...invite,
          event,
          match: {
            ...invite.event_matches,
            competitors,
          },
        } as Invite;
      });
      setInvites(invitesWithEvent);
    } catch {
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: Invite) => {
    if (!user) return;
    // Accept: update request status, add competitor to match
    try {
      await supabase.from('event_match_requests').update({ status: 'accepted' }).eq('id', invite.id);
      await supabase.from('event_match_competitors').insert({
        match_id: invite.match_id,
        competitor_position: invite.competitor_position,
        competitor_type: 'registered_user',
        user_id: user.id,
        confirmed: true,
      });
      fetchInvites();
    } catch {}
  };
  const handleRejectInvite = async (invite: Invite) => {
    if (!user) return;
    try {
      await supabase.from('event_match_requests').update({ status: 'rejected' }).eq('id', invite.id);
      fetchInvites();
    } catch {}
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by event type
    if (eventTypeTab !== 'all') {
      filtered = filtered.filter((event) => event.event_type === eventTypeTab);
    }

    // Filter by match type
    if (matchTypeFilter !== 'all') {
      filtered = filtered.filter((event) => event.event_type === matchTypeFilter);
    }

    // Filter by belt level
    if (beltFilter !== 'all') {
      filtered = filtered.filter((event) => event.belt_level.toLowerCase() === beltFilter.toLowerCase());
    }

    // Filter by format
    if (formatFilter !== 'all') {
      filtered = filtered.filter((event) => event.format === formatFilter);
    }

    // Filter by gender
    if (genderFilter !== 'all') {
      filtered = filtered.filter((event) => event.gender === genderFilter);
    }

    // Filter by rule set
    if (ruleSetFilter !== 'all') {
      filtered = filtered.filter((event) => event.rule_set === ruleSetFilter);
    }

    // Filter by sub-only
    if (subOnlyFilter) {
      filtered = filtered.filter((event) => event.sub_only === true);
    }

    // Filter by no time limit
    if (noTimeLimitFilter) {
      filtered = filtered.filter((event) => event.no_time_limit === true);
    }

    setFilteredEvents(filtered);
  };

  const filterMatches = () => {
    let filtered = availableMatches;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (match) => match.event_title.toLowerCase().includes(searchTerm.toLowerCase()) || match.custom_rules?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by belt level
    if (beltFilter !== 'all') {
      filtered = filtered.filter((match) => match.belt_level?.toLowerCase() === beltFilter.toLowerCase());
    }

    // Filter by format
    if (formatFilter !== 'all') {
      const formatMap: Record<string, string> = { gi: 'gi', 'no-gi': 'no_gi' };
      filtered = filtered.filter((match) => (formatMap[formatFilter] ? match.match_format === formatMap[formatFilter] : false) || match.match_format === 'both');
    }

    // Filter by gender
    if (genderFilter !== 'all') {
      filtered = filtered.filter((match) => match.gender === genderFilter);
    }

    // Filter by sub-only
    if (subOnlyFilter) {
      filtered = filtered.filter((match) => match.sub_only === true);
    }

    // Filter by no time limit
    if (noTimeLimitFilter) {
      filtered = filtered.filter((match) => match.time_limit === null);
    }

    setFilteredMatches(filtered);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Events', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden py-3">
              {/* Image skeleton */}
              <div className="aspect-video w-full overflow-hidden">
                <Skeleton className="w-full h-full" />
              </div>
              <CardHeader className="mb-[-16px]">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded" />
                </div>
                <Skeleton className="h-6 w-32 mt-2 rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Find tournaments and matches in your area</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-3 bg-background border">
            <TabsTrigger value="events" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Events
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:text-black">
              My Events
            </TabsTrigger>
            <TabsTrigger value="invites" className="data-[state=active]:bg-white data-[state=active]:text-black">
              My Invites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <div className="flex flex-col gap-6">
              {/* Search Bar */}
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events by title, location, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters Section */}
              <div className="flex flex-col gap-4">
                {/* Filter Dropdowns and Toggles */}
                <div className="flex flex-col sm:flex-row md:flex-row gap-4 flex-wrap items-start sm:items-center">
                  <div className="flex items-center gap-2 shrink-0">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Filters</Label>
                  </div>
                  <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
                    <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder="Match Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="tournament">Tournament</SelectItem>
                      <SelectItem value="match">Superfights</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={beltFilter} onValueChange={setBeltFilter}>
                    <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder="Belt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="brown">Brown</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={formatFilter} onValueChange={setFormatFilter}>
                    <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="gi">Gi</SelectItem>
                      <SelectItem value="no-gi">No-Gi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ruleSetFilter} onValueChange={setRuleSetFilter}>
                    <SelectTrigger className="w-full sm:w-auto">
                      <SelectValue placeholder="Rule Set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="IBJJF">IBJJF</SelectItem>
                      <SelectItem value="ADCC">ADCC</SelectItem>
                      <SelectItem value="EBI">EBI</SelectItem>
                      <SelectItem value="WNO/FloGrappling">WNO/FloGrappling</SelectItem>
                      <SelectItem value="F2W">F2W</SelectItem>
                      <SelectItem value="BJJ Fanatics/Local Tournaments">BJJ Fanatics/Local Tournaments</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center space-x-2">
                    <Switch id="sub-only" checked={subOnlyFilter} onCheckedChange={setSubOnlyFilter} />
                    <Label htmlFor="sub-only">Sub Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="no-time-limit" checked={noTimeLimitFilter} onCheckedChange={setNoTimeLimitFilter} />
                    <Label htmlFor="no-time-limit">No Time Limit</Label>
                  </div>
                </div>
              </div>

              {/* Event Type Tabs */}
              <Tabs value={eventTypeTab} onValueChange={setEventTypeTab}>
                <TabsList className="grid w-full grid-cols-4 bg-background border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black">
                    All Events
                  </TabsTrigger>
                  <TabsTrigger value="tournament" className="data-[state=active]:bg-white data-[state=active]:text-black">
                    Tournaments
                  </TabsTrigger>
                  <TabsTrigger value="match" className="data-[state=active]:bg-white data-[state=active]:text-black">
                    Superfights
                  </TabsTrigger>
                  <TabsTrigger value="matches" className="data-[state=active]:bg-white data-[state=active]:text-black">
                    Matches
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <EventList events={filteredEvents} />
                </TabsContent>
                <TabsContent value="tournament" className="mt-6">
                  <EventList events={filteredEvents} />
                </TabsContent>
                <TabsContent value="match" className="mt-6">
                  <EventList events={filteredEvents} />
                </TabsContent>
                <TabsContent value="matches" className="mt-6">
                  <MatchList
                    matches={filteredMatches.map((match) => ({
                      ...match,
                      competitors: [1, 2].map((position) => {
                        const c = match.competitors.find((comp): comp is SupabaseCompetitor => !!comp && comp.competitor_position === position);
                        if (c) {
                          const base = {
                            ...c,
                            competitor_type: c.user_id ? ('registered_user' as const) : ('manual_entry' as const),
                            user: c.user
                              ? {
                                  ...c.user,
                                  spotify_id: typeof c.user.spotify_id === 'string' ? c.user.spotify_id : undefined,
                                }
                              : undefined,
                          };
                          return hasConfirmed(c) ? { ...base, confirmed: c.confirmed } : { ...base, confirmed: true };
                        }
                        // Open slot: pass undefined, not a manual entry
                        return undefined;
                      }) as (import('@/components/match-card').MatchCardCompetitor | undefined)[],
                      allow_open_requests: match.allow_open_requests,
                    }))}
                    showEventTitle={true}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            <UpcomingMatchesSection />
          </TabsContent>

          <TabsContent value="invites" className="mt-6">
            <div className="flex flex-col gap-6">
              {invitesLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : invites.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-muted-foreground">No pending invites.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {invites.map((invite) => (
                    <Card key={invite.id} className="p-6">
                      <CardHeader>
                        <CardTitle>
                          {invite.event?.title ? (
                            <Link href={`/events/${invite.event.id}`} className="text-primary hover:underline">
                              {invite.event.title}
                            </Link>
                          ) : (
                            <span>Event</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {invite.match ? (
                          <div className="mb-4">
                            <MatchList
                              matches={[
                                {
                                  id: invite.match.id,
                                  event_id: invite.event?.id,
                                  event_title: invite.event?.title,
                                  belt_level: invite.match.belt_level,
                                  match_format: (invite.match.match_format === 'gi' || invite.match.match_format === 'no_gi' || invite.match.match_format === 'both'
                                    ? invite.match.match_format
                                    : 'gi') as 'gi' | 'no_gi' | 'both',
                                  time_limit: invite.match.time_limit,
                                  sub_only: invite.match.sub_only,
                                  custom_rules: invite.match.custom_rules,
                                  gender: invite.match.gender,
                                  weight_limit: invite.match.weight_limit,
                                  status: invite.match.status,
                                  competitors: (invite.match.competitors ?? []).map((c) => {
                                    if (!c) return undefined;
                                    const comp = c as { confirmed?: boolean } & SupabaseCompetitor;
                                    return {
                                      ...comp,
                                      competitor_type: comp.user_id ? 'registered_user' : 'manual_entry',
                                      confirmed: typeof comp.confirmed === 'boolean' ? comp.confirmed : true,
                                      user: comp.user
                                        ? {
                                            ...comp.user,
                                            spotify_id: typeof comp.user.spotify_id === 'string' ? comp.user.spotify_id : undefined,
                                          }
                                        : undefined,
                                    };
                                  }),
                                },
                              ]}
                              showEventTitle={false}
                            />
                          </div>
                        ) : (
                          <div className="mb-4 text-red-500">No match data found for this invite.</div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button onClick={() => handleAcceptInvite(invite)}>Accept</Button>
                          <Button variant="outline" onClick={() => handleRejectInvite(invite)}>
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

interface EventListProps {
  events: Event[];
}

function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No events found</h3>
        <p className="text-muted-foreground">Try adjusting your search or create a new event.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  const IconComponent = getEventTypeIcon(event.event_type);

  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow overflow-hidden cursor-pointer py-3">
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
          <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">{event.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {event.city}, {event.state}
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(event.event_date)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEventTypeIcon(type: string) {
  return type === 'tournament' ? Trophy : Swords;
}

function getEventTypeColor(type: string) {
  return type === 'tournament' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
}
