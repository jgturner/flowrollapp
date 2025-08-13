import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserProfileDisplay, ManualCompetitorProfile } from './user-profile-display';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Weight, Medal, Users, Clock } from 'lucide-react';

export interface MatchCardCompetitor {
  competitor_position: number;
  competitor_type: 'registered_user' | 'manual_entry';
  user_id?: string | null;
  manual_name?: string | null;
  manual_belt?: string | null;
  manual_weight?: number | null;
  manual_photo_url?: string | null;
  confirmed?: boolean;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    belt_level: string;
    avatar_url: string;
    spotify_id?: string;
  };
}

export interface MatchCardProps {
  match: {
    id: string;
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
    weight_limit_lbs?: string | null;
    weight_limit_kg?: string | null;
    event_id?: string;
    age_category?: string;
  };
  onRequestSlot?: (position: number) => void;
  showEventTitle?: boolean;
  showRequestButton?: boolean;
  requestingPosition?: number | null;
  eligiblePositions?: number[];
  competitorActions?: { [position: number]: React.ReactNode };
  showCard?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  showEventTitle = false,
  competitorActions = {},
  onRequestSlot,
  showRequestButton,
  eligiblePositions = [],
  requestingPosition,
  showCard = true,
}) => {
  const content = (
    <CardContent className="p-4">
      {showEventTitle && match.event_title && match.event_id ? (
        <div className="mb-2 font-semibold text-base truncate">
          <Link href={`/events/${match.event_id}`} className="text-primary hover:underline">
            {match.event_title}
          </Link>
        </div>
      ) : showEventTitle && match.event_title ? (
        <div className="mb-2 font-semibold text-base truncate">{match.event_title}</div>
      ) : null}

      {/* Match Details with Icons */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
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
          <span>{match.age_category === 'kids' ? 'Kids' : match.age_category === 'masters' ? 'Masters' : 'Adult'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{match.match_format === 'gi' ? 'Gi' : match.match_format === 'no_gi' ? 'No-Gi' : 'Both'}</span>
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

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((position) => {
          const competitor = match.competitors[position - 1];
          return (
            <div key={position} className="border rounded-lg p-3">
              <div className="text-sm font-medium mb-2">Competitor {position}</div>
              {competitor ? (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex-1">
                    {competitor.competitor_type === 'registered_user' && competitor.user ? (
                      <UserProfileDisplay user={competitor.user} size="lg" showMusicPlayer={true} showUsername={true} showBelt={true} linkToProfile={true} />
                    ) : competitor.competitor_type === 'manual_entry' ? (
                      <ManualCompetitorProfile
                        name={competitor.manual_name || 'Manual'}
                        belt={competitor.manual_belt || ''}
                        weight={competitor.manual_weight ?? undefined}
                        photoUrl={competitor.manual_photo_url || undefined}
                        position={competitor.competitor_position}
                        confirmed={competitor.confirmed}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
                    {/* Show Pending Approval badge if not confirmed */}
                    {!competitor.confirmed && (
                      <Badge variant="secondary" className="text-xs">
                        Pending Approval
                      </Badge>
                    )}
                    {/* Custom actions for this competitor slot */}
                    {competitorActions && competitorActions[position] && <div className="mt-2 md:mt-0">{competitorActions[position]}</div>}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full text-muted-foreground py-4">
                  <p className="text-sm mb-2">Open Slot</p>
                  {showRequestButton &&
                    (eligiblePositions.includes(position) ? (
                      <Button size="sm" disabled={requestingPosition === position} onClick={() => onRequestSlot && onRequestSlot(position)} type="button">
                        {requestingPosition === position ? 'Requesting...' : 'Invite'}
                      </Button>
                    ) : (
                      <span className="text-xs text-destructive font-semibold">User does not meet reqs/rule set</span>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CardContent>
  );

  return showCard ? <Card>{content}</Card> : content;
};
