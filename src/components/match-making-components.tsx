'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserProfileDisplay, UserProfile, CompetitorProfile, ManualCompetitorProfile, EmptyCompetitorSlot } from '@/components/user-profile-display';
import { Search, Plus, Users, User, Send, Check, X } from 'lucide-react';

interface Match {
  id: string;
  title: string;
  description: string;
  format: string;
  weight_limit_min: number;
  weight_limit_max: number;
  belt_levels: string[];
  age_category: string;
  competitor_count: number;
  max_competitors: number;
  event_id: string;
  creator_id: string;
  open_requests: boolean;
}

interface Competitor {
  id: string;
  user_id: string | null;
  match_id: string;
  is_manual: boolean;
  confirmed: boolean;
  created_at: string;
  // Manual competitor fields
  name?: string;
  belt?: string;
  weight?: number;
  photo_url?: string;
  // User profile (for registered users)
  user_profile?: UserProfile;
}

interface MatchRequest {
  id: string;
  match_id: string;
  user_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_profile: UserProfile;
}

interface ManualCompetitorForm {
  name: string;
  belt: string;
  weight: number;
  photo_url: string;
}

interface MatchMakingComponentsProps {
  match: Match;
  onMatchUpdate: () => void;
  canEdit: boolean;
}

export function MatchMakingComponents({ match, onMatchUpdate, canEdit }: MatchMakingComponentsProps) {
  const {} = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualForm, setManualForm] = useState<ManualCompetitorForm>({
    name: '',
    belt: '',
    weight: 0,
    photo_url: '',
  });
  const [addCompetitorDialogOpen, setAddCompetitorDialogOpen] = useState(false);
  const [manualCompetitorDialogOpen, setManualCompetitorDialogOpen] = useState(false);

  useEffect(() => {
    fetchCompetitors();
  }, [match.id]);

  const fetchCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from('event_match_competitors')
        .select(
          `
          *,
          profiles!user_id(
            id,
            first_name,
            last_name,
            username,
            belt_level,
            avatar_url
          )
        `
        )
        .eq('match_id', match.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching competitors:', error);
        return;
      }

      const mappedCompetitors = data.map((competitor) => ({
        ...competitor,
        user_profile: competitor.profiles,
      }));

      setCompetitors(mappedCompetitors);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,username.ilike.%${term}%`).limit(10);

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      // Filter out users already in the match
      const existingUserIds = competitors.filter((c) => c.user_id).map((c) => c.user_id);

      const filteredResults = data.filter((user) => !existingUserIds.includes(user.id));

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const addUserToMatch = async (userId: string) => {
    try {
      const { error } = await supabase.from('event_match_competitors').insert([
        {
          match_id: match.id,
          event_id: match.event_id,
          user_id: userId,
          is_manual: false,
          confirmed: false,
        },
      ]);

      if (error) {
        console.error('Error adding user to match:', error);
        return;
      }

      await fetchCompetitors();
      setAddCompetitorDialogOpen(false);
      setSearchTerm('');
      setSearchResults([]);
      onMatchUpdate();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const addManualCompetitor = async () => {
    if (!manualForm.name || !manualForm.belt) return;

    try {
      const { error } = await supabase.from('event_match_competitors').insert([
        {
          match_id: match.id,
          event_id: match.event_id,
          user_id: null,
          is_manual: true,
          confirmed: true,
          name: manualForm.name,
          belt: manualForm.belt,
          weight: manualForm.weight || null,
          photo_url: manualForm.photo_url || null,
        },
      ]);

      if (error) {
        console.error('Error adding manual competitor:', error);
        return;
      }

      await fetchCompetitors();
      setManualCompetitorDialogOpen(false);
      setManualForm({ name: '', belt: '', weight: 0, photo_url: '' });
      onMatchUpdate();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const removeCompetitor = async (competitorId: string) => {
    try {
      const { error } = await supabase.from('event_match_competitors').delete().eq('id', competitorId);

      if (error) {
        console.error('Error removing competitor:', error);
        return;
      }

      await fetchCompetitors();
      onMatchUpdate();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const confirmCompetitor = async (competitorId: string) => {
    try {
      const { error } = await supabase.from('event_match_competitors').update({ confirmed: true }).eq('id', competitorId);

      if (error) {
        console.error('Error confirming competitor:', error);
        return;
      }

      await fetchCompetitors();
      onMatchUpdate();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const beltLevels = ['white', 'blue', 'purple', 'brown', 'black'];

  return (
    <div className="space-y-6">
      {/* Match Info Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{match.title}</h3>
          <p className="text-sm text-muted-foreground">{match.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{match.format}</Badge>
          <Badge variant="secondary">
            {competitors.length}/{match.max_competitors} competitors
          </Badge>
        </div>
      </div>

      {/* Match Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Weight:</span> {match.weight_limit_min}-{match.weight_limit_max} lbs
            </div>
            <div>
              <span className="font-medium">Belt Levels:</span> {match.belt_levels.join(', ')}
            </div>
            <div>
              <span className="font-medium">Age Category:</span> {match.age_category}
            </div>
            <div>
              <span className="font-medium">Format:</span> {match.format}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitors Grid */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Competitors ({competitors.length}/{match.max_competitors})
            </CardTitle>
            {canEdit && (
              <div className="flex gap-2">
                <Dialog open={addCompetitorDialogOpen} onOpenChange={setAddCompetitorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="mr-1 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Competitor</DialogTitle>
                      <DialogDescription>Search for users to add to this match</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or username..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            searchUsers(e.target.value);
                          }}
                          className="pl-10"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {loading ? (
                          <div className="text-center py-4">Searching...</div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                              <UserProfileDisplay user={user} size="sm" linkToProfile={false} />
                              <Button size="sm" onClick={() => addUserToMatch(user.id)}>
                                Add
                              </Button>
                            </div>
                          ))
                        ) : searchTerm ? (
                          <div className="text-center py-4 text-muted-foreground">No users found</div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">Start typing to search for users</div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={manualCompetitorDialogOpen} onOpenChange={setManualCompetitorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <User className="mr-1 h-4 w-4" />
                      Manual Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Manual Competitor</DialogTitle>
                      <DialogDescription>Add a competitor who is not a registered user</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={manualForm.name} onChange={(e) => setManualForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Full name" />
                      </div>
                      <div>
                        <Label htmlFor="belt">Belt Level</Label>
                        <Select value={manualForm.belt} onValueChange={(value) => setManualForm((prev) => ({ ...prev, belt: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select belt level" />
                          </SelectTrigger>
                          <SelectContent>
                            {beltLevels.map((belt) => (
                              <SelectItem key={belt} value={belt}>
                                {belt} Belt
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight (lbs)</Label>
                        <Input
                          id="weight"
                          type="number"
                          value={manualForm.weight || ''}
                          onChange={(e) => setManualForm((prev) => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                          placeholder="Weight in pounds"
                        />
                      </div>
                      <div>
                        <Label htmlFor="photo">Photo URL (optional)</Label>
                        <Input
                          id="photo"
                          value={manualForm.photo_url}
                          onChange={(e) => setManualForm((prev) => ({ ...prev, photo_url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setManualCompetitorDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addManualCompetitor} disabled={!manualForm.name || !manualForm.belt}>
                          Add Competitor
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((competitor, index) => (
              <div key={competitor.id} className="relative">
                {competitor.is_manual ? (
                  <ManualCompetitorProfile
                    name={competitor.name || 'Unknown'}
                    belt={competitor.belt || 'Unknown'}
                    weight={competitor.weight}
                    photoUrl={competitor.photo_url}
                    position={index + 1}
                    confirmed={competitor.confirmed}
                  />
                ) : competitor.user_profile ? (
                  <CompetitorProfile user={competitor.user_profile} position={index + 1} confirmed={competitor.confirmed} />
                ) : (
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Competitor {index + 1}</div>
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                  </div>
                )}

                {canEdit && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    {!competitor.confirmed && (
                      <Button size="sm" variant="outline" onClick={() => confirmCompetitor(competitor.id)} className="h-6 w-6 p-0">
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => removeCompetitor(competitor.id)} className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: match.max_competitors - competitors.length }, (_, i) => (
              <EmptyCompetitorSlot key={`empty-${i}`} position={competitors.length + i + 1} canRequest={!canEdit && match.open_requests} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component for handling match requests
export function MatchRequestsComponent({ match, onMatchUpdate }: { match: Match; onMatchUpdate: () => void }) {
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [match.id]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_match_requests')
        .select(
          `
          *,
          profiles!user_id(
            id,
            first_name,
            last_name,
            username,
            belt_level,
            avatar_url
          )
        `
        )
        .eq('match_id', match.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      const mappedRequests = data.map((request) => ({
        ...request,
        user_profile: request.profiles,
      }));

      setRequests(mappedRequests);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('event_match_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
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
              match_id: match.id,
              event_id: match.event_id,
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
      onMatchUpdate();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading requests...</div>;
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Match Requests</h3>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No pending requests</div>
      ) : (
        pendingRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <UserProfileDisplay user={request.user_profile} size="md" linkToProfile={false} />
                  {request.message && <p className="text-sm text-muted-foreground mt-2">&ldquo;{request.message}&rdquo;</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRequest(request.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRequest(request.id, 'reject')} className="text-red-600 hover:text-red-700">
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// Component for users to request match participation
export function MatchRequestForm({ match, onRequestSent }: { match: Match; onRequestSent: () => void }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const submitRequest = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('event_match_requests').insert([
        {
          match_id: match.id,
          user_id: user.id,
          message: message.trim(),
        },
      ]);

      if (error) {
        console.error('Error submitting request:', error);
        return;
      }

      setDialogOpen(false);
      setMessage('');
      onRequestSent();
    } catch (err) {
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
          <DialogDescription>Send a request to join this match. The event creator will review your request.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why would you like to join this match?" rows={3} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitRequest} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
