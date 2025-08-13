import React, { useState } from 'react';
import { MatchCard, MatchCardCompetitor } from './match-card';
import { useAuth } from '@/contexts/auth-context';
import { Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface MatchListMatch {
  id: string;
  event_id?: string;
  event_title?: string;
  event_date?: string;
  belt_level: string;
  match_format: 'gi' | 'no_gi' | 'both';
  time_limit: number | null;
  sub_only: boolean;
  custom_rules?: string | null;
  gender: string;
  weight_limit: number | null;
  status: string;
  competitors: (MatchCardCompetitor | undefined)[];
}

interface MatchListProps {
  matches: MatchListMatch[];
  onRequestSlot?: (matchId: string, position: number) => Promise<void>;
  showEventTitle?: boolean;
  emptyText?: string;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, onRequestSlot, showEventTitle = false, emptyText }) => {
  const { user, profile } = useAuth();
  // If Profile type is not imported, define it here
  type Profile = {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
    weight?: number;
    gender?: string;
  };
  const [requesting, setRequesting] = useState<{ matchId: string; position: number } | null>(null);

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">{emptyText || 'No matches found'}</h3>
        <p className="text-muted-foreground">Try adjusting your search or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        // Determine eligibility for each slot
        const eligiblePositions = [1, 2].filter((position) => {
          const competitor = match.competitors.find((c): c is MatchCardCompetitor => !!c && c.competitor_position === position);
          if (competitor) return false; // Slot taken
          if (!profile) return true; // If no profile, allow (will redirect to login)
          // Eligibility logic (gender, belt, weight)
          const profileAny = profile as Profile;
          if (!profileAny.gender || !profileAny.belt_level || profileAny.weight === null || profileAny.weight === undefined) {
            return false;
          }
          if (match.gender && match.gender.toLowerCase() !== String(profileAny.gender).toLowerCase()) {
            return false;
          }
          if (match.belt_level && match.belt_level.toLowerCase() !== String(profileAny.belt_level).toLowerCase()) {
            return false;
          }
          if (typeof match.weight_limit === 'number' && Number(profileAny.weight) > match.weight_limit) {
            return false;
          }
          return true;
        });

        // Map competitors to MatchCardCompetitor, ensuring two slots (undefined for open slots)
        const competitors: (MatchCardCompetitor | undefined)[] = [1, 2].map((position) => {
          return (match.competitors ?? []).find((c): c is MatchCardCompetitor => !!c && c.competitor_position === position) || undefined;
        });

        const handleRequestSlot = async (position: number) => {
          if (!user) {
            window.location.href = '/login';
            return;
          }
          setRequesting({ matchId: match.id, position });
          try {
            if (onRequestSlot) {
              await onRequestSlot(match.id, position);
            } else {
              // Default: Supabase logic for event_match_requests
              const { data: existingRequest, error: checkError } = await supabase
                .from('event_match_requests')
                .select('id, status')
                .eq('match_id', match.id)
                .eq('user_id', user.id)
                .eq('competitor_position', position)
                .single();

              if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
              }

              if (existingRequest) {
                if (existingRequest.status === 'pending') {
                  alert('You already have a pending request for this position.');
                  setRequesting(null);
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
                  setRequesting(null);
                  return;
                }
              } else {
                // Create new request
                const { error } = await supabase.from('event_match_requests').insert({
                  match_id: match.id,
                  user_id: user.id,
                  competitor_position: position,
                  message: 'Request to join match',
                });
                if (error) throw error;
              }
              // Refresh available matches
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
              alert('Match request submitted successfully!');
            }
          } catch (err) {
            console.error('Error requesting match:', err);
            alert('Failed to submit match request. Please try again.');
          } finally {
            setRequesting(null);
          }
        };

        return (
          <MatchCard
            key={match.id}
            match={{ ...match, competitors, event_id: match.event_id }}
            onRequestSlot={handleRequestSlot}
            showEventTitle={showEventTitle}
            showRequestButton={true}
            requestingPosition={requesting && requesting.matchId === match.id ? requesting.position : null}
            eligiblePositions={eligiblePositions}
          />
        );
      })}
    </div>
  );
};
