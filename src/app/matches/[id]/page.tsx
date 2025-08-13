'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserProfileDisplay } from '@/components/user-profile-display';
import { CalendarIcon, MapPin, Clock, Users, AlertTriangle, Dumbbell, ArrowLeft } from 'lucide-react';
import { format as formatDate } from 'date-fns';

interface MatchDetails {
  id: string;
  event_id: string;
  weight_limit: number | null;
  belt_level: string;
  age_category: string;
  match_format: string;
  time_limit: number | null;
  gender: string | null;
  sub_only: boolean;
  custom_rules: string;
  status: string; // Added status to the interface
  event: {
    id: string;
    title: string;
    event_date: string;
    address: string;
    city: string;
    province: string;
    venue: string;
    user_id: string;
    creator: {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      belt_level: string;
      avatar_url: string;
    };
  };
  competitors: Array<{
    id: string;
    competitor_position: number;
    confirmed: boolean;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      belt_level: string;
      avatar_url: string;
    } | null;
  }>;
  userParticipation: {
    isCompetitor: boolean;
    hasPendingRequest: boolean;
    competitorRecord?: {
      id: string;
      confirmed: boolean;
      competitor_position: number;
    };
    requestRecord?: {
      id: string;
      competitor_position: number;
    };
  };
}

interface WithdrawalForm {
  reason: string;
  notes: string;
}

export default function MatchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState<WithdrawalForm>({
    reason: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMatchDetails();
  }, [user, resolvedParams.id]);

  const fetchMatchDetails = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch match details with event info
      const { data: matchData, error: matchError } = await supabase
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
          events!inner (
            id,
            title,
            event_date,
            address,
            city,
            province,
            venue,
            user_id
          )
        `
        )
        .eq('id', resolvedParams.id)
        .single();

      if (matchError) {
        setError('Match not found');
        return;
      }

      // Handle events as object or array
      const eventObj = Array.isArray(matchData.events) ? matchData.events[0] : matchData.events;

      // Fetch event creator
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, belt_level, avatar_url')
        .eq('id', eventObj.user_id)
        .single();

      // Fetch competitors
      // 1. Fetch competitors (get user_ids)
      const { data: competitorsData } = await supabase
        .from('event_match_competitors')
        .select(
          `
          id,
          competitor_position,
          confirmed,
          user_id
        `
        )
        .eq('match_id', resolvedParams.id)
        .order('competitor_position');

      // 2. Get all unique user IDs
      const userIds: string[] = competitorsData?.map((c: { user_id: string | null }) => c.user_id).filter((id): id is string => !!id) || [];
      let userProfiles: Array<{
        id: string;
        first_name: string;
        last_name: string;
        username: string;
        belt_level: string;
        avatar_url: string;
        spotify_id?: string;
      }> = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.from('profiles').select('id, first_name, last_name, username, belt_level, avatar_url, spotify_id').in('id', userIds);
        userProfiles = profileData || [];
      }

      // 3. Merge user profile data with competitors
      const competitors =
        competitorsData?.map((c: { id: string; competitor_position: number; confirmed: boolean; user_id: string | null }) => ({
          id: c.id,
          competitor_position: c.competitor_position,
          confirmed: c.confirmed,
          user: c.user_id ? userProfiles.find((profile) => profile.id === c.user_id) || null : null,
        })) || [];

      // Check user's participation status
      const userCompetitorRecord = competitors.find((c) => c.user && c.user.id === user.id);

      // Check for pending requests
      const { data: pendingRequestData } = await supabase
        .from('event_match_requests')
        .select('id, competitor_position')
        .eq('match_id', resolvedParams.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      const matchDetails: MatchDetails = {
        id: matchData.id,
        event_id: matchData.event_id,
        weight_limit: matchData.weight_limit,
        belt_level: matchData.belt_level,
        age_category: matchData.age_category,
        match_format: matchData.match_format,
        time_limit: matchData.time_limit,
        gender: matchData.gender,
        sub_only: matchData.sub_only,
        custom_rules: matchData.custom_rules,
        status: matchData.status, // Added status to the matchDetails object
        event: {
          id: eventObj.id,
          title: eventObj.title,
          event_date: eventObj.event_date,
          address: eventObj.address,
          city: eventObj.city,
          province: eventObj.province,
          venue: eventObj.venue,
          user_id: eventObj.user_id,
          creator: creatorData || {
            id: '',
            first_name: 'Unknown',
            last_name: 'User',
            username: 'unknown',
            belt_level: 'White',
            avatar_url: '',
          },
        },
        competitors: competitors,
        userParticipation: {
          isCompetitor: !!userCompetitorRecord,
          hasPendingRequest: !!pendingRequestData,
          competitorRecord: userCompetitorRecord
            ? {
                id: userCompetitorRecord.id,
                confirmed: userCompetitorRecord.confirmed,
                competitor_position: userCompetitorRecord.competitor_position,
              }
            : undefined,
          requestRecord: pendingRequestData
            ? {
                id: pendingRequestData.id,
                competitor_position: pendingRequestData.competitor_position,
              }
            : undefined,
        },
      };

      setMatchDetails(matchDetails);
    } catch (err) {
      console.error('Error fetching match details:', err);
      setError('Failed to load match details');
    } finally {
      setLoading(false);
    }
  };

  // Helper to map UI reason to enum
  function mapReasonToEnum(reason: string): 'injury' | 'personal' | 'scheduling' | 'other' {
    switch (reason) {
      case 'Injury':
        return 'injury';
      case 'Illness':
        return 'injury';
      case 'Schedule conflict':
        return 'scheduling';
      case 'Travel issues':
        return 'scheduling';
      case 'Personal reasons':
        return 'personal';
      case 'Other':
        return 'other';
      default:
        return 'other';
    }
  }

  const handleWithdrawal = async () => {
    if (!matchDetails || !withdrawalForm.reason) return;

    setSubmitting(true);

    try {
      // 1. Create withdrawal record (fixed fields)
      const { error: withdrawalError } = await supabase.from('event_withdrawals').insert([
        {
          user_id: user?.id,
          event_id: matchDetails.event_id,
          match_id: matchDetails.id,
          reason: mapReasonToEnum(withdrawalForm.reason),
          comment: withdrawalForm.notes,
        },
      ]);
      if (withdrawalError) {
        console.error('Error creating withdrawal:', withdrawalError);
        return;
      }

      // 2. Only log to competitions if the match status is 'confirmed'
      if (matchDetails.status === 'confirmed') {
        const event = matchDetails.event;
        const competitionData: {
          user_id: string | undefined;
          event_name: string;
          competition_date: string;
          city: string;
          state: string;
          country: string;
          status: string;
          match_type: string;
          result: null;
          notes: string;
        } = {
          user_id: user?.id,
          event_name: event.title,
          competition_date: event.event_date.split('T')[0],
          city: event.city,
          state: event.province,
          country: 'USA',
          status: 'withdrew',
          match_type: 'single',
          result: null,
          notes: withdrawalForm.reason + (withdrawalForm.notes ? `: ${withdrawalForm.notes}` : ''),
        };
        const { error: compError } = await supabase.from('competitions').insert([competitionData]);
        if (compError) {
          console.error('Error creating competition entry:', compError);
          // Continue anyway
        }
      }

      // 3. Remove competitor from match (delete from event_match_competitors)
      if (matchDetails.userParticipation.competitorRecord) {
        const competitorId = matchDetails.userParticipation.competitorRecord.id;
        // Get competitor position for request deletion
        const competitorPosition = matchDetails.userParticipation.competitorRecord.competitor_position;
        // Remove from event_match_competitors
        const { error: removeError } = await supabase.from('event_match_competitors').delete().eq('id', competitorId);
        if (removeError) {
          console.error('Error removing competitor:', removeError);
          return;
        }
        // Remove any pending match requests for this user/position/match
        const { error: requestError } = await supabase
          .from('event_match_requests')
          .delete()
          .eq('match_id', matchDetails.id)
          .eq('competitor_position', competitorPosition)
          .eq('user_id', user?.id);
        if (requestError) {
          console.error('Error deleting match request:', requestError);
        }
      }

      // 4. Remove pending request if they have one (for completeness)
      if (matchDetails.userParticipation.requestRecord) {
        const { error: removeRequestError } = await supabase
          .from('event_match_requests')
          .update({ status: 'withdrawn' })
          .eq('id', matchDetails.userParticipation.requestRecord.id);
        if (removeRequestError) {
          console.error('Error removing request:', removeRequestError);
        }
      }

      // 5. Set match status to 'pending' so manager can reconfirm
      const { error: matchStatusError } = await supabase.from('event_matches').update({ status: 'pending' }).eq('id', matchDetails.id);
      if (matchStatusError) {
        console.error('Error updating match status:', matchStatusError);
      }

      setWithdrawalDialogOpen(false);
      fetchMatchDetails();
      router.push('/competitions');
    } catch (err) {
      console.error('Error withdrawing from match:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawalReasons = ['Injury', 'Illness', 'Schedule conflict', 'Travel issues', 'Personal reasons', 'Other'];

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Events', href: '/events?tab=my-events' },
    { label: 'Match Details', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <div className="h-8 bg-muted rounded-lg animate-pulse" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !matchDetails) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Match</h3>
            <p className="text-muted-foreground mb-4">{error || 'Match not found'}</p>
            <Button onClick={() => router.push('/competitions')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Competitions
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/events?tab=my-events')} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{matchDetails.event.title}</h1>
            <p className="text-muted-foreground">Match Details</p>
          </div>
        </div>

        {/* Match Status */}
        {matchDetails.userParticipation.hasPendingRequest && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Pending Request</span>
                </div>
                <Badge variant="secondary">Position {matchDetails.userParticipation.requestRecord?.competitor_position} Requested</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Competitors - side by side, event style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Competitors
              <Badge className={matchDetails.status === 'confirmed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                {matchDetails.status === 'confirmed' ? 'Confirmed' : 'Pending'}
              </Badge>
            </CardTitle>
            <CardDescription>Current participants in this match</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((position) => {
                const competitor = matchDetails.competitors.find((c) => c.competitor_position === position);
                return (
                  <div key={position} className="border rounded-lg p-3 flex flex-col items-center gap-2 bg-muted/50 w-full min-h-[90px]">
                    <div className="text-sm font-medium mb-1">Competitor {position}</div>
                    {competitor?.user ? (
                      <UserProfileDisplay user={competitor.user} size="lg" showMusicPlayer={false} showUsername={true} showBelt={true} linkToProfile={true} />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full text-muted-foreground">
                        <p className="text-sm mb-2">Open Slot</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event Details & Match Rules - Responsive Row */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-stretch">
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium mr-2">Date:</span>
                    <span>{formatDate(new Date(matchDetails.event.event_date), 'EEEE, MMMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium mr-2">Time:</span>
                    <span>{formatDate(new Date(matchDetails.event.event_date), 'h:mm a')}</span>
                  </div>
                  <div className="flex items-start text-sm">
                    <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <span className="font-medium mr-2">Location:</span>
                      <div className="ml-0">
                        {matchDetails.event.venue && <div>{matchDetails.event.venue}</div>}
                        <div>{matchDetails.event.address}</div>
                        <div>
                          {matchDetails.event.city}, {matchDetails.event.province}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Match Rules & Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex justify-between w-full text-sm">
                    <span className="font-medium">Format:</span>
                    <span>{matchDetails.match_format === 'no_gi' ? 'No Gi' : matchDetails.match_format === 'gi' ? 'Gi' : matchDetails.match_format}</span>
                  </div>
                  <div className="flex justify-between w-full text-sm">
                    <span className="font-medium">Belt Level:</span>
                    <span>{matchDetails.belt_level}</span>
                  </div>
                  <div className="flex justify-between w-full text-sm">
                    <span className="font-medium">Age Category:</span>
                    <span>
                      {matchDetails.age_category === 'normal'
                        ? 'Adult'
                        : matchDetails.age_category === 'kids'
                        ? 'Kids'
                        : matchDetails.age_category === 'masters'
                        ? 'Masters'
                        : matchDetails.age_category}
                    </span>
                  </div>
                  {matchDetails.gender && (
                    <div className="flex justify-between w-full text-sm">
                      <span className="font-medium">Gender:</span>
                      <span>{matchDetails.gender === 'male' ? 'Male' : matchDetails.gender === 'female' ? 'Female' : matchDetails.gender}</span>
                    </div>
                  )}
                  {matchDetails.weight_limit && (
                    <div className="flex justify-between w-full text-sm">
                      <span className="font-medium">Weight Limit:</span>
                      <span>{matchDetails.weight_limit} lbs</span>
                    </div>
                  )}
                  {matchDetails.time_limit && (
                    <div className="flex justify-between w-full text-sm">
                      <span className="font-medium">Time Limit:</span>
                      <span>{matchDetails.time_limit} minutes</span>
                    </div>
                  )}
                  <div className="flex justify-between w-full text-sm">
                    <span className="font-medium">Submissions Only:</span>
                    <span>{matchDetails.sub_only ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                {matchDetails.custom_rules && (
                  <div className="pt-4 border-t">
                    <p className="font-medium text-sm mb-2">Custom Rules:</p>
                    <p className="text-sm text-muted-foreground">{matchDetails.custom_rules}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        {(matchDetails.userParticipation.isCompetitor || matchDetails.userParticipation.hasPendingRequest) && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setWithdrawalDialogOpen(true)} className="text-red-600 hover:text-red-700">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {matchDetails.userParticipation.isCompetitor ? 'Withdraw from Match' : 'Cancel Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{matchDetails.userParticipation.isCompetitor ? 'Withdraw from Match' : 'Cancel Request'}</DialogTitle>
            <DialogDescription>
              {matchDetails.status === 'confirmed'
                ? 'Warning: Withdrawing from a confirmed match will create a competition withdraw log.'
                : 'Withdrawing from a pending match does not constitute a withdraw log.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for {matchDetails.userParticipation.isCompetitor ? 'Withdrawal' : 'Cancellation'}</label>
              <Select value={withdrawalForm.reason} onValueChange={(value) => setWithdrawalForm((prev) => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {withdrawalReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Additional Notes (Optional)</label>
              <Textarea
                value={withdrawalForm.notes}
                onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdrawal} disabled={!withdrawalForm.reason || submitting} className="bg-red-600 hover:bg-red-700">
              {submitting
                ? matchDetails.userParticipation.isCompetitor
                  ? 'Withdrawing...'
                  : 'Cancelling...'
                : matchDetails.userParticipation.isCompetitor
                ? 'Confirm Withdrawal'
                : 'Confirm Cancellation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
