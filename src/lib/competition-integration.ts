import { supabase } from './supabase';

export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId?: string;
  winMethod: 'submission' | 'points' | 'referee_decision' | 'disqualification';
  finishTime?: string;
  notes?: string;
}

export interface CompetitionEntry {
  user_id: string;
  event_name: string;
  competition_date: string;
  city: string;
  state: string;
  country: string;
  placement?: number;
  result?: 'win' | 'loss';
  status: 'completed' | 'disqualified' | 'injured' | 'withdrew';
  match_type: 'single' | 'single_team' | 'tournament' | 'tournament_team';
  podium_photo_url?: string;
}

/**
 * Creates competition entries for all participants in a match when results are set
 */
export async function createCompetitionEntriesFromMatch(matchId: string, result: MatchResult): Promise<{ success: boolean; error?: string }> {
  try {
    // Get match details
    const { data: matchData, error: matchError } = await supabase
      .from('event_matches')
      .select(
        `
        *,
        events!inner(
          title,
          date,
          city,
          state,
          address
        )
      `
      )
      .eq('id', matchId)
      .single();

    if (matchError || !matchData) {
      return { success: false, error: 'Failed to fetch match data' };
    }

    // Get all competitors in the match
    const { data: competitors, error: competitorsError } = await supabase
      .from('event_match_competitors')
      .select('*')
      .eq('match_id', matchId)
      .eq('is_manual', false) // Only create entries for registered users
      .eq('confirmed', true); // Only for confirmed competitors

    if (competitorsError) {
      return { success: false, error: 'Failed to fetch competitors' };
    }

    if (!competitors || competitors.length === 0) {
      return { success: false, error: 'No confirmed competitors found' };
    }

    // Create competition entries for each competitor
    const competitionEntries: CompetitionEntry[] = competitors.map((competitor) => {
      const isWinner = competitor.user_id === result.winnerId;
      const isLoser = competitor.user_id === result.loserId;

      // Determine status based on win method
      let status: CompetitionEntry['status'] = 'completed';
      if (result.winMethod === 'disqualification') {
        status = isLoser ? 'disqualified' : 'completed';
      }

      return {
        user_id: competitor.user_id,
        event_name: matchData.events[0].title,
        competition_date: matchData.date.split('T')[0], // Extract date part
        city: matchData.events[0].city,
        state: matchData.events[0].state,
        country: 'USA', // Default to USA, could be made configurable
        result: isWinner ? 'win' : 'loss',
        status,
        match_type: 'single', // Matches are single type
        // Could add photo URL if available
      };
    });

    // Insert competition entries
    const { error: insertError } = await supabase.from('competitions').insert(competitionEntries);

    if (insertError) {
      return { success: false, error: 'Failed to create competition entries' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating competition entries:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Creates competition entries for tournament results
 */
export async function createCompetitionEntriesFromTournament(
  eventId: string,
  placements: { user_id: string; placement: number }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get event details
    const { data: eventData, error: eventError } = await supabase.from('events').select('*').eq('id', eventId).single();

    if (eventError || !eventData) {
      return { success: false, error: 'Failed to fetch event data' };
    }

    // Create competition entries for each participant
    const competitionEntries: CompetitionEntry[] = placements.map((placement) => ({
      user_id: placement.user_id,
      event_name: eventData.title,
      competition_date: eventData.date.split('T')[0],
      city: eventData.city,
      state: eventData.state,
      country: 'USA',
      placement: placement.placement,
      status: 'completed',
      match_type: 'tournament',
    }));

    // Insert competition entries
    const { error: insertError } = await supabase.from('competitions').insert(competitionEntries);

    if (insertError) {
      return { success: false, error: 'Failed to create competition entries' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating competition entries:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Updates match with result and creates competition entries
 */
export async function setMatchResultAndCreateCompetitions(matchId: string, result: MatchResult): Promise<{ success: boolean; error?: string }> {
  try {
    // Update match with result
    const { error: updateError } = await supabase
      .from('event_matches')
      .update({
        winner_id: result.winnerId,
        loser_id: result.loserId,
        win_method: result.winMethod,
        finish_time: result.finishTime,
        result_notes: result.notes,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId);

    if (updateError) {
      return { success: false, error: 'Failed to update match result' };
    }

    // Create competition entries
    const competitionResult = await createCompetitionEntriesFromMatch(matchId, result);

    if (!competitionResult.success) {
      return competitionResult;
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting match result:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Handles withdrawal from a match and creates competition entry
 */
export async function handleMatchWithdrawal(userId: string, matchId: string, reason: string, notes?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get match and event details
    const { data: matchData, error: matchError } = await supabase
      .from('event_matches')
      .select(
        `
        *,
        events!inner(
          title,
          date,
          city,
          state
        )
      `
      )
      .eq('id', matchId)
      .single();

    if (matchError || !matchData) {
      return { success: false, error: 'Failed to fetch match data' };
    }

    // Create withdrawal record
    const { error: withdrawalError } = await supabase.from('event_withdrawals').insert({
      user_id: userId,
      match_id: matchId,
      event_id: matchData.event_id,
      reason,
      notes: notes || null,
    });

    if (withdrawalError) {
      return { success: false, error: 'Failed to create withdrawal record' };
    }

    // Create competition entry with withdrawal status
    const competitionEntry: CompetitionEntry = {
      user_id: userId,
      event_name: matchData.events[0].title,
      competition_date: matchData.date.split('T')[0],
      city: matchData.events[0].city,
      state: matchData.events[0].state,
      country: 'USA',
      status: 'withdrew',
      match_type: 'single',
    };

    const { error: competitionError } = await supabase.from('competitions').insert(competitionEntry);

    if (competitionError) {
      return { success: false, error: 'Failed to create competition entry' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling withdrawal:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Checks if a user already has a competition entry for a specific match
 */
export async function hasCompetitionEntryForMatch(userId: string, matchId: string): Promise<boolean> {
  try {
    // Get match details to compare with existing competitions
    const { data: matchData, error: matchError } = await supabase
      .from('event_matches')
      .select(
        `
        date,
        events!inner(title)
      `
      )
      .eq('id', matchId)
      .single();

    if (matchError || !matchData) {
      return false;
    }

    // Check if competition entry already exists
    const { data: existingEntry, error: checkError } = await supabase
      .from('competitions')
      .select('id')
      .eq('user_id', userId)
      .eq('event_name', matchData.events[0].title)
      .eq('competition_date', matchData.date.split('T')[0])
      .limit(1);

    if (checkError) {
      return false;
    }

    return existingEntry && existingEntry.length > 0;
  } catch (error) {
    console.error('Error checking competition entry:', error);
    return false;
  }
}

/**
 * Batch creates competition entries for multiple matches
 */
export async function batchCreateCompetitionEntries(results: { matchId: string; result: MatchResult }[]): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const { matchId, result } of results) {
    const outcome = await createCompetitionEntriesFromMatch(matchId, result);
    if (!outcome.success) {
      errors.push(`Match ${matchId}: ${outcome.error}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
