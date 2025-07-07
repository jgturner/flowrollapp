'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, User, Users as UsersIcon, UserPlus, UserMinus, ArrowLeft, Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// Custom debounce function
function debounce(func: (term: string) => void, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  return (term: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(term), wait);
  };
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  belt_level: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
  avatar_url: string | null;
  created_at: string;
  follower_count?: number;
  is_following?: boolean;
  spotify_id?: string | null;
}

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

export default function FollowersPage() {
  const { user, profileSpotifyPlaying, toggleProfileSpotifyPlayer, closeProfileSpotifyPlayer } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [searchTerm, setSearchTerm] = useState('');
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());

  // Fetch profile data for the user whose followers we're viewing
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, username').eq('id', userId).single();

        if (error) {
          setError('Profile not found');
        } else {
          setProfileData(data);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const searchFollowers = useCallback(
    debounce(async (term: string) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        // First get the follower relationships
        const { data: followerData, error: followerError } = await supabase.from('followers').select('follower_id').eq('following_id', userId);

        if (followerError) {
          setError('Failed to fetch followers');
          console.error('Error fetching followers:', followerError);
          return;
        }

        if (!followerData || followerData.length === 0) {
          setFollowers([]);
          setLoading(false);
          return;
        }

        const followerIds = followerData.map((f) => f.follower_id);

        // Then get the profile data for those followers
        let query = supabase
          .from('profiles')
          .select(
            `
            id,
            first_name,
            last_name,
            username,
            belt_level,
            avatar_url,
            created_at,
            spotify_id
          `
          )
          .in('id', followerIds);

        // Apply search filtering if there's a search term
        if (term.trim()) {
          const cleanTerm = term.replace('@', '').toLowerCase();

          if (term.startsWith('@')) {
            // Username search
            query = query.ilike('username', `%${cleanTerm}%`);
          } else {
            // Name search
            query = query.or(`first_name.ilike.%${cleanTerm}%,last_name.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%`);
          }
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

        if (error) {
          setError('Failed to search followers');
          console.error('Error searching followers:', error);
        } else {
          // Get follower counts and follow status for each user
          const usersWithFollowerCounts = await Promise.all(
            data.map(async (userProfile) => {
              const { count } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userProfile.id);

              // Check if current user is following this user
              let isFollowing = false;
              if (user && user.id !== userProfile.id) {
                const { data: followData } = await supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', userProfile.id).single();
                isFollowing = !!followData;
              }

              return {
                ...userProfile,
                follower_count: count || 0,
                is_following: isFollowing,
              };
            })
          );

          setFollowers(usersWithFollowerCounts);

          // Update following state
          const currentlyFollowing = new Set(usersWithFollowerCounts.filter((u) => u.is_following).map((u) => u.id));
          setFollowingUsers(currentlyFollowing);
        }
      } catch (err) {
        setError('Failed to search followers');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }, 300),
    [userId, user]
  );

  useEffect(() => {
    if (userId) {
      searchFollowers(searchTerm);
    }
  }, [searchTerm, searchFollowers, userId]);

  const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!user || followLoading.has(targetUserId)) return;

    setFollowLoading((prev) => new Set(prev).add(targetUserId));

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', targetUserId);

        if (error) throw error;

        setFollowingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });

        // Update the user's follower count
        setFollowers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, follower_count: (u.follower_count || 0) - 1, is_following: false } : u)));
      } else {
        // Follow
        const { error } = await supabase.from('followers').insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

        if (error) throw error;

        setFollowingUsers((prev) => new Set(prev).add(targetUserId));

        // Update the user's follower count
        setFollowers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, follower_count: (u.follower_count || 0) + 1, is_following: true } : u)));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    } finally {
      setFollowLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const getDisplayName = (profile: ProfileData | UserProfile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.first_name || profile.last_name || profile.username || 'User';
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Profile', href: `/profile/${userId}` },
    { label: 'Followers', isActive: true },
  ];

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const getBeltClass = (belt: string | null) => {
    if (!belt) return 'bg-gray-100 text-gray-800';

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

  const getInitials = (userProfile: UserProfile) => {
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase();
    }
    if (userProfile.first_name) return userProfile.first_name.charAt(0).toUpperCase();
    if (userProfile.last_name) return userProfile.last_name.charAt(0).toUpperCase();
    if (userProfile.username) return userProfile.username.charAt(0).toUpperCase();
    return 'U';
  };

  const getAvatarUrl = (userProfile: UserProfile) => {
    if (!userProfile.avatar_url) return null;

    if (userProfile.avatar_url.startsWith('http')) {
      return userProfile.avatar_url;
    }

    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${userProfile.avatar_url}`;
  };

  if (profileLoading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <Skeleton className="h-8 w-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !profileData) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="text-center py-12">
            <User className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <Card className="border-none">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/profile/${userId}`)} className="p-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                  <UsersIcon className="h-8 w-8" />
                  {profileData ? `${getDisplayName(profileData)}'s Followers` : 'Followers'}
                </CardTitle>
              </div>
              <CardDescription>{followers.length === 0 && !loading && !searchTerm ? 'No followers yet' : 'Search through followers'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search followers by name or @username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && followers.length === 0 && <div className="text-center text-red-500 py-8">{error}</div>}

            {/* No Results */}
            {!loading && !error && searchTerm && followers.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No followers found matching &quot;{searchTerm}&quot;</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && !searchTerm && followers.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>{profileData ? `${getDisplayName(profileData)} doesn't have any followers yet` : 'No followers yet'}</p>
              </div>
            )}

            {/* Followers Results */}
            {!loading && followers.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  {searchTerm ? `${followers.length} followers matching "${searchTerm}"` : `${followers.length} followers`}
                </div>
                {followers.map((userProfile) => (
                  <div key={userProfile.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer"
                        onClick={() => handleUserClick(userProfile.id)}
                      >
                        {getAvatarUrl(userProfile) ? (
                          <Image src={getAvatarUrl(userProfile)!} alt={getDisplayName(userProfile)} fill className="object-cover rounded-full" />
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">{getInitials(userProfile)}</span>
                        )}
                      </div>

                      {userProfile.spotify_id && (
                        <div
                          className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            const spotifyId = userProfile.spotify_id;
                            if (profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === spotifyId) {
                              closeProfileSpotifyPlayer();
                            } else if (spotifyId && typeof spotifyId === 'string') {
                              toggleProfileSpotifyPlayer(spotifyId);
                            }
                          }}
                          title={profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === userProfile.spotify_id ? 'Close player' : 'Play anthem'}
                        >
                          {profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === userProfile.spotify_id ? (
                            <X className="h-2 w-2 text-white" />
                          ) : (
                            <Music className="h-2 w-2 text-white" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(userProfile.id)}>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{getDisplayName(userProfile)}</h3>
                        {userProfile.belt_level && <Badge className={`text-xs ${getBeltClass(userProfile.belt_level)}`}>{userProfile.belt_level}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {userProfile.username && <span>@{userProfile.username}</span>}
                        <span className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          {userProfile.follower_count} followers
                        </span>
                      </div>
                    </div>

                    {/* Join Date */}
                    <div className="text-xs text-muted-foreground cursor-pointer" onClick={() => handleUserClick(userProfile.id)}>
                      Joined {new Date(userProfile.created_at).toLocaleDateString()}
                    </div>

                    {/* Follow Button */}
                    {user && user.id !== userProfile.id && (
                      <Button
                        variant={followingUsers.has(userProfile.id) ? 'outline' : 'default'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(userProfile.id, followingUsers.has(userProfile.id));
                        }}
                        disabled={followLoading.has(userProfile.id)}
                        className="min-w-[80px]"
                      >
                        {followLoading.has(userProfile.id) ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : followingUsers.has(userProfile.id) ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
