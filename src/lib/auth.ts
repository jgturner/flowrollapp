import { supabase } from './supabase';
import { Database } from './supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  beltLevel: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black';
  gender: 'male' | 'female';
  height: number; // in meters
  weight: number; // in kg
  dateOfBirth: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  // Register a new user
  async register(data: RegistrationData) {
    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed');

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        username: data.username,
        belt_level: data.beltLevel,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        weight_lbs: data.weight ? convertWeightToPounds(data.weight) : null,
        date_of_birth: data.dateOfBirth,
      });

      if (profileError) {
        // Handle unique constraint violation for username
        if (profileError.code === '23505' && profileError.message.includes('username')) {
          throw new Error('Username already taken. Please choose a different username.');
        }
        throw profileError;
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login user
  async login(data: LoginData) {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<Profile>) {
    // If weight is provided but not weight_lbs, calculate it
    if (updates.weight && !updates.weight_lbs) {
      updates.weight_lbs = convertWeightToPounds(updates.weight);
    }
    // If weight_lbs is provided but not weight, calculate it
    if (updates.weight_lbs && !updates.weight) {
      updates.weight = convertWeightToKg(updates.weight_lbs);
    }
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();

    if (error) throw error;
    return data;
  },

  // Upload profile picture
  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      // Get current profile to check for existing avatar
      const currentProfile = await this.getUserProfile(userId);

      // Remove old avatar if it exists
      if (currentProfile?.avatar_url) {
        const { error: removeError } = await supabase.storage.from('avatars').remove([currentProfile.avatar_url]);
        if (removeError) {
          console.warn('Error removing old avatar:', removeError);
        }
      }

      // Create a consistent filename for the user (using folder structure)
      const fileExt = file.name.split('.').pop() || 'jpeg';
      const filePath = `${userId}/profile.${fileExt}`;

      // Upload the new file
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // This allows overwriting if the file already exists
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Store just the file path in the database, not the full URL
      await this.updateProfile(userId, { avatar_url: filePath });

      // Return the public URL for immediate use
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  },

  // Get avatar URL from file path
  getAvatarUrl(path: string | null): string | null {
    if (!path) return null;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Add cache-busting parameter to force browser to reload the image
    const cacheBuster = `?t=${Date.now()}`;
    return data.publicUrl + cacheBuster;
  },

  // Upload banner image
  async uploadBanner(userId: string, file: File): Promise<string> {
    try {
      // Get current profile to check for existing banner
      const currentProfile = await this.getUserProfile(userId);

      // Remove old banner if it exists
      if (currentProfile?.banner_url) {
        const { error: removeError } = await supabase.storage.from('backgrounds').remove([currentProfile.banner_url]);
        if (removeError) {
          console.warn('Error removing old banner:', removeError);
        }
      }

      // Create a consistent filename for the user (using folder structure)
      const fileExt = file.name.split('.').pop() || 'jpeg';
      const filePath = `${userId}/banner.${fileExt}`;

      // Upload the new file
      const { error: uploadError } = await supabase.storage.from('backgrounds').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // This allows overwriting if the file already exists
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Store just the file path in the database, not the full URL
      await this.updateProfile(userId, { banner_url: filePath });

      // Return the public URL for immediate use
      const { data } = supabase.storage.from('backgrounds').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Banner upload failed:', error);
      throw error;
    }
  },

  // Get banner URL from file path
  getBannerUrl(path: string | null): string | null {
    if (!path) return null;

    const { data } = supabase.storage.from('backgrounds').getPublicUrl(path);
    // Add cache-busting parameter to force browser to reload the image
    const cacheBuster = `?t=${Date.now()}`;
    return data.publicUrl + cacheBuster;
  },
};

// Convert height from feet/inches to meters
export function convertHeightToMeters(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 0.0254; // Convert inches to meters
}

// Convert weight from pounds to kilograms
export function convertWeightToKg(pounds: number): number {
  return Math.round(pounds * 0.453592 * 10) / 10; // Convert pounds to kg, rounded to 1 decimal
}

// Convert height from meters to feet/inches
export function convertHeightToFeetInches(meters: number): { feet: number; inches: number } {
  const totalInches = meters / 0.0254;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

// Convert weight from kg to pounds
export function convertWeightToPounds(kg: number): number {
  return Math.round((kg / 0.453592) * 10) / 10; // Convert kg to pounds, rounded to 1 decimal
}
