import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          belt_level: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
          height: number | null;
          weight: number | null;
          weight_lbs: number | null;
          date_of_birth: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          instagram_url: string | null;
          x_url: string | null;
          facebook_url: string | null;
          tiktok_url: string | null;
          youtube_url: string | null;
          website_url: string | null;
          spotify_id: string | null;
          gym_id: string | null;
          public_show_training_logs: boolean | null;
          public_show_stats: boolean | null;
          public_show_videos: boolean | null;
          belt_verified: boolean | null;
          belt_verified_by: string | null;
          username: string | null;
          gender: string | null;
          competition_status: string | null;
          competition_range: string | null;
          country: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          belt_level?: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
          height?: number | null;
          weight?: number | null;
          weight_lbs?: number | null;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          instagram_url?: string | null;
          x_url?: string | null;
          facebook_url?: string | null;
          tiktok_url?: string | null;
          youtube_url?: string | null;
          website_url?: string | null;
          spotify_id?: string | null;
          gym_id?: string | null;
          public_show_training_logs?: boolean | null;
          public_show_stats?: boolean | null;
          public_show_videos?: boolean | null;
          belt_verified?: boolean | null;
          belt_verified_by?: string | null;
          username?: string | null;
          gender?: string | null;
          competition_status?: string | null;
          competition_range?: string | null;
          country?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          belt_level?: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
          height?: number | null;
          weight?: number | null;
          weight_lbs?: number | null;
          date_of_birth?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          instagram_url?: string | null;
          x_url?: string | null;
          facebook_url?: string | null;
          tiktok_url?: string | null;
          youtube_url?: string | null;
          website_url?: string | null;
          spotify_id?: string | null;
          gym_id?: string | null;
          public_show_training_logs?: boolean | null;
          public_show_stats?: boolean | null;
          public_show_videos?: boolean | null;
          belt_verified?: boolean | null;
          belt_verified_by?: string | null;
          username?: string | null;
          gender?: string | null;
          competition_status?: string | null;
          competition_range?: string | null;
          country?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
