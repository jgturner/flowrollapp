'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ListPlus, Share2, Edit3, Trash2, User } from 'lucide-react';
import { Comments } from '@/components/comments';
import { AdPlaceholder } from '@/components/ad-placeholder';
import MuxPlayer from '@mux/mux-player-react';

const POSITION_OPTIONS = [
  'Standing',
  'Passing',
  'Sparring',
  'Closed Guard',
  'Open Guard',
  'Half Guard',
  'Butterfly Guard',
  'De La Riva Guard',
  'X Guard',
  'Spider Guard',
  'Lasso Guard',
  'Rubber Guard',
  '50/50 Guard',
  'Worm Guard',
  'Z Guard',
  'Knee Shield Guard',
  'Williams Guard',
  'Reverse De La Riva',
  'Full Mount',
  'Side Control',
  'North-South',
  'Back Mount',
  'Turtle',
  'Knee on Belly',
  'Scarf Hold (Kesa Gatame)',
  'Modified Scarf Hold',
  'Crucifix',
  'Truck',
  'Electric Chair',
  'Ashii Garami',
  'Saddle (Inside Sankaku)',
  'Outside Ashii',
  'Single Leg X',
  'Competition/Match',
];

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  belt_level: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
  avatar_url: string | null;
}

interface Technique {
  id: string;
  title: string;
  position: string;
  description: string | null;
  mux_playback_id: string;
  thumbnail_time: number | null;
  user_id: string;
  created_date: string;
  profile?: Profile;
}

export default function TechniquePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [technique, setTechnique] = useState<Technique | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isInPlaylist, setIsInPlaylist] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    position: '',
  });

  useEffect(() => {
    fetchTechnique();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkLikeStatus();
      checkPlaylistStatus();
    }
  }, [user, id]);

  useEffect(() => {
    if (technique) {
      setEditData({
        title: technique.title || '',
        description: technique.description || '',
        position: technique.position || '',
      });
    }
  }, [technique]);

  const fetchTechnique = async () => {
    try {
      setLoading(true);
      console.log('=== DEBUGGING TECHNIQUE FETCH ===');
      console.log('Technique ID from params:', id);
      console.log('User:', user?.id);

      // Check if we can connect to Supabase at all - try simple select first
      const { data: testConnection, error: connectionError } = await supabase.from('techniques').select('id').limit(1);

      console.log('Can access techniques table:', testConnection);
      console.log('Connection error:', connectionError);

      if (connectionError) {
        console.error('Cannot connect to techniques table:', connectionError);
        setError(`Database connection error: ${connectionError.message}. Please check if the 'techniques' table exists and you have permission to access it.`);
        return;
      }

      // List first few techniques to see what's available
      const { data: allTechniques, error: listError } = await supabase.from('techniques').select('id, title').limit(5);

      console.log('Sample techniques in database:', allTechniques);
      console.log('List error:', listError);

      // First, check if technique exists at all
      const { data: basicCheck, error: basicError } = await supabase.from('techniques').select('*').eq('id', id).single();

      console.log('Basic technique check result:', basicCheck);
      console.log('Basic error:', basicError);

      if (basicError) {
        console.error('Basic technique query error:', basicError);
        if (basicError.code === 'PGRST116') {
          setError(`No technique found with ID: ${id}`);
        } else {
          setError(`Database error: ${basicError.message}`);
        }
        return;
      }

      // If basic technique exists, use the basic data and fetch profile separately
      const techniqueData = basicCheck;

      // Fetch profile data separately if user_id exists
      let profileData = null;
      if (techniqueData.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, belt_level, avatar_url')
          .eq('id', techniqueData.user_id)
          .single();

        if (profileError) {
          console.warn('Could not fetch profile:', profileError);
        } else {
          profileData = profile;
        }
      }

      // Combine technique and profile data
      const techniqueWithProfile = {
        ...techniqueData,
        profile: profileData,
      };

      console.log('Full technique data:', techniqueWithProfile);

      setTechnique(techniqueWithProfile);

      // Fetch like count
      const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('technique_id', id);

      setLikeCount(count || 0);
      console.log('=== END DEBUGGING ===');
    } catch (err) {
      setError('Failed to load technique');
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    if (!user) return;

    const { data } = await supabase.from('likes').select('id').eq('technique_id', id).eq('user_id', user.id).single();

    setIsLiked(!!data);
  };

  const checkPlaylistStatus = async () => {
    if (!user) return;

    const { data } = await supabase.from('playlists').select('id').eq('technique_id', id).eq('user_id', user.id).single();

    setIsInPlaylist(!!data);
  };

  const handleLike = async () => {
    if (!user) {
      alert('You must be logged in to like techniques');
      return;
    }

    setIsProcessing(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase.from('likes').delete().eq('user_id', user.id).eq('technique_id', id);

        if (!error) {
          setIsLiked(false);
          setLikeCount((prev) => prev - 1);
        }
      } else {
        // Like
        const { error } = await supabase.from('likes').insert({ user_id: user.id, technique_id: id });

        if (!error) {
          setIsLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlaylist = async () => {
    if (!user) {
      alert('You must be logged in to add to playlist');
      return;
    }

    setIsProcessing(true);

    try {
      if (isInPlaylist) {
        // Remove from playlist
        const { error } = await supabase.from('playlists').delete().eq('user_id', user.id).eq('technique_id', id);

        if (!error) {
          setIsInPlaylist(false);
        }
      } else {
        // Add to playlist
        const { error } = await supabase.from('playlists').insert({ user_id: user.id, technique_id: id });

        if (!error) {
          setIsInPlaylist(true);
        }
      }
    } catch (error) {
      console.error('Error toggling playlist:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: technique?.title,
          text: `Check out this technique: ${technique?.title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('techniques').update(editData).eq('id', id);

      if (error) throw error;

      setTechnique((prev) => (prev ? { ...prev, ...editData } : null));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating technique:', error);
      alert('Failed to update technique');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this technique? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('techniques').delete().eq('id', id);

      if (error) throw error;

      router.push('/videos');
    } catch (error) {
      console.error('Error deleting technique:', error);
      alert('Failed to delete technique');
    }
  };

  const getBeltClass = (beltLevel: string | null) => {
    switch (beltLevel?.toLowerCase()) {
      case 'white':
        return 'bg-white text-black border border-black';
      case 'blue':
        return 'bg-blue-600 text-white';
      case 'purple':
        return 'bg-purple-700 text-white';
      case 'brown':
        return 'bg-yellow-900 text-white';
      case 'black':
        return 'bg-black text-red-600 border border-red-600';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const breadcrumbs = [
    { label: 'Videos', href: '/videos' },
    { label: technique?.title || 'Technique', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Skeleton className="w-full aspect-video" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !technique) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500 py-8">{error || 'Technique not found'}</div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isOwner = user && user.id === technique.user_id;

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Video and Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden p-0 border-0">
              <MuxPlayer
                playbackId={technique.mux_playback_id}
                metadata={{
                  video_id: technique.id,
                  video_title: technique.title,
                }}
                className="w-full h-full"
                style={{ aspectRatio: '16/9' }}
              />
            </Card>

            {isEditing ? (
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={editData.title} onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))} required />
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  <Select value={editData.position} onValueChange={(value) => setEditData((prev) => ({ ...prev, position: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-none rounded-md"
                    value={editData.description}
                    onChange={(e) => setEditData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-between">
                  <div className="flex gap-2">
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                  {isOwner && (
                    <Button type="button" variant="destructive" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Title and Edit Button */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{technique.title}</h1>
                    <p className="text-muted-foreground">{technique.position}</p>
                  </div>
                  {isOwner && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {technique.profile?.avatar_url && authService.getAvatarUrl(technique.profile.avatar_url) ? (
                      <img
                        src={authService.getAvatarUrl(technique.profile.avatar_url)!}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {technique.profile?.first_name} {technique.profile?.last_name}
                    </p>
                    {technique.profile?.belt_level && (
                      <span className={`inline-block px-2 py-1 text-xs rounded ${getBeltClass(technique.profile.belt_level)}`}>{technique.profile.belt_level}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button variant={isLiked ? 'default' : 'outline'} size="sm" onClick={handleLike} disabled={isProcessing}>
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                  </Button>

                  <Button variant={isInPlaylist ? 'default' : 'outline'} size="sm" onClick={handlePlaylist} disabled={isProcessing}>
                    <ListPlus className="h-4 w-4 mr-2" />
                    {isInPlaylist ? 'In Playlist' : 'Add to Playlist'}
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>

                {/* Description */}
                {technique.description && (
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{technique.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <Comments techniqueId={id} />
          </div>

          {/* Right Column - Ad */}
          <div className="space-y-6">
            <AdPlaceholder />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
