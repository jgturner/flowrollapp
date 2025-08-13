'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { handleMatchWithdrawal } from '@/lib/competition-integration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfileDisplay } from '@/components/user-profile-display';
import { AlertTriangle, Calendar, MapPin, Trophy, FileText, Clock, User, TrendingDown, CheckCircle } from 'lucide-react';
import { format as formatDate } from 'date-fns';

interface WithdrawalData {
  id: string;
  user_id: string;
  event_id: string;
  match_id: string;
  reason: string;
  notes: string | null;
  created_at: string;
  event: {
    title: string;
    city: string;
    state: string;
    date: string;
  };
  match: {
    title: string;
    description: string;
    date: string;
    format: string;
  };
  user_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
  };
}

interface WithdrawalForm {
  reason: string;
  notes: string;
  confirmationText: string;
  acknowledgeConsequences: boolean;
}

interface WithdrawalSystemProps {
  mode: 'withdrawal' | 'history';
  matchId?: string;
  eventId?: string;
  userId?: string;
}

const WITHDRAWAL_REASONS = [
  'Injury',
  'Illness',
  'Schedule conflict',
  'Travel issues',
  'Family emergency',
  'Work commitment',
  'Financial reasons',
  'Personal reasons',
  'Change of mind',
  'Training concerns',
  'Equipment issues',
  'Other',
];

const WITHDRAWAL_CONSEQUENCES = [
  'Your spot will be given to another competitor',
  'You may not be able to re-enter this match',
  'This withdrawal will be recorded in your profile',
  'Frequent withdrawals may affect future match approvals',
  'Event organizers will be notified of your withdrawal',
];

export function WithdrawalSystem({ mode, matchId, eventId, userId }: WithdrawalSystemProps) {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'history') {
      fetchWithdrawalHistory();
    }
  }, [mode, user, eventId, userId]);

  const fetchWithdrawalHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('event_withdrawals').select(`
          *,
          events!event_id(
            title,
            city,
            state,
            date
          ),
          event_matches!match_id(
            title,
            description,
            date,
            format
          ),
          profiles!user_id(
            id,
            first_name,
            last_name,
            username,
            belt_level,
            avatar_url
          )
        `);

      // Filter based on props
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (user) {
        query = query.eq('user_id', user.id);
      }

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      if (matchId) {
        query = query.eq('match_id', matchId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        setError('Failed to load withdrawal history');
        console.error('Error fetching withdrawals:', error);
        return;
      }

      const mappedWithdrawals = data.map((withdrawal) => ({
        ...withdrawal,
        event: withdrawal.events,
        match: withdrawal.event_matches,
        user_profile: withdrawal.profiles,
      }));

      setWithdrawals(mappedWithdrawals);
    } catch (err) {
      setError('Failed to load withdrawal history');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'withdrawal') {
    return null; // Withdrawal component is handled by WithdrawalButton
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Loading withdrawal records...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
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
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Error loading withdrawal records</CardDescription>
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
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Withdrawal History
        </CardTitle>
        <CardDescription>{userId ? 'User withdrawal history' : 'Your withdrawal history'}</CardDescription>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">No Withdrawals</h3>
            <p>Great commitment record! No withdrawals found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <WithdrawalHistoryCard key={withdrawal.id} withdrawal={withdrawal} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WithdrawalHistoryCardProps {
  withdrawal: WithdrawalData;
}

function WithdrawalHistoryCard({ withdrawal }: WithdrawalHistoryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold">{withdrawal.event.title}</h4>
            <p className="text-sm text-muted-foreground">{withdrawal.match.title}</p>
          </div>
          <Badge variant="outline" className="text-red-600">
            Withdrawn
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(new Date(withdrawal.match.date), 'MMM dd, yyyy h:mm a')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>
              {withdrawal.event.city}, {withdrawal.event.state}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span>{withdrawal.match.format}</span>
          </div>
        </div>

        {withdrawal.user_profile && (
          <div className="mb-3">
            <UserProfileDisplay user={withdrawal.user_profile} size="sm" showMusicPlayer={false} />
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="font-medium text-sm">Withdrawal Reason</span>
          </div>
          <p className="text-sm">{withdrawal.reason}</p>
          {withdrawal.notes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Notes:</span> {withdrawal.notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Withdrawn on {formatDate(new Date(withdrawal.created_at), 'MMM dd, yyyy h:mm a')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface WithdrawalButtonProps {
  matchId: string;
  eventId: string;
  matchTitle: string;
  eventTitle: string;
  matchDate: string;
  onWithdrawalComplete: () => void;
  disabled?: boolean;
}

export function WithdrawalButton({ matchId, eventId, matchTitle, eventTitle, matchDate, onWithdrawalComplete, disabled = false }: WithdrawalButtonProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'confirmation' | 'processing'>('form');
  const [form, setForm] = useState<WithdrawalForm>({
    reason: '',
    notes: '',
    confirmationText: '',
    acknowledgeConsequences: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setForm({
      reason: '',
      notes: '',
      confirmationText: '',
      acknowledgeConsequences: false,
    });
    setCurrentStep('form');
  };

  const handleNext = () => {
    if (currentStep === 'form' && form.reason) {
      setCurrentStep('confirmation');
    }
  };

  const handleBack = () => {
    if (currentStep === 'confirmation') {
      setCurrentStep('form');
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!user || !form.acknowledgeConsequences || form.confirmationText.toLowerCase() !== 'withdraw') {
      return;
    }

    setSubmitting(true);
    setCurrentStep('processing');

    try {
      // Use the integration function to handle withdrawal
      const result = await handleMatchWithdrawal(user.id, matchId, form.reason, form.notes);

      if (!result.success) {
        console.error('Withdrawal failed:', result.error);
        setCurrentStep('confirmation');
        return;
      }

      // Also remove from match competitors
      const { error: removeError } = await supabase.from('event_match_competitors').delete().eq('match_id', matchId).eq('user_id', user.id);

      if (removeError) {
        console.error('Error removing from match:', removeError);
      }

      setDialogOpen(false);
      resetForm();
      onWithdrawalComplete();
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      setCurrentStep('confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <AlertTriangle className="mr-1 h-4 w-4" />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Withdraw from Match</DialogTitle>
          <DialogDescription>
            You are withdrawing from "{matchTitle}" in {eventTitle}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'form' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Important Notice</h4>
              </div>
              <p className="text-sm text-yellow-700">Withdrawing from this match will have the following consequences:</p>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                {WITHDRAWAL_CONSEQUENCES.map((consequence, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Withdrawal *</Label>
              <Select value={form.reason} onValueChange={(value) => setForm((prev) => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {WITHDRAWAL_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information about your withdrawal..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!form.reason} className="bg-red-600 hover:bg-red-700">
                Continue
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'confirmation' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-800">Final Confirmation</h4>
              </div>
              <p className="text-sm text-red-700">This action cannot be undone. You are about to withdraw from:</p>
              <div className="mt-2 p-3 bg-white rounded border text-sm">
                <div className="font-semibold">{matchTitle}</div>
                <div className="text-muted-foreground">{eventTitle}</div>
                <div className="text-muted-foreground">{formatDate(new Date(matchDate), 'MMM dd, yyyy h:mm a')}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={form.acknowledgeConsequences}
                  onChange={(e) => setForm((prev) => ({ ...prev, acknowledgeConsequences: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="acknowledge" className="text-sm">
                  I understand and acknowledge the consequences of withdrawing from this match
                </label>
              </div>

              <div>
                <Label htmlFor="confirmation">Type "WITHDRAW" to confirm (case-insensitive)</Label>
                <Input
                  id="confirmation"
                  value={form.confirmationText}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmationText: e.target.value }))}
                  placeholder="Type WITHDRAW to confirm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleConfirmWithdrawal}
                disabled={!form.acknowledgeConsequences || form.confirmationText.toLowerCase() !== 'withdraw'}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <h4 className="font-semibold mb-2">Processing Withdrawal</h4>
            <p className="text-sm text-muted-foreground">Please wait while we process your withdrawal...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing withdrawals
export function useWithdrawals(userId?: string) {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [user, userId]);

  const fetchWithdrawals = async () => {
    if (!user && !userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('event_withdrawals')
        .select(
          `
          *,
          events!event_id(title, city, state, date),
          event_matches!match_id(title, description, date, format)
        `
        )
        .eq('user_id', userId || user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to load withdrawals');
        console.error('Error fetching withdrawals:', error);
        return;
      }

      setWithdrawals(data || []);
    } catch (err) {
      setError('Failed to load withdrawals');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWithdrawalStats = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const last30Days = withdrawals.filter((w) => new Date(w.created_at) >= thirtyDaysAgo).length;
    const last90Days = withdrawals.filter((w) => new Date(w.created_at) >= ninetyDaysAgo).length;

    return {
      total: withdrawals.length,
      last30Days,
      last90Days,
      mostCommonReason: withdrawals.reduce((acc, w) => {
        acc[w.reason] = (acc[w.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  };

  return {
    withdrawals,
    loading,
    error,
    stats: getWithdrawalStats(),
    refetch: fetchWithdrawals,
  };
}
