'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share, Bookmark, Users, Calendar } from 'lucide-react';
import Image from 'next/image';
import { format as formatDate } from 'date-fns';
import { AdPlaceholder } from '@/components/ad-placeholder';

interface FeedPost {
  id: string;
  title: string;
  description: string | null;
  position: string | null;
  created_date: string;
  mux_playback_id: string | null;
  thumbnail_time: number | null;
  user_id: string;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    belt_level: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

const breadcrumbs = [
  { label: 'Dashboard', href: '/feed' },
  { label: 'Feed', isActive: true },
];

const statsCards = [
  {
    title: 'Active Members',
    value: '2,847',
    change: '+12.5%',
    icon: Users,
    trend: 'up',
  },
  {
    title: 'Training Sessions',
    value: '156',
    change: '+8.2%',
    icon: Calendar,
    trend: 'up',
  },
];

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFeedData();
    }
  }, [user]);

  const fetchFeedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent technique videos (techniques) without join
      const { data: techniques, error: techniquesError } = await supabase.from('techniques').select('*').order('created_date', { ascending: false }).limit(10);

      if (techniquesError) {
        console.error('Error fetching techniques:', techniquesError);
      }

      if (techniques && techniques.length > 0) {
        // Fetch all unique user_ids
        const userIds = [...new Set(techniques.map((t) => t.user_id).filter(Boolean))];
        type ProfileType = FeedPost['profile'];
        let profilesMap: Record<string, ProfileType> = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, first_name, last_name, belt_level, avatar_url').in('id', userIds);
          if (!profilesError && profiles) {
            profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
          }
        }
        const transformedPosts: FeedPost[] = await Promise.all(
          techniques.map(async (technique) => {
            // Get likes count
            const { count: likesCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('technique_id', technique.id);
            // Get comments count
            const { count: commentsCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('technique_id', technique.id);
            // Check if current user liked this
            let isLiked = false;
            if (user) {
              const { data: likeData } = await supabase.from('likes').select('id').eq('technique_id', technique.id).eq('user_id', user.id).single();
              isLiked = !!likeData;
            }
            return {
              id: technique.id,
              title: technique.title,
              description: technique.description,
              position: technique.position,
              created_date: technique.created_date,
              mux_playback_id: technique.mux_playback_id,
              thumbnail_time: technique.thumbnail_time,
              user_id: technique.user_id,
              profile: profilesMap[technique.user_id] || null,
              likes_count: likesCount || 0,
              comments_count: commentsCount || 0,
              is_liked: isLiked,
            };
          })
        );
        setFeedPosts(transformedPosts);
      } else {
        setFeedPosts([]);
      }
    } catch (err) {
      console.error('Error fetching feed data:', err);
      setError('Failed to load feed data');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        // Unlike
        await supabase.from('likes').delete().eq('technique_id', postId).eq('user_id', user.id);
      } else {
        // Like
        await supabase.from('likes').insert({
          technique_id: postId,
          user_id: user.id,
        });
      }

      // Update local state
      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: !isLiked,
                likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1,
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
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

  const getUserDisplayName = (profile: { first_name: string | null; last_name: string | null } | null) => {
    if (!profile) return 'Anonymous User';
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.first_name || profile.last_name || 'Anonymous User';
  };

  const getUserInitials = (profile: { first_name: string | null; last_name: string | null } | null) => {
    if (!profile) return 'A';
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile.first_name) return profile.first_name.charAt(0).toUpperCase();
    if (profile.last_name) return profile.last_name.charAt(0).toUpperCase();
    return 'A';
  };

  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    return authService.getAvatarUrl(avatarUrl);
  };

  const handleProfileClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  const handleTechniqueClick = (techniqueId: string) => {
    router.push(`/technique/${techniqueId}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout breadcrumbs={breadcrumbs}>
          <div className="space-y-6">
            {/* Stats Overview Skeleton */}
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Feed Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout breadcrumbs={breadcrumbs}>
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-red-500 mb-4">{error}</div>
              <Button onClick={fetchFeedData}>Try Again</Button>
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            {statsCards.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{stat.change}</span> from last month
                  </p>
                </CardContent>
              </Card>
            ))}
            {/* Ad Placeholder */}
            <AdPlaceholder />
          </div>

          {/* Main Feed */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Feed Posts */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Videos</CardTitle>
                  <CardDescription>Latest technique videos from the community</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feedPosts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No videos yet. Be the first to share a technique!</div>
                  ) : (
                    feedPosts.map((post) => (
                      <div key={post.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-start space-x-3">
                          <div
                            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() => handleProfileClick(post.user_id)}
                          >
                            {getAvatarUrl(post.profile?.avatar_url || null) ? (
                              <Image
                                src={getAvatarUrl(post.profile?.avatar_url || null)!}
                                alt="Profile"
                                width={40}
                                height={40}
                                className="rounded-full object-cover w-full h-full"
                              />
                            ) : (
                              <span className="text-sm font-medium">{getUserInitials(post.profile)}</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => handleProfileClick(post.user_id)}>
                                {getUserDisplayName(post.profile)}
                              </h4>
                              {post.profile?.belt_level && <Badge className={`${getBeltClass(post.profile.belt_level)} text-xs`}>{post.profile.belt_level}</Badge>}
                              <span className="text-xs text-muted-foreground">{formatDate(new Date(post.created_date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="cursor-pointer" onClick={() => handleTechniqueClick(post.id)}>
                              <h5 className="font-medium hover:text-primary transition-colors">{post.title}</h5>
                              {post.position && <p className="text-sm text-muted-foreground">{post.position}</p>}
                              {post.description && <p className="text-sm text-gray-700 mt-1">{post.description}</p>}
                            </div>
                            <div className="flex items-center space-x-4 pt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 px-2 ${post.is_liked ? 'text-red-500' : ''}`}
                                onClick={() => handleLikeToggle(post.id, post.is_liked)}
                              >
                                <Heart className={`mr-1 h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                                {post.likes_count}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleTechniqueClick(post.id)}>
                                <MessageCircle className="mr-1 h-4 w-4" />
                                {post.comments_count}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Share className="mr-1 h-4 w-4" />
                                Share
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2 ml-auto">
                                <Bookmark className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => router.push('/videos/new')}>
                    Upload New Video
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/training/new')}>
                    Log Training Session
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/competitions/new')}>
                    Add Competition
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
