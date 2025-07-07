'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  Edit3,
  Calendar,
  Trophy,
  Medal,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Ruler,
  Weight,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus,
  Users,
  Music,
  X,
} from 'lucide-react';
import { BsTwitterX } from 'react-icons/bs';
import Image from 'next/image';
import { format as formatDate } from 'date-fns';

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  belt_level: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
  height: number | null;
  weight: number | null;
  date_of_birth: string | null;
  avatar_url: string | null;
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
  created_at: string;
  updated_at: string;
}

interface Competition {
  id: string;
  event_name: string;
  competition_date: string;
  city: string;
  state: string;
  country: string;
  placement: number | null;
  result: string | null;
  status: string;
  match_type: string;
  podium_photo_url?: string;
}

interface Technique {
  id: string;
  title: string;
  position: string | null;
  description: string | null;
  created_date: string;
  mux_playback_id: string | null;
  thumbnail_time: number | null;
}

export default function ProfilePage() {
  const { user, profileSpotifyPlaying, toggleProfileSpotifyPlayer, closeProfileSpotifyPlayer } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [competitionStats, setCompetitionStats] = useState({
    total: 0,
    wins: 0,
    podiums: 0,
    goldMedals: 0,
    silverMedals: 0,
    bronzeMedals: 0,
  });

  useEffect(() => {
    if (profileId) {
      fetchProfileData();
    }
  }, [profileId, user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if this is the user's own profile
      const ownProfile = user?.id === profileId;
      setIsOwnProfile(ownProfile);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', profileId).single();

      if (profileError) {
        setError('Profile not found');
        return;
      }

      setProfile(profileData);

      // Check if current user is following this profile and get follower count
      if (user && !ownProfile) {
        const { data: followData } = await supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', profileId).single();

        setIsFollowing(!!followData);
      }

      // Get follower count
      const { count: followerCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profileId);

      setFollowerCount(followerCount || 0);

      // Fetch competitions (always visible for now, will add privacy later)
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select('*')
        .eq('user_id', profileId)
        .order('competition_date', { ascending: false })
        .limit(10);

      if (!competitionsError && competitionsData) {
        setCompetitions(competitionsData);

        // Calculate competition stats
        const total = competitionsData.length;
        const wins = competitionsData.filter((c) => c.result === 'win').length;
        const podiums = competitionsData.filter((c) => c.placement && c.placement <= 3).length;
        const goldMedals = competitionsData.filter((c) => c.placement === 1).length;
        const silverMedals = competitionsData.filter((c) => c.placement === 2).length;
        const bronzeMedals = competitionsData.filter((c) => c.placement === 3).length;

        setCompetitionStats({
          total,
          wins,
          podiums,
          goldMedals,
          silverMedals,
          bronzeMedals,
        });
      }

      // Fetch techniques (check privacy settings)
      if (ownProfile || profileData.public_show_videos) {
        const { data: techniquesData, error: techniquesError } = await supabase
          .from('techniques')
          .select('*')
          .eq('user_id', profileId)
          .order('created_date', { ascending: false })
          .limit(10);

        if (!techniquesError && techniquesData) {
          setTechniques(techniquesData);
        }
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || isOwnProfile || followLoading) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', profileId);

        if (!error) {
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Follow
        const { error } = await supabase.from('followers').insert([
          {
            follower_id: user.id,
            following_id: profileId,
          },
        ]);

        if (!error) {
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
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

  const getDisplayName = () => {
    if (!profile) return 'User';
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.first_name || profile.last_name || 'User';
  };

  const getInitials = () => {
    if (!profile) return 'U';
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile.first_name) return profile.first_name.charAt(0).toUpperCase();
    if (profile.last_name) return profile.last_name.charAt(0).toUpperCase();
    return 'U';
  };

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return null;
    return authService.getAvatarUrl(profile.avatar_url);
  };

  const formatHeight = (height: number | null) => {
    if (!height) return null;
    const feet = Math.floor(height * 3.28084);
    const inches = Math.round((height * 3.28084 - feet) * 12);
    return `${feet}'${inches}" (${height.toFixed(1)}m)`;
  };

  const formatWeight = (weight: number | null) => {
    if (!weight) return null;
    const pounds = Math.round(weight * 2.20462);
    return `${pounds} lbs (${weight.toFixed(1)} kg)`;
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Profile', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardHeader>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="text-center py-12">
            <User className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The profile you are looking for does not exist.'}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {getAvatarUrl() ? (
                        <Image src={getAvatarUrl()!} alt="Profile" width={96} height={96} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-2xl font-medium">{getInitials()}</span>
                      )}
                    </div>
                    {profile.spotify_id && !isOwnProfile && (
                      <div
                        className="absolute bottom-0 right-0 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
                        onClick={
                          profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === profile.spotify_id
                            ? () => closeProfileSpotifyPlayer()
                            : () => profile.spotify_id && toggleProfileSpotifyPlayer(profile.spotify_id)
                        }
                        title={profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === profile.spotify_id ? 'Close player' : 'Play anthem'}
                      >
                        {profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId === profile.spotify_id ? (
                          <X className="h-3 w-3 text-white" />
                        ) : (
                          <Music className="h-3 w-3 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-[-5px]">{getDisplayName()}</h1>
                    {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
                    {profile.belt_level && <Badge className={`mt-1 ${getBeltClass(profile.belt_level)}`}>{profile.belt_level} Belt</Badge>}

                    {/* Social Media Links */}
                    <div className="flex items-center gap-4 mt-2">
                      {profile.instagram_url && (
                        <a
                          href={profile.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Instagram"
                        >
                          <Instagram className="h-6 w-6" />
                        </a>
                      )}
                      {profile.x_url && (
                        <a
                          href={profile.x_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="X (Twitter)"
                        >
                          <BsTwitterX className="h-6 w-6" />
                        </a>
                      )}
                      {profile.facebook_url && (
                        <a
                          href={profile.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Facebook"
                        >
                          <Facebook className="h-6 w-6" />
                        </a>
                      )}
                      {profile.youtube_url && (
                        <a
                          href={profile.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="YouTube"
                        >
                          <Youtube className="h-6 w-6" />
                        </a>
                      )}
                      {profile.website_url && (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Website"
                        >
                          <Globe className="h-6 w-6" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => router.push(`/followers/${profileId}`)}
                        title="View followers"
                      >
                        <Users className="h-4 w-4" />
                        <span>{followerCount} followers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDate(new Date(profile.created_at), 'MMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {isOwnProfile ? (
                    <Button onClick={() => router.push('/profile/edit')}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    user && (
                      <Button onClick={handleFollow} disabled={followLoading} variant={isFollowing ? 'outline' : 'default'}>
                        {followLoading ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : isFollowing ? (
                          <UserMinus className="h-4 w-4 mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Spotify Embed */}
          {profile.spotify_id && (
            <Card>
              <CardHeader className="mb-[-20px]">
                <CardTitle className="text-lg">Current Anthem</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  style={{ borderRadius: '12px' }}
                  src={`https://open.spotify.com/embed/track/${profile.spotify_id}?utm_source=generator`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats and Info Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Physical Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Physical Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.height && (
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Height: {formatHeight(profile.height)}</span>
                </div>
              )}
              {profile.weight && (
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Weight: {formatWeight(profile.weight)}</span>
                </div>
              )}
              {profile.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Born: {formatDate(new Date(profile.date_of_birth), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competition Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Competition Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Competitions</span>
                <Badge variant="outline">{competitionStats.total}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Wins</span>
                <Badge variant="outline">{competitionStats.wins}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Podium Finishes</span>
                <Badge variant="outline">{competitionStats.podiums}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Medal className="h-4 w-4 text-yellow-500" />
                <span>{competitionStats.goldMedals} Gold</span>
                <span className="text-muted-foreground">|</span>
                <span>{competitionStats.silverMedals} Silver</span>
                <span className="text-muted-foreground">|</span>
                <span>{competitionStats.bronzeMedals} Bronze</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Competitions */}
        {competitions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Competitions</CardTitle>
              <CardDescription>Latest competition results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competitions.slice(0, 5).map((competition) => (
                  <div
                    key={competition.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                    onClick={() => router.push(`/competitions/${competition.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        {competition.podium_photo_url ? (
                          <Image src={competition.podium_photo_url} alt="Podium" width={48} height={48} className="rounded-full object-cover w-full h-full" />
                        ) : (
                          <Trophy className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium hover:text-primary transition-colors">{competition.event_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(new Date(competition.competition_date), 'MMM dd, yyyy')} •{competition.city}, {competition.state}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {competition.placement && (
                        <Badge variant="secondary" className="mb-1">
                          {competition.placement}
                          {competition.placement === 1 ? 'st' : competition.placement === 2 ? 'nd' : competition.placement === 3 ? 'rd' : 'th'} Place
                        </Badge>
                      )}
                      {competition.result && (
                        <Badge variant={competition.result === 'win' ? 'default' : 'secondary'}>{competition.result === 'win' ? 'Win' : 'Loss'}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {competitions.length > 5 && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => router.push(`/competitions?user=${profileId}`)}>
                    View All Competitions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Videos */}
        {(isOwnProfile || profile.public_show_videos) && techniques.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Recent Videos</CardTitle>
                  <CardDescription>Latest technique videos</CardDescription>
                </div>
                {!isOwnProfile && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>Public</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {techniques.slice(0, 6).map((technique) => {
                  const thumbnailUrl = `https://image.mux.com/${technique.mux_playback_id}/thumbnail.jpg?width=320${
                    technique.thumbnail_time !== undefined && technique.thumbnail_time !== null ? `&time=${technique.thumbnail_time}` : ''
                  }`;

                  return (
                    <div
                      key={technique.id}
                      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/technique/${technique.id}`)}
                    >
                      <div className="aspect-video bg-muted">
                        {technique.mux_playback_id ? (
                          <img
                            src={thumbnailUrl}
                            alt={technique.title || 'Video thumbnail'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://via.placeholder.com/320x180/cccccc/666666?text=No+Thumbnail';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">No Video</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm">{technique.title}</h4>
                        {technique.position && <p className="text-xs text-muted-foreground">{technique.position}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {techniques.length > 6 && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => router.push(`/videos?user=${profileId}`)}>
                    View All Videos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Privacy Notice for Hidden Sections */}
        {!isOwnProfile && (
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <EyeOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Some content may be private</h3>
              <p className="text-sm text-muted-foreground">This user has chosen to keep some sections of their profile private.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
