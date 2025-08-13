import React from 'react';
import { supabase } from './supabase';
import crypto from 'crypto';

export type SummaryType = 'training' | 'competitions';

// Define types for the data we'll be processing
interface TrainingData {
  id?: string;
  date?: string;
  class_time?: string;
  location?: string;
  format_uniform?: string;
  category?: string;
  class_summary?: string;
  notes?: string;
  sparring?: boolean;
  rounds?: number;
  minutes_per_round?: number;
  created_at?: string;
  [key: string]: unknown;
}

interface CompetitionData {
  id?: string;
  competition_date?: string;
  category?: string;
  format_uniform?: string;
  status?: string;
  result?: string | null;
  placement?: number | null;
  [key: string]: unknown;
}

type DataItem = TrainingData | CompetitionData;

/**
 * Generate a hash of the data to detect significant changes
 */
function generateDataHash(data: DataItem[]): string {
  // Create a simplified representation of the data for hashing
  const dataForHash = data.map((item, index) => ({
    id: item.id || `item_${index}`, // Use index as fallback for id
    // Include key fields that would affect the summary
    date: (item as TrainingData).date || (item as CompetitionData).competition_date,
    category: item.category,
    format_uniform: item.format_uniform,
    status: (item as CompetitionData).status,
    result: (item as CompetitionData).result,
    placement: (item as CompetitionData).placement,
  }));

  const dataString = JSON.stringify(dataForHash);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Check if we have a valid cached summary that doesn't need refresh
 */
export async function getCachedSummary(userId: string, summaryType: SummaryType, currentData: DataItem[]): Promise<string | null> {
  try {
    const { data: summary, error } = await supabase.from('ai_summaries').select('*').eq('user_id', userId).eq('summary_type', summaryType).single();

    if (error || !summary) {
      return null;
    }

    // Check if summary has expired
    const now = new Date();
    const expiresAt = new Date(summary.expires_at);
    if (now > expiresAt) {
      return null;
    }

    // Check if data has changed significantly
    const currentHash = generateDataHash(currentData);
    const dataCountDiff = Math.abs(currentData.length - summary.data_count);
    const dataCountThreshold = Math.max(3, summary.data_count * 0.1); // 10% change or 3 items

    // If data hash is different AND data count changed significantly, refresh summary
    if (currentHash !== summary.data_hash && dataCountDiff > dataCountThreshold) {
      return null;
    }

    return summary.summary_text;
  } catch (error) {
    console.error('Error fetching cached summary:', error);
    return null;
  }
}

/**
 * Store a new AI summary in the cache
 */
export async function storeSummary(userId: string, summaryType: SummaryType, summaryText: string, data: DataItem[]): Promise<void> {
  try {
    const dataHash = generateDataHash(data);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    const { error } = await supabase.from('ai_summaries').upsert(
      {
        user_id: userId,
        summary_type: summaryType,
        summary_text: summaryText,
        data_count: data.length,
        data_hash: dataHash,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'user_id,summary_type',
      }
    );

    if (error) {
      console.error('Error storing summary:', error);
    }
  } catch (error) {
    console.error('Error storing summary:', error);
  }
}

/**
 * Fetch AI summary with caching logic
 */
export async function getAISummary(
  userId: string,
  summaryType: SummaryType,
  data: DataItem[]
): Promise<{
  summary: string | null;
  loading: boolean;
  error: string | null;
}> {
  // Check for cached summary first
  const cachedSummary = await getCachedSummary(userId, summaryType, data);
  if (cachedSummary) {
    return {
      summary: cachedSummary,
      loading: false,
      error: null,
    };
  }

  // If no valid cache, fetch from API
  try {
    const response = await fetch('/api/xai-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: data.slice(0, 20) }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch summary');
    }

    const result = await response.json();

    // Store the new summary in cache
    await storeSummary(userId, summaryType, result.summary, data);

    return {
      summary: result.summary,
      loading: false,
      error: null,
    };
  } catch (error) {
    return {
      summary: null,
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    };
  }
}

/**
 * Hook-like function for React components
 */
export function useAISummaryCache(userId: string | undefined, summaryType: SummaryType, data: DataItem[], userPlusSubscription: boolean) {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId || !userPlusSubscription || data.length === 0) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getAISummary(userId, summaryType, data)
      .then((result) => {
        setSummary(result.summary);
        setError(result.error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, summaryType, data.length, userPlusSubscription]);

  return { summary, loading, error };
}
