'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Upload, X, ArrowLeft, Users, Pencil } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { UserProfileDisplay } from '@/components/user-profile-display';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RulesSetSelect } from '@/components/ui/rules-set-select';
import { MatchCard } from '@/components/match-card';
import { Skeleton } from '@/components/ui/skeleton';

interface EventData {
  id: string;
  title: string;
  description: string;
  event_date: string;
  venue?: string;
  address: string;
  city: string;
  province: string;
  country?: string;
  event_type: 'tournament' | 'match';
  image_url?: string;
  registration_url?: string;
  log_withdrawals: boolean;
  allow_open_requests: boolean;
  user_id: string;
  matches?: MatchData[];
}

interface PendingRequest {
  id: string;
  match_id: string;
  user_id: string;
  competitor_position: number;
  status: string;
  message: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
    spotify_id?: string;
  };
  type?: string;
}

interface MatchData {
  id: string;
  weight_limit: string;
  belt_level: string;
  age_category: string;
  match_format: string;
  time_limit: string;
  gender: string;
  sub_only: boolean;
  custom_rules: string;
  rules_set: string;
  no_time_limit: boolean;
}

interface MatchWithCompetitors {
  id: string;
  event_id: string;
  weight_limit?: number;
  belt_level: string;
  age_category: string;
  match_format: string;
  time_limit?: number;
  gender: string;
  sub_only: boolean;
  custom_rules?: string;
  status: string;
  created_at: string;
  rules_set: string;
  no_time_limit: boolean;
  competitors: {
    id: string;
    competitor_position: number;
    competitor_type: string;
    user_id?: string;
    manual_name?: string;
    manual_belt?: string;
    manual_weight?: number;
    confirmed: boolean;
    profile?: {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      belt_level: string;
      avatar_url?: string;
      spotify_id?: string;
    };
  }[];
}

const BELT_LEVELS = ['White', 'Blue', 'Purple', 'Brown', 'Black'];

export default function EventEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeTab, setActiveTab] = useState('information');
  const [matchesWithCompetitors, setMatchesWithCompetitors] = useState<MatchWithCompetitors[]>([]);
  const [rulesApplyToAllMatches, setRulesApplyToAllMatches] = useState(true);
  const [rulesSet, setRulesSet] = useState<string | undefined>(undefined);
  const [matchFormat, setMatchFormat] = useState('gi');
  const [timeLimit, setTimeLimit] = useState('');
  const [subOnly, setSubOnly] = useState(false);
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const [addingNewMatch, setAddingNewMatch] = useState(false);
  const [newMatchForm, setNewMatchForm] = useState<{
    weight_limit: string;
    belt_level: string;
    gender: string;
    age_category: string;
    match_format: string;
    time_limit: string;
    sub_only: boolean;
    custom_rules: string;
    rules_set: string | undefined;
    no_time_limit: boolean;
    weight_limit_kg: string;
    weight_limit_lbs: string;
  }>({
    weight_limit: '',
    belt_level: '',
    gender: '',
    age_category: 'normal',
    match_format: matchFormat,
    time_limit: '',
    sub_only: subOnly,
    custom_rules: '',
    rules_set: undefined,
    no_time_limit: noTimeLimit,
    weight_limit_kg: '',
    weight_limit_lbs: '',
  });
  const [competitorToRemove, setCompetitorToRemove] = useState<{
    matchId: string;
    competitorId: string;
    userId?: string;
    name: string;
  } | null>(null);
  // Add state for invite modal
  const [inviteModal, setInviteModal] = useState<{ match: MatchWithCompetitors; slot: number } | null>(null);

  // Add new function to remove competitor
  const removeCompetitor = async (matchId: string, competitorId: string, userId?: string) => {
    try {
      console.log('Starting removeCompetitor with:', { matchId, competitorId, userId });

      // First get the competitor's position and the event details
      const { data: competitor, error: competitorError } = await supabase
        .from('event_match_competitors')
        .select('competitor_position, match_id')
        .eq('id', competitorId)
        .single();

      if (competitorError || !competitor) {
        console.error('Error getting competitor position:', competitorError);
        throw new Error('Failed to get competitor position');
      }

      console.log('Found competitor details:', competitor);

      // Get event details to verify permissions
      const { data: match, error: matchError } = await supabase.from('event_matches').select('event_id').eq('id', matchId).single();

      if (matchError || !match) {
        console.error('Error getting match details:', matchError);
        throw new Error('Failed to get match details');
      }

      console.log('Found match details:', match);

      // Delete from event_match_requests using ALL three fields
      const { error: requestError } = await supabase
        .from('event_match_requests')
        .delete()
        .eq('match_id', matchId)
        .eq('competitor_position', competitor.competitor_position)
        .eq('user_id', userId);

      if (requestError) {
        console.error('Error deleting match request:', requestError);
        throw new Error('Failed to delete match request');
      }

      console.log('Successfully deleted match request');

      // Then remove from competitors
      const { error: removeError } = await supabase.from('event_match_competitors').delete().eq('id', competitorId);

      if (removeError) {
        console.error('Error removing competitor:', removeError);
        throw new Error('Failed to remove competitor');
      }

      console.log('Successfully removed competitor');

      // Refresh the matches
      await fetchMatchesWithCompetitors();
    } catch (error) {
      console.error('Error in removeCompetitor:', error);
      alert('Failed to remove competitor. Please try again.');
    }
  };

  // Confirm match handler
  const handleConfirmMatch = async (matchId: string) => {
    try {
      // 1. Update match status
      const { error: matchError } = await supabase.from('event_matches').update({ status: 'confirmed' }).eq('id', matchId);
      if (matchError) {
        alert('Failed to confirm match');
        return;
      }
      // 2. Update all competitors in this match to confirmed
      const { error: competitorsError } = await supabase.from('event_match_competitors').update({ confirmed: true }).eq('match_id', matchId);
      if (competitorsError) {
        alert('Failed to confirm competitors');
        return;
      }
      await fetchMatchesWithCompetitors();
    } catch {
      alert('Failed to confirm match');
    }
  };

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [type, setType] = useState<'tournament' | 'match'>('tournament');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [logWithdrawals, setLogWithdrawals] = useState(false);
  const [openRequests, setOpenRequests] = useState(false);
  const [matches, setMatches] = useState<MatchData[]>([]);

  useEffect(() => {
    fetchEventData();
  }, [eventId, user]);

  useEffect(() => {
    // Always fetch matches before fetching requests
    const fetchAll = async () => {
      await fetchMatchesWithCompetitors();
      if (activeTab === 'matches' && eventData?.event_type === 'match') {
        // already fetched above
      }
      if (eventData?.event_type === 'match') {
        await fetchPendingRequests((eventData.matches || []).map((m) => m.id));
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, user, activeTab, eventData?.event_type]);

  const fetchMatchesWithCompetitors = async () => {
    if (!eventId) return;

    try {
      // Fetch matches
      const { data: matches, error: matchesError } = await supabase
        .from('event_matches')
        .select(
          `
          id,
          event_id,
          weight_limit,
          belt_level,
          age_category,
          match_format,
          time_limit,
          gender,
          sub_only,
          custom_rules,
          status,
          created_at,
          rules_set,
          no_time_limit
        `
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        return;
      }

      if (!matches || matches.length === 0) {
        setMatchesWithCompetitors([]);
        return;
      }

      // Fetch competitors for these matches
      const matchIds = matches.map((m) => m.id);
      const { data: competitors, error: competitorsError } = await supabase
        .from('event_match_competitors')
        .select(
          `
          id,
          match_id,
          competitor_position,
          competitor_type,
          user_id,
          manual_name,
          manual_belt,
          manual_weight,
          confirmed
        `
        )
        .in('match_id', matchIds);

      if (competitorsError) {
        console.error('Error fetching competitors:', competitorsError);
      }

      // Get unique user IDs for registered competitors
      const userIds = new Set<string>();
      (competitors || []).forEach((comp) => {
        if (comp.user_id) userIds.add(comp.user_id);
      });

      // Fetch profiles for registered competitors
      let profiles: { id: string; first_name: string; last_name: string; username: string; belt_level: string; avatar_url?: string; spotify_id?: string }[] = [];
      if (userIds.size > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, belt_level, avatar_url, spotify_id')
          .in('id', Array.from(userIds));

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
        } else {
          profiles = profileData || [];
        }
      }

      // Combine matches with competitor data
      const matchesWithCompetitorData = matches.map((match) => ({
        ...match,
        competitors: (competitors || [])
          .filter((comp) => comp.match_id === match.id)
          .map((comp) => ({
            ...comp,
            profile: comp.user_id ? profiles.find((p) => p.id === comp.user_id) : undefined,
          })),
      }));

      setMatchesWithCompetitors(matchesWithCompetitorData);
    } catch (error) {
      console.error('Error in fetchMatchesWithCompetitors:', error);
    }
  };

  const fetchEventData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: event, error: eventError } = await supabase.from('events').select('*').eq('id', eventId).single();

      if (eventError || !event) {
        setError('Event not found');
        return;
      }

      // Check if user is the creator
      if (event.user_id !== user.id) {
        setError('You are not authorized to edit this event');
        return;
      }

      // Fetch matches if it's a match type event
      let matchesData: MatchData[] = [];
      if (event.event_type === 'match') {
        const { data: matches, error: matchesError } = await supabase.from('event_matches').select('*').eq('event_id', eventId).order('created_at', { ascending: true });

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
        } else {
          matchesData = matches || [];
          console.log('Fetched matches:', matchesData);
          console.log(
            'Match IDs for pending requests:',
            matchesData.map((m) => m.id)
          );
        }
      }

      // Load match settings from event data
      setRulesApplyToAllMatches(event.rules_apply_to_all_matches !== undefined && event.rules_apply_to_all_matches !== null ? event.rules_apply_to_all_matches : true);
      setRulesSet(event.rules_set ? event.rules_set : undefined);
      setMatchFormat(event.match_format || 'gi');
      setTimeLimit(event.time_limit || '');
      setSubOnly(event.sub_only || false);
      setNoTimeLimit(event.no_time_limit || false);

      setEventData({ ...event, matches: matchesData });
      populateForm(event, matchesData);

      // Fetch pending requests if it's a match event
      if (event.event_type === 'match') {
        await fetchPendingRequests(matchesData.map((m) => m.id));
      }
    } catch (err) {
      setError('Failed to load event data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async (matchIds: string[]) => {
    console.log('fetchPendingRequests called with matchIds:', matchIds);
    if (matchIds.length === 0) {
      console.log('No match IDs provided, returning early');
      return;
    }

    try {
      // First fetch the requests
      const { data: requestData, error: requestError } = await supabase
        .from('event_match_requests')
        .select('id, match_id, user_id, competitor_position, status, message, created_at, type')
        .in('match_id', matchIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log('Pending requests query result:', { requestData, requestError });

      if (requestError) {
        console.error('Error in pending requests query:', requestError);
        return;
      }

      if (!requestData || requestData.length === 0) {
        console.log('No pending requests found');
        setPendingRequests([]);
        return;
      }

      // Then fetch the user profiles
      const userIds = requestData.map((req) => req.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, belt_level, avatar_url, spotify_id')
        .in('id', userIds);

      console.log('Profiles query result:', { profilesData, profilesError });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Combine the data
      const combinedData = requestData
        .map((request) => ({
          ...request,
          profiles: profilesData?.find((profile) => profile.id === request.user_id) || null,
        }))
        .filter((request) => request.profiles !== null) as PendingRequest[];

      console.log('Final combined pending requests:', combinedData);
      setPendingRequests(combinedData);
    } catch (err) {
      console.error('Error fetching pending requests:', err);
    }
  };

  const populateForm = (event: EventData, matchesData: MatchData[]) => {
    setTitle(event.title || '');
    setDescription(event.description || '');
    setDate(new Date(event.event_date));
    setVenue(event.venue || '');
    setAddress(event.address || '');
    setCity(event.city || '');
    setState(event.province || '');
    setCountry(event.country || '');
    setType(event.event_type);
    setRegistrationUrl(event.registration_url || '');
    setLogWithdrawals(event.log_withdrawals || false);
    setOpenRequests(event.allow_open_requests || false);

    // Ensure matches data doesn't have null values
    const cleanMatchesData = matchesData.map((match) => ({
      ...match,
      weight_limit: match.weight_limit || '',
      belt_level: match.belt_level || '',
      age_category: match.age_category || 'normal',
      match_format: match.match_format || 'gi',
      time_limit: match.time_limit || '',
      gender: match.gender || '',
      custom_rules: match.custom_rules || '',
      rules_set: match.rules_set || 'no_rules',
      no_time_limit: match.no_time_limit || false,
    }));
    setMatches(cleanMatchesData);

    if (event.image_url) {
      setImagePreview(event.image_url);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, image: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, image: 'File size must be less than 5MB' });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const newErrors = { ...errors };
    delete newErrors.image;
    setErrors(newErrors);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('event-images').getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
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
      fetchEventData();
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
      fetchEventData();
      alert('Request rejected.');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request. Please try again.');
    }
  };

  const openEditMatch = () => {
    // setEditingMatch(match); // Removed
    // setEditMatchForm({ // Removed
    //   weight_limit: match.weight_limit?.toString() || '', // Removed
    //   belt_level: match.belt_level || '', // Removed
    //   gender: match.gender || '', // Removed
    //   age_category: match.age_category || 'normal', // Removed
    //   match_format: match.match_format || 'gi', // Removed
    //   time_limit: match.time_limit?.toString() || '', // Removed
    //   sub_only: match.sub_only || false, // Removed
    //   custom_rules: match.custom_rules || '', // Removed
    //   rules_set: rulesApplyToAllMatches ? rulesSet : match.rules_set && match.rules_set !== 'no_rules' ? match.rules_set : undefined, // Removed
    //   no_time_limit: match.no_time_limit || false, // Removed
    //   weight_limit_kg: match.weight_limit?.toString() || '', // Removed
    //   weight_limit_lbs: '', // Removed
    // }); // Removed
  };

  // Remove: const closeEditMatch = () => { ... } // Removed

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!date) newErrors.date = 'Date is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!state) newErrors.state = 'State is required';

    if (type === 'tournament' && !registrationUrl.trim()) {
      newErrors.registrationUrl = 'Registration URL is required for tournament events';
    }

    if (type === 'match' && matches.length === 0) {
      newErrors.matches = 'At least one match is required for match events';
    }

    // Validate matches
    matches.forEach((match, index) => {
      if (!match.weight_limit) {
        newErrors[`match_${index}_weight`] = 'Weight limit is required';
      }
      if (!match.belt_level) {
        newErrors[`match_${index}_belt`] = 'Belt level is required';
      }
      if (!match.gender) {
        newErrors[`match_${index}_gender`] = 'Gender is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user || !eventData) return;

    setSaving(true);

    try {
      let imageUrl = eventData.image_url;

      // Upload new image if one was selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      // Update event
      const { error: eventError } = await supabase
        .from('events')
        .update({
          title: title.trim(),
          description: description.trim(),
          event_date: date!.toISOString(),
          venue: venue.trim(),
          address: address.trim(),
          city: city.trim(),
          province: state,
          country: country.trim(),
          event_type: type,
          image_url: imageUrl,
          registration_url: type === 'tournament' ? registrationUrl.trim() : null,
          log_withdrawals: logWithdrawals,
          allow_open_requests: openRequests,
          rules_apply_to_all_matches: rulesApplyToAllMatches,
          rules_set: rulesSet ?? null,
          time_limit: noTimeLimit ? null : parseInt(timeLimit) || null,
          sub_only: subOnly,
          no_time_limit: noTimeLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (eventError) {
        console.error('Error updating event:', eventError);
        setErrors({ submit: 'Failed to update event' });
        return;
      }

      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error('Error updating event', err);
      setErrors({ submit: 'Failed to update event' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClick = (matchId: string, competitorId: string, userId?: string, name?: string) => {
    // Store ALL the information we need for deletion
    setCompetitorToRemove({
      matchId,
      competitorId,
      userId,
      name: name || 'this competitor',
    });
  };

  const handleConfirmRemove = async () => {
    if (!competitorToRemove) return;

    await removeCompetitor(competitorToRemove.matchId, competitorToRemove.competitorId, competitorToRemove.userId);

    setCompetitorToRemove(null);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Events', href: '/events' },
    { label: eventData?.title || 'Event', href: `/events/${eventId}` },
    { label: 'Manage', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading event data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">
              {error}
              <div className="mt-4">
                <Button onClick={() => router.push('/events')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Events
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Event</h1>
          <p className="text-muted-foreground">Update your event details and manage match requests</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="information" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Information
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Match Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-white data-[state=active]:text-black">
              Match Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title" className="mb-2 block">
                    Event Title
                  </Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter event title" />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="date" className="mb-2 block">
                    Date & Time
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? formatDate(date, 'PPP p') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="mb-2 block">
                  Description
                </Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your event..." rows={3} />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venue" className="mb-2 block">
                    Venue
                  </Label>
                  <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Enter venue name" />
                  {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
                </div>

                <div>
                  <Label htmlFor="address" className="mb-2 block">
                    Address
                  </Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter venue address" />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="mb-2 block">
                    City
                  </Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Enter city" />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <Label htmlFor="state" className="mb-2 block">
                    Province/State
                  </Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="Enter province/state" />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <Label htmlFor="country" className="mb-2 block">
                    Country
                  </Label>
                  <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Enter country" />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>
              </div>

              {/* Event Image */}
              <div>
                <Label htmlFor="image-upload" className="mb-2 block">
                  Event Image
                </Label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden">
                      <Image src={imagePreview} alt="Event preview" fill className="object-cover" />
                      <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Click to upload event image</span>
                    </label>
                  )}
                  <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </div>
                {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
              </div>

              {/* Tournament-specific fields */}
              {type === 'tournament' && (
                <div>
                  <Label htmlFor="registration-url" className="mb-2 block">
                    Registration URL
                  </Label>
                  <Input
                    id="registration-url"
                    value={registrationUrl}
                    onChange={(e) => setRegistrationUrl(e.target.value)}
                    placeholder="https://smoothcomp.com/en/event/12345"
                  />
                  {errors.registrationUrl && <p className="text-red-500 text-sm mt-1">{errors.registrationUrl}</p>}
                </div>
              )}

              {/* Event Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Event Settings</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="mb-2 block">Log Withdrawals</Label>
                    <p className="text-sm text-muted-foreground">Track withdrawal history on user profiles</p>
                  </div>
                  <Switch checked={logWithdrawals} onCheckedChange={setLogWithdrawals} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="mb-2 block">Open Requests</Label>
                    <p className="text-sm text-muted-foreground">Allow users to request to join matches</p>
                  </div>
                  <Switch checked={openRequests} onCheckedChange={setOpenRequests} />
                </div>

                {/* New Match Settings */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold">Match Settings</h4>
                  <div className="flex items-center space-x-4">
                    <Switch id="rules_apply_to_all_matches" checked={rulesApplyToAllMatches} onCheckedChange={(checked) => setRulesApplyToAllMatches(checked)} />
                    <Label htmlFor="rules_apply_to_all_matches">Rules apply to all matches</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RulesSetSelect value={rulesSet ?? undefined} onChange={setRulesSet} label="Rules Set" placeholder="Select rules set" />
                    <div>
                      <Label className="mb-2 block">Format</Label>
                      <Select value={matchFormat} onValueChange={setMatchFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gi">Gi</SelectItem>
                          <SelectItem value="no_gi">No-Gi</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!noTimeLimit && (
                    <div className="mt-4">
                      <Label className="mb-2 block">Time Limit (minutes)</Label>
                      <Input value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="e.g., 6" type="number" />
                    </div>
                  )}
                  <div className="flex items-center space-x-6 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="sub_only" checked={subOnly} onCheckedChange={setSubOnly} />
                      <Label htmlFor="sub_only">Submission Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="no_time_limit" checked={noTimeLimit} onCheckedChange={setNoTimeLimit} />
                      <Label htmlFor="no_time_limit">No Time Limit</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/events/${eventId}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              {errors.submit && <p className="text-red-500 text-sm text-center">{errors.submit}</p>}
            </form>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            {eventData?.event_type === 'match' && (
              <div className="space-y-6">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Pending Requests</h3>
                    <p className="text-muted-foreground">When users request to join matches, they will appear here for your approval.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      console.log(
                        'EventEditPage pending request types:',
                        pendingRequests.map((r) => r.type)
                      );
                      return null;
                    })()}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Pending Match Requests</h3>
                      <Badge variant="secondary">{pendingRequests.length} pending</Badge>
                    </div>

                    {(() => {
                      // Group requests by match_id
                      const requestsByMatch = pendingRequests.reduce((acc, request) => {
                        if (!acc[request.match_id]) {
                          acc[request.match_id] = [];
                        }
                        acc[request.match_id].push(request);
                        return acc;
                      }, {} as Record<string, typeof pendingRequests>);

                      return Object.entries(requestsByMatch).map(([matchId, matchRequests]) => {
                        const match = matchesWithCompetitors.find((m) => m.id === matchId);
                        if (!match) {
                          // Fallback UI for missing match
                          return (
                            <div key={matchId} className="border rounded-lg p-4 space-y-4 bg-yellow-50">
                              <div className="text-sm text-yellow-800">Match not found (ID: {matchId})</div>
                              {matchRequests.map((request) => (
                                <div key={request.id} className="flex items-center gap-2">
                                  <UserProfileDisplay
                                    user={{
                                      id: request.profiles.id,
                                      first_name: request.profiles.first_name,
                                      last_name: request.profiles.last_name,
                                      username: request.profiles.username,
                                      belt_level: request.profiles.belt_level,
                                      avatar_url: request.profiles.avatar_url,
                                    }}
                                    size="sm"
                                    showMusicPlayer={false}
                                    showUsername={true}
                                    showBelt={true}
                                    linkToProfile={true}
                                  />
                                  <span className="text-xs text-muted-foreground">Requested slot: {request.competitor_position}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }

                        // Prepare competitors for MatchCard - include existing competitors and pending requests
                        const competitors = [1, 2].map((position) => {
                          // First check if there's an existing confirmed competitor
                          const existingComp = match.competitors.find((c) => c.competitor_position === position);
                          if (existingComp) {
                            if (existingComp.profile) {
                              return {
                                competitor_position: existingComp.competitor_position,
                                competitor_type: 'registered_user',
                                user: {
                                  id: existingComp.profile.id,
                                  first_name: existingComp.profile.first_name,
                                  last_name: existingComp.profile.last_name,
                                  username: existingComp.profile.username,
                                  belt_level: existingComp.profile.belt_level,
                                  avatar_url: existingComp.profile.avatar_url,
                                  spotify_id: existingComp.profile.spotify_id,
                                },
                                confirmed: existingComp.confirmed,
                              };
                            } else {
                              return {
                                competitor_position: existingComp.competitor_position,
                                competitor_type: 'manual_entry',
                                manual_name: existingComp.manual_name,
                                manual_belt: existingComp.manual_belt,
                                manual_weight: existingComp.manual_weight,
                                confirmed: existingComp.confirmed,
                              };
                            }
                          }

                          // Then check if there's a pending request for this position
                          const requestForPosition = matchRequests.find((r) => r.competitor_position === position);
                          if (requestForPosition && requestForPosition.profiles) {
                            return {
                              competitor_position: position,
                              competitor_type: 'registered_user',
                              user: {
                                id: requestForPosition.profiles.id,
                                first_name: requestForPosition.profiles.first_name,
                                last_name: requestForPosition.profiles.last_name,
                                username: requestForPosition.profiles.username,
                                belt_level: requestForPosition.profiles.belt_level,
                                avatar_url: requestForPosition.profiles.avatar_url,
                                spotify_id: requestForPosition.profiles.spotify_id || undefined,
                              },
                              confirmed: false,
                            };
                          }

                          return undefined;
                        });

                        // Create actions for each position that has a request
                        const actions: Record<number, React.ReactNode> = {};
                        matchRequests.forEach((request) => {
                          actions[request.competitor_position] = (
                            <div className="flex gap-2">
                              {request.type === 'invite' ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase.from('event_match_requests').delete().eq('id', request.id);
                                      if (error) throw error;
                                      await fetchPendingRequests(matchesWithCompetitors.map((m) => m.id));
                                      alert('Invite cancelled.');
                                    } catch {
                                      alert('Failed to cancel invite.');
                                    }
                                  }}
                                  disabled={saving}
                                >
                                  Cancel Request
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveRequest(request.id, request.match_id, request.user_id, request.competitor_position)}
                                    disabled={saving}
                                  >
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)} disabled={saving}>
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          );
                        });

                        return (
                          <MatchCard
                            key={matchId}
                            match={{
                              id: match.id,
                              belt_level: match.belt_level,
                              age_category: match.age_category,
                              match_format: match.match_format as 'gi' | 'no_gi' | 'both',
                              time_limit: match.time_limit || null,
                              sub_only: match.sub_only,
                              custom_rules: match.custom_rules,
                              gender: match.gender,
                              weight_limit: match.weight_limit || null,
                              status: match.status,
                              competitors: competitors as import('@/components/match-card').MatchCardCompetitor[],
                            }}
                            competitorActions={actions}
                            showCard={false}
                          />
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="matches" className="mt-6 ">
            {eventData?.event_type === 'match' && (
              <div className="space-y-6 w-full">
                {addingNewMatch && (
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle>Add New Match</CardTitle>
                      <CardDescription>Enter match details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSaving(true);
                          // Insert new match into Supabase
                          const { error } = await supabase.from('event_matches').insert({
                            event_id: eventId,
                            weight_limit: newMatchForm.weight_limit_kg,
                            belt_level: newMatchForm.belt_level,
                            age_category: newMatchForm.age_category,
                            match_format: newMatchForm.match_format,
                            time_limit: newMatchForm.no_time_limit ? null : newMatchForm.time_limit,
                            gender: newMatchForm.gender,
                            sub_only: newMatchForm.sub_only,
                            custom_rules: newMatchForm.custom_rules,
                            rules_set: rulesApplyToAllMatches ? rulesSet : newMatchForm.rules_set,
                            no_time_limit: newMatchForm.no_time_limit,
                            use_event_rules: rulesApplyToAllMatches,
                          });
                          setSaving(false);
                          if (!error) {
                            setAddingNewMatch(false);
                            await fetchMatchesWithCompetitors();
                          } else {
                            alert('Failed to add match');
                          }
                        }}
                        className="space-y-4"
                      >
                        {/* Form fields similar to edit match form, but using newMatchForm and setNewMatchForm */}
                        <div>
                          <Label htmlFor="new-weight-limit-lbs" className="mb-2 block">
                            Weight Limit (lbs)
                          </Label>
                          <Input
                            id="new-weight-limit-lbs"
                            value={newMatchForm.weight_limit_lbs}
                            onChange={(e) => {
                              const value = e.target.value;
                              setNewMatchForm({ ...newMatchForm, weight_limit_lbs: value, weight_limit_kg: value ? (parseFloat(value) / 2.20462).toFixed(2) : '' });
                            }}
                            placeholder="e.g., 154"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-weight-limit-kg" className="mb-2 block">
                            Weight Limit (kg)
                          </Label>
                          <Input
                            id="new-weight-limit-kg"
                            value={newMatchForm.weight_limit_kg}
                            onChange={(e) => {
                              const value = e.target.value;
                              setNewMatchForm({ ...newMatchForm, weight_limit_kg: value, weight_limit_lbs: value ? (parseFloat(value) * 2.20462).toFixed(2) : '' });
                            }}
                            placeholder="e.g., 70"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new-belt-level" className="mb-2 block">
                            Belt Level
                          </Label>
                          <Select onValueChange={(value) => setNewMatchForm({ ...newMatchForm, belt_level: value })} defaultValue={newMatchForm.belt_level}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select a belt level" />
                            </SelectTrigger>
                            <SelectContent>
                              {BELT_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="new-gender" className="mb-2 block">
                            Gender
                          </Label>
                          <Select onValueChange={(value) => setNewMatchForm({ ...newMatchForm, gender: value })} defaultValue={newMatchForm.gender}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* If rulesApplyToAllMatches is false, show all rules fields, else hide them */}
                        {!rulesApplyToAllMatches && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <RulesSetSelect
                                value={newMatchForm.rules_set ?? undefined}
                                onChange={(value) => setNewMatchForm({ ...newMatchForm, rules_set: value })}
                                label="Rules Set"
                                placeholder="Select rules set"
                              />
                              <div>
                                <Label className="mb-2 block">Format</Label>
                                <Select value={newMatchForm.match_format || ''} onValueChange={(value) => setNewMatchForm({ ...newMatchForm, match_format: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gi">Gi</SelectItem>
                                    <SelectItem value="no_gi">No-Gi</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {!newMatchForm.no_time_limit && (
                              <div className="mt-4">
                                <Label className="mb-2 block">Time Limit (minutes)</Label>
                                <Input
                                  value={newMatchForm.time_limit}
                                  onChange={(e) => setNewMatchForm({ ...newMatchForm, time_limit: e.target.value })}
                                  placeholder="e.g., 6"
                                  type="number"
                                />
                              </div>
                            )}
                            <div className="flex items-center space-x-6 mt-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="new-sub-only"
                                  checked={newMatchForm.sub_only}
                                  onCheckedChange={(checked) => setNewMatchForm({ ...newMatchForm, sub_only: checked })}
                                />
                                <Label htmlFor="new-sub-only">Submission Only</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="new-no-time-limit"
                                  checked={newMatchForm.no_time_limit}
                                  onCheckedChange={(checked) => setNewMatchForm({ ...newMatchForm, no_time_limit: checked })}
                                />
                                <Label htmlFor="new-no-time-limit">No Time Limit</Label>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="new-custom-rules" className="mb-2 block">
                                Custom Rules
                              </Label>
                              <Textarea
                                id="new-custom-rules"
                                value={newMatchForm.custom_rules}
                                onChange={(e) => setNewMatchForm({ ...newMatchForm, custom_rules: e.target.value })}
                                placeholder="e.g., No elbows, No knees, No headbutts"
                                rows={3}
                              />
                            </div>
                          </>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setAddingNewMatch(false)} disabled={saving}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Add Match'}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
                {matchesWithCompetitors.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Matches Found</h3>
                    <p className="text-muted-foreground">Add matches to your event to manage competitors.</p>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 gap-4">
                    {matchesWithCompetitors.map((match) => {
                      // Map competitors to MatchCardCompetitor[] (ensure two slots)
                      const competitors: (import('@/components/match-card').MatchCardCompetitor | undefined)[] = [1, 2].map((position) => {
                        const comp = match.competitors.find((c) => c.competitor_position === position);
                        if (!comp) return undefined;
                        if (comp.profile) {
                          return {
                            competitor_position: comp.competitor_position,
                            competitor_type: 'registered_user' as const,
                            user_id: comp.user_id,
                            confirmed: comp.confirmed,
                            user: {
                              id: comp.profile.id,
                              first_name: comp.profile.first_name,
                              last_name: comp.profile.last_name,
                              username: comp.profile.username,
                              belt_level: comp.profile.belt_level,
                              avatar_url: comp.profile.avatar_url || '',
                              spotify_id: comp.profile.spotify_id,
                            },
                          };
                        } else {
                          return {
                            competitor_position: comp.competitor_position,
                            competitor_type: 'manual_entry' as const,
                            manual_name: comp.manual_name,
                            manual_belt: comp.manual_belt,
                            manual_weight: comp.manual_weight,
                            confirmed: comp.confirmed,
                          };
                        }
                      });
                      // Custom actions for each competitor slot (remove button)
                      const competitorActions = {
                        1: competitors[0] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => {
                              const comp = match.competitors.find((c) => c.competitor_position === 1);
                              if (comp)
                                handleRemoveClick(
                                  match.id,
                                  comp.id,
                                  comp.user_id,
                                  comp.profile ? `${comp.profile.first_name} ${comp.profile.last_name}` : comp.manual_name || 'this competitor'
                                );
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ),
                        2: competitors[1] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                            onClick={() => {
                              const comp = match.competitors.find((c) => c.competitor_position === 2);
                              if (comp)
                                handleRemoveClick(
                                  match.id,
                                  comp.id,
                                  comp.user_id,
                                  comp.profile ? `${comp.profile.first_name} ${comp.profile.last_name}` : comp.manual_name || 'this competitor'
                                );
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ),
                      };
                      // Add edit and confirm match actions
                      return (
                        <div key={match.id} className="relative">
                          <MatchCard
                            match={{
                              id: match.id,
                              belt_level: match.belt_level,
                              match_format: match.match_format as 'gi' | 'no_gi' | 'both',
                              time_limit: match.time_limit ?? null,
                              sub_only: match.sub_only,
                              custom_rules: match.custom_rules,
                              gender: match.gender,
                              weight_limit: match.weight_limit ?? null,
                              status: match.status,
                              competitors: competitors,
                              weight_limit_lbs: match.weight_limit ? String((parseFloat(match.weight_limit.toString()) * 2.20462).toFixed(0)) : undefined,
                              weight_limit_kg: match.weight_limit ? String(match.weight_limit) : undefined,
                              age_category: match.age_category,
                            }}
                            competitorActions={competitorActions}
                            showRequestButton={true}
                            onRequestSlot={(position) => {
                              setInviteModal({ match, slot: position });
                            }}
                            eligiblePositions={[1, 2]}
                            showCard={false}
                          />
                          {/* Edit and Confirm buttons */}
                          <div className="absolute top-2 right-2 flex gap-2 z-10">
                            <Button variant="outline" size="sm" onClick={openEditMatch} disabled={saving}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {match.competitors.length === 2 && match.status === 'pending' && (
                              <Button onClick={() => handleConfirmMatch(match.id)} variant="default" size="sm">
                                Confirm Match
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add confirmation dialog */}
      <Dialog open={!!competitorToRemove} onOpenChange={(open) => !open && setCompetitorToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Competitor</DialogTitle>
            <DialogDescription>Are you sure you want to remove {competitorToRemove?.name}? This will also delete any match requests they have made.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompetitorToRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Render the InviteUserModal at the root of the component */}
      {inviteModal && (
        <InviteUserModal
          open={true}
          onOpenChange={(open) => setInviteModal(open ? inviteModal : null)}
          match={inviteModal.match}
          slot={inviteModal.slot}
          onInviteSent={fetchMatchesWithCompetitors}
        />
      )}
    </DashboardLayout>
  );
}

function InviteUserModal({
  open,
  onOpenChange,
  match,
  slot,
  onInviteSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchWithCompetitors;
  slot: number;
  onInviteSent: () => void;
}) {
  type UserProfile = {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url?: string;
    gender?: string;
    weight?: number;
    spotify_id?: string;
  };
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter logic: belt, gender, weight
  const fetchUsers = async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('profiles').select('*');
      if (term) {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,username.ilike.%${term}%`);
      }
      const { data, error } = await query.limit(20);
      if (error) throw error;
      // Filter by match requirements
      const filtered = (data || []).filter((user: UserProfile) => {
        if (match.belt_level && user.belt_level && user.belt_level.toLowerCase() !== match.belt_level.toLowerCase()) return false;
        if (match.gender && match.gender !== 'both' && user.gender && user.gender.toLowerCase() !== match.gender.toLowerCase()) return false;
        if (match.weight_limit && user.weight && Number(user.weight) > Number(match.weight_limit)) return false;
        // Exclude users already in the match
        if (match.competitors.some((c) => c.user_id === user.id)) return false;
        return true;
      });
      setResults(filtered);
    } catch {
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchUsers('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User to Match</DialogTitle>
          <DialogDescription>Search for a user to invite to this match slot.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search users by name or username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            fetchUsers(e.target.value);
          }}
          className="mb-4"
        />
        {loading ? (
          <Skeleton className="h-10 w-full mb-2" />
        ) : error ? (
          <div className="text-red-500 text-sm mb-2">{error}</div>
        ) : results.length === 0 ? (
          <div className="text-muted-foreground text-sm mb-2">No users found</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((user) => (
              <div key={user.id ?? ''} className="flex items-center justify-between gap-2 p-2 border rounded">
                {user && typeof user.id === 'string' ? (
                  <UserProfileDisplay
                    user={{
                      id: typeof user.id === 'string' ? user.id : '',
                      first_name: typeof user.first_name === 'string' ? user.first_name : '',
                      last_name: typeof user.last_name === 'string' ? user.last_name : '',
                      username: typeof user.username === 'string' ? user.username : '',
                      belt_level: typeof user.belt_level === 'string' ? user.belt_level : 'White',
                      avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : null,
                      spotify_id: typeof user.spotify_id === 'string' ? user.spotify_id : undefined,
                    }}
                    size="sm"
                    showMusicPlayer={true}
                  />
                ) : null}
                <Button
                  size="sm"
                  disabled={inviting === user.id}
                  onClick={async () => {
                    setInviting(user.id);
                    setError(null);
                    try {
                      const { error } = await supabase.from('event_match_requests').insert({
                        match_id: match.id,
                        user_id: user.id,
                        competitor_position: slot,
                        type: 'invite',
                        status: 'pending',
                        message: '',
                      });
                      if (error) throw error;
                      onInviteSent();
                      onOpenChange(false);
                    } catch {
                      setError('Failed to send invite');
                    } finally {
                      setInviting(null);
                    }
                  }}
                >
                  {inviting === user.id ? 'Inviting...' : 'Invite'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
