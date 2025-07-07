'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Save, X, Eye, EyeOff, Shield, AlertTriangle, Trash2 } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageUploadCrop } from '@/components/image-upload-crop';

const BELT_LEVELS = [
  { value: 'White', label: 'White' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Purple', label: 'Purple' },
  { value: 'Brown', label: 'Brown' },
  { value: 'Black', label: 'Black' },
];

export default function EditProfilePage() {
  const { user, profile, updateProfile, uploadAvatar, refreshProfile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    belt_level: '',
    height: '',
    weight: '',
    date_of_birth: undefined as Date | undefined,
    instagram_url: '',
    x_url: '',
    facebook_url: '',
    tiktok_url: '',
    youtube_url: '',
    website_url: '',
    spotify_url: '',
    public_show_training_logs: true,
    public_show_stats: true,
    public_show_videos: true,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        username: (profile as any).username || '',
        belt_level: profile.belt_level || '',
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined,
        instagram_url: profile.instagram_url || '',
        x_url: profile.x_url || '',
        facebook_url: profile.facebook_url || '',
        tiktok_url: profile.tiktok_url || '',
        youtube_url: profile.youtube_url || '',
        website_url: profile.website_url || '',
        spotify_url: profile.spotify_id ? `https://open.spotify.com/track/${profile.spotify_id}` : '',
        public_show_training_logs: profile.public_show_training_logs ?? true,
        public_show_stats: profile.public_show_stats ?? true,
        public_show_videos: profile.public_show_videos ?? true,
      });
    }
  }, [profile]);

  // Force refresh profile on mount to ensure we have latest data
  useEffect(() => {
    if (user && !profile) {
      refreshProfile();
    } else if (user && profile) {
      // Always refresh to ensure we have the latest data when navigating back
      refreshProfile();
    }
  }, []);

  // Additional effect to initialize form when we have both user and profile
  useEffect(() => {
    if (user && profile) {
      // Force form initialization even if profile object is the same reference
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        username: (profile as any).username || '',
        belt_level: profile.belt_level || '',
        height: profile.height?.toString() || '',
        weight: profile.weight?.toString() || '',
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined,
        instagram_url: profile.instagram_url || '',
        x_url: profile.x_url || '',
        facebook_url: profile.facebook_url || '',
        tiktok_url: profile.tiktok_url || '',
        youtube_url: profile.youtube_url || '',
        website_url: profile.website_url || '',
        spotify_url: profile.spotify_id ? `https://open.spotify.com/track/${profile.spotify_id}` : '',
        public_show_training_logs: profile.public_show_training_logs ?? true,
        public_show_stats: profile.public_show_stats ?? true,
        public_show_videos: profile.public_show_videos ?? true,
      });
    }
  }, [user, profile]);

  const handleInputChange = (field: string, value: string | boolean | Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const extractSpotifyId = (url: string): string | null => {
    if (!url) return null;

    // Extract ID from Spotify URL
    const match = url.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let imageUploaded = false;

      // Upload new image if one was selected
      if (selectedImageFile) {
        await handleImageUpload(selectedImageFile);
        imageUploaded = true;
      }

      // Validate username format if provided
      if (formData.username) {
        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(formData.username)) {
          setError('Username can only contain lowercase letters, numbers, and underscores');
          return;
        }
      }

      const updates = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        username: formData.username || null,
        belt_level: formData.belt_level ? (formData.belt_level as 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black') : null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        date_of_birth: formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null,
        instagram_url: formData.instagram_url || null,
        x_url: formData.x_url || null,
        facebook_url: formData.facebook_url || null,
        tiktok_url: formData.tiktok_url || null,
        youtube_url: formData.youtube_url || null,
        website_url: formData.website_url || null,
        spotify_id: extractSpotifyId(formData.spotify_url),
        public_show_training_logs: formData.public_show_training_logs,
        public_show_stats: formData.public_show_stats,
        public_show_videos: formData.public_show_videos,
      };

      await updateProfile(updates);

      // Force refresh profile data to ensure latest avatar URL is loaded
      await refreshProfile();

      setSuccess(imageUploaded ? 'Profile and image updated successfully!' : 'Profile updated successfully!');

      // Clear the selected image state
      setSelectedImageFile(null);
      setSelectedImagePreview(null);

      // Redirect to profile after successful update
      setTimeout(() => {
        router.push(`/profile/${user.id}`);
      }, 2000);
    } catch (err: unknown) {
      console.error('Error updating profile:', err);

      // Handle unique constraint violation for username
      if (err instanceof Error && err.message.includes('username')) {
        setError('Username already taken. Please choose a different username.');
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    // Validate file
    if (!file) {
      throw new Error('No file selected');
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      throw new Error('File size too large. Please select an image under 5MB.');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Please select a valid image file.');
    }

    const publicUrl = await uploadAvatar(file);
    return publicUrl;
  };

  const handleDeleteProfile = async () => {
    if (!user || !deletePassword) return;

    setDeleteLoading(true);
    try {
      // First verify the password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword,
      });

      if (signInError) {
        setError('Invalid password. Please try again.');
        setDeleteLoading(false);
        return;
      }

      // If password is correct, proceed with deletion
      const { error: deleteError } = await supabase.rpc('delete_own_account');

      if (deleteError) {
        console.error('Error deleting profile:', deleteError);
        setError(`Failed to delete profile: ${deleteError.message}`);
        setDeleteLoading(false);
        return;
      }

      // Delete avatar from storage
      if (profile?.avatar_url) {
        const { error: storageError } = await supabase.storage.from('avatars').remove([profile.avatar_url]);

        if (storageError) {
          console.warn('Error deleting avatar:', storageError);
        }
      }

      // Sign out the user
      await supabase.auth.signOut();

      // Redirect to login page
      router.push('/login?message=Account deleted successfully');
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError('Failed to delete profile. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getBeltClass = (belt: string) => {
    switch (belt) {
      case 'White':
        return 'bg-gray-100 text-gray-800';
      case 'Blue':
        return 'bg-blue-100 text-blue-800';
      case 'Purple':
        return 'bg-purple-100 text-purple-800';
      case 'Brown':
        return 'bg-amber-100 text-amber-800';
      case 'Black':
        return 'bg-gray-900 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Profile', href: `/profile/${user?.id}` },
    { label: 'Edit', isActive: true },
  ];

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">Update your profile information and privacy settings</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture & Spotify */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a profile picture to help others recognize you</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploadCrop
                  onImageSelect={async (croppedImageUrl) => {
                    if (croppedImageUrl) {
                      try {
                        // Convert data URL to File
                        const response = await fetch(croppedImageUrl);
                        if (!response.ok) {
                          throw new Error('Failed to convert image data');
                        }

                        const blob = await response.blob();
                        if (blob.size === 0) {
                          throw new Error('Image data is empty');
                        }

                        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

                        // Store the file and preview instead of immediately uploading
                        setSelectedImageFile(file);
                        setSelectedImagePreview(croppedImageUrl);
                        setError(null);
                      } catch (error) {
                        console.error('Error converting image:', error);
                        setError('Failed to process image. Please try again.');
                      }
                    } else {
                      // Clear selection if no image
                      setSelectedImageFile(null);
                      setSelectedImagePreview(null);
                    }
                  }}
                  currentImageUrl={selectedImagePreview || (profile?.avatar_url ? authService.getAvatarUrl(profile.avatar_url) || undefined : undefined)}
                  className="max-w-md"
                />
                {selectedImageFile && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">New image selected. Click &quot;Save Changes&quot; to update your profile picture.</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Anthem</CardTitle>
                <CardDescription>Add your favorite song to display on your profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="spotify_url_main">Spotify Song URL</Label>
                  <Input
                    id="spotify_url_main"
                    value={formData.spotify_url}
                    onChange={(e) => handleInputChange('spotify_url', e.target.value)}
                    placeholder="https://open.spotify.com/track/5KvAQPrRxcyTOpd2C32f33"
                  />
                  <p className="text-sm text-muted-foreground">Paste the URL of your favorite song from Spotify</p>
                </div>
                {formData.spotify_url && extractSpotifyId(formData.spotify_url) && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <iframe
                      style={{ borderRadius: '12px' }}
                      src={`https://open.spotify.com/embed/track/${extractSpotifyId(formData.spotify_url)}?utm_source=generator`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allowFullScreen={true}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal details and BJJ information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => handleInputChange('last_name', e.target.value)} placeholder="Enter your last name" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                  placeholder="Enter your username (e.g., johndoe123)"
                />
                <p className="text-xs text-muted-foreground">Username can only contain lowercase letters, numbers, and underscores. Leave empty to remove username.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="belt_level">Belt Level</Label>
                <Select value={formData.belt_level || ''} onValueChange={(value) => handleInputChange('belt_level', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your belt level" />
                  </SelectTrigger>
                  <SelectContent>
                    {BELT_LEVELS.map((belt) => (
                      <SelectItem key={belt.value} value={belt.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={getBeltClass(belt.value)}>{belt.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (meters)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    placeholder="e.g., 1.75"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder="e.g., 70.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.date_of_birth && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date_of_birth ? formatDate(formData.date_of_birth, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date_of_birth}
                      onSelect={(date) => handleInputChange('date_of_birth', date)}
                      captionLayout="dropdown"
                      fromYear={1950}
                      toYear={2010}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Connect your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram URL</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                  placeholder="https://instagram.com/yourusername"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="x_url">X (Twitter) URL</Label>
                <Input id="x_url" value={formData.x_url} onChange={(e) => handleInputChange('x_url', e.target.value)} placeholder="https://x.com/yourusername" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook URL</Label>
                <Input
                  id="facebook_url"
                  value={formData.facebook_url}
                  onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                  placeholder="https://facebook.com/yourusername"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube URL</Label>
                <Input
                  id="youtube_url"
                  value={formData.youtube_url}
                  onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                  placeholder="https://youtube.com/c/yourchannel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control what information is visible to other users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Training Logs</Label>
                  <p className="text-sm text-muted-foreground">Allow other users to view your training session logs</p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.public_show_training_logs ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <Switch checked={formData.public_show_training_logs} onCheckedChange={(checked) => handleInputChange('public_show_training_logs', checked)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Stats</Label>
                  <p className="text-sm text-muted-foreground">Allow other users to view your competition and training statistics</p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.public_show_stats ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <Switch checked={formData.public_show_stats} onCheckedChange={(checked) => handleInputChange('public_show_stats', checked)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Videos</Label>
                  <p className="text-sm text-muted-foreground">Allow other users to view your technique videos</p>
                </div>
                <div className="flex items-center gap-2">
                  {formData.public_show_videos ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <Switch checked={formData.public_show_videos} onCheckedChange={(checked) => handleInputChange('public_show_videos', checked)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Danger Zone */}
        <Card className="border-red-600 mt-12 ">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription className="text-red-600">Irreversible actions that will permanently delete your data</CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Profile & All Data
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete_password">Confirm Password</Label>
                  <Input
                    id="delete_password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to confirm deletion"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleDeleteProfile} disabled={!deletePassword || deleteLoading} className="flex-1">
                    {deleteLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Confirm Delete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
