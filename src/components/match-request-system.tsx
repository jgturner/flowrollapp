'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfileDisplay, UserProfile } from '@/components/user-profile-display';
import { Send, Check, X, AlertCircle, Users, Calendar, MapPin, Trophy, Filter } from 'lucide-react';
import { format as formatDate } from 'date-fns';

interface MatchRequest {
  id: string;
  match_id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user_profile: UserProfile;
  match: {
    id: string;
    title: string;
    description: string;
    date: string;
    format: string;
    weight_limit_min: number;
    weight_limit_max: number;
    belt_levels: string[];
    competitor_count: number;
    max_competitors: number;
    open_requests: boolean;
    event: {
      id: string;
      title: string;
      city: string;
      state: string;
      creator_id: string;
    };
  };
}

interface MatchRequestFormData {
  message: string;
  experience_level: string;
  training_frequency: string;
  goals: string;
}

interface MatchRequestSystemProps {
  userRole: 'requester' | 'creator';
  eventId?: string;
  matchId?: string;
}

export function MatchRequestSystem({ userRole, eventId, matchId }: MatchRequestSystemProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchRequests();
  }, [user, eventId, matchId, userRole]);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('event_match_requests').select(`
          *,
          profiles!user_id(
            id,
            first_name,
            last_name,
            username,
            belt_level,
            avatar_url,
            spotify_id
          ),
          event_matches!match_id(
            id,
            title,
            description,
            date,
            format,
            weight_limit_min,
            weight_limit_max,
            belt_levels,
            competitor_count,
            max_competitors,
            open_requests,
            events!event_id(
              id,
              title,
              city,
              state,
              creator_id
            )
          )
        `);

      if (userRole === 'requester') {
        query = query.eq('user_id', user.id);
      } else if (userRole === 'creator') {
        if (eventId) {
          query = query.eq('event_matches.event_id', eventId);
        }
        // Filter for events created by the current user
        query = query.eq('event_matches.events.creator_id', user.id);
      }

      if (matchId) {
        query = query.eq('match_id', matchId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        setError('Failed to load requests');
        console.error('Error fetching requests:', error);
        return;
      }

      const mappedRequests = data.map((request) => ({
        ...request,
        user_profile: request.profiles,
        match: {
          ...request.event_matches,
          event: request.event_matches.events,
        },
      }));

      setRequests(mappedRequests);
    } catch {
      setError('Failed to load requests');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('event_match_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        return;
      }

      // If approved, add user to match
      if (action === 'approve') {
        const request = requests.find((r) => r.id === requestId);
        if (request) {
          const { error: addError } = await supabase.from('event_match_competitors').insert([
            {
              match_id: request.match_id,
              event_id: request.match.event.id,
              user_id: request.user_id,
              is_manual: false,
              confirmed: false,
            },
          ]);

          if (addError) {
            console.error('Error adding user to match:', addError);
            return;
          }
        }
      }

      await fetchRequests();
    } catch {
      console.error('Error handling request:', err);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const groupedRequests = {
    pending: filteredRequests.filter((r) => r.status === 'pending'),
    approved: filteredRequests.filter((r) => r.status === 'approved'),
    rejected: filteredRequests.filter((r) => r.status === 'rejected'),
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Requests</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
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
          <CardTitle>Match Requests</CardTitle>
          <CardDescription>Error loading requests</CardDescription>
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
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {userRole === 'creator' ? 'Match Requests' : 'My Requests'}
            </CardTitle>
            <CardDescription>{userRole === 'creator' ? 'Manage requests to join your events' : 'Track your match requests'}</CardDescription>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {userRole === 'creator' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending ({groupedRequests.pending.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({groupedRequests.approved.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({groupedRequests.rejected.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <RequestsList requests={groupedRequests.pending} onAction={handleRequestAction} showActions={true} />
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              <RequestsList requests={groupedRequests.approved} onAction={handleRequestAction} showActions={false} />
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              <RequestsList requests={groupedRequests.rejected} onAction={handleRequestAction} showActions={false} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <RequestsList requests={filteredRequests} onAction={handleRequestAction} showActions={false} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RequestsListProps {
  requests: MatchRequest[];
  onAction: (requestId: string, action: 'approve' | 'reject') => void;
  showActions: boolean;
}

function RequestsList({ requests, onAction, showActions }: RequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
        <p>No requests found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <UserProfileDisplay user={request.user_profile} size="sm" showMusicPlayer={true} />
                  <Badge className={getStatusColor(request.status)}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</Badge>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">{request.match.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(new Date(request.match.date), 'MMM dd, yyyy h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {request.match.event.city}, {request.match.event.state}
                    </span>
                  </div>
                </div>
              </div>

              {showActions && request.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onAction(request.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onAction(request.id, 'reject')} className="text-red-600 hover:text-red-700">
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>

            {/* Match Details */}
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <h4 className="font-medium text-sm mb-2">Match Details</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Format:</span> {request.match.format}
                </div>
                <div>
                  <span className="font-medium">Weight:</span> {request.match.weight_limit_min}-{request.match.weight_limit_max} lbs
                </div>
                <div>
                  <span className="font-medium">Belt Levels:</span> {request.match.belt_levels.join(', ')}
                </div>
                <div>
                  <span className="font-medium">Competitors:</span> {request.match.competitor_count}/{request.match.max_competitors}
                </div>
              </div>
            </div>

            {/* Request Message */}
            {request.message && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-medium">Message:</span> &ldquo;{request.message}&rdquo;
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
              <span>Requested {formatDate(new Date(request.created_at), 'MMM dd, yyyy h:mm a')}</span>
              {request.status !== 'pending' && (
                <span>
                  {request.status === 'approved' ? 'Approved' : 'Rejected'} {formatDate(new Date(request.updated_at), 'MMM dd, yyyy h:mm a')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Component for submitting match requests
export function MatchRequestForm({ matchId, matchTitle, onRequestSent }: { matchId: string; matchTitle: string; onRequestSent: () => void }) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<MatchRequestFormData>({
    message: '',
    experience_level: '',
    training_frequency: '',
    goals: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('event_match_requests').insert([
        {
          match_id: matchId,
          user_id: user.id,
          message: formData.message.trim(),
          status: 'pending',
        },
      ]);

      if (error) {
        console.error('Error submitting request:', error);
        return;
      }

      setDialogOpen(false);
      setFormData({
        message: '',
        experience_level: '',
        training_frequency: '',
        goals: '',
      });
      onRequestSent();
    } catch {
      console.error('Error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Send className="mr-1 h-4 w-4" />
          Request Match
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to Join Match</DialogTitle>
          <DialogDescription>Send a request to join &ldquo;{matchTitle}&rdquo;. The event creator will review your request.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Why would you like to join this match? Any relevant experience or goals?"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="experience">Experience Level</Label>
            <Select value={formData.experience_level} onValueChange={(value) => setFormData((prev) => ({ ...prev, experience_level: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
                <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                <SelectItem value="expert">Expert/Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="frequency">Training Frequency</Label>
            <Select value={formData.training_frequency} onValueChange={(value) => setFormData((prev) => ({ ...prev, training_frequency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="How often do you train?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-2x">1-2 times per week</SelectItem>
                <SelectItem value="3-4x">3-4 times per week</SelectItem>
                <SelectItem value="5-6x">5-6 times per week</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing match requests
export function useMatchRequests(userRole: 'requester' | 'creator', eventId?: string) {
  const { user } = useAuth();
  const [requests] = useState<MatchRequest[]>([]);
  const [loading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, eventId, userRole]);

  const fetchRequests = async () => {
    // Implementation similar to MatchRequestSystem
    // This hook can be used by other components that need request data
  };

  const submitRequest = async (matchId: string, message: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { error } = await supabase.from('event_match_requests').insert([
        {
          match_id: matchId,
          user_id: user.id,
          message: message.trim(),
          status: 'pending',
        },
      ]);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchRequests();
      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('event_match_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      await fetchRequests();
      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  return {
    requests,
    loading,
    error,
    submitRequest,
    handleRequest,
    refetch: fetchRequests,
  };
}
