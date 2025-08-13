'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Music, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';
import { useAuth } from '@/contexts/auth-context';

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  belt_level: string | null;
  avatar_url: string | null;
  spotify_id?: string | null;
}

interface UserProfileDisplayProps {
  user: UserProfile;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showMusicPlayer?: boolean;
  showUsername?: boolean;
  showBelt?: boolean;
  linkToProfile?: boolean;
  className?: string;
}

export function UserProfileDisplay({
  user,
  size = 'md',
  showMusicPlayer = true,
  showUsername = true,
  showBelt = true,
  linkToProfile = true,
  className = '',
}: UserProfileDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const { toggleProfileSpotifyPlayer } = useAuth();

  const sizeClasses = {
    xs: {
      avatar: 'h-8 w-8', // 32px - smallest size
      text: 'text-xs',
      subText: 'text-xs',
      musicIcon: 'h-2 w-2',
    },
    sm: {
      avatar: 'h-12 w-12', // 48px
      text: 'text-sm',
      subText: 'text-xs',
      musicIcon: 'h-3 w-3',
    },
    md: {
      avatar: 'h-16 w-16', // 64px
      text: 'text-sm',
      subText: 'text-xs',
      musicIcon: 'h-3 w-3',
    },
    lg: {
      avatar: 'h-20 w-20', // 80px
      text: 'text-base',
      subText: 'text-sm',
      musicIcon: 'h-4 w-4',
    },
  };

  const classes = sizeClasses[size];

  const getUserInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    return 'Unknown User';
  };

  const getAvatarUrl = () => {
    if (!user.avatar_url) return null;
    return authService.getAvatarUrl(user.avatar_url);
  };

  const getBeltColor = (belt: string | null) => {
    if (!belt) return 'bg-gray-100 text-gray-800';

    switch (belt.toLowerCase()) {
      case 'white':
        return 'bg-gray-100 text-gray-800';
      case 'blue':
        return 'bg-blue-100 text-blue-800';
      case 'purple':
        return 'bg-purple-100 text-purple-800';
      case 'brown':
        return 'bg-yellow-100 text-yellow-800';
      case 'black':
        return 'bg-gray-900 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const ProfileContent = () => (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Avatar with Music Icon */}
      <div className="relative">
        <div className={`${classes.avatar} rounded-full bg-muted flex items-center justify-center overflow-hidden`}>
          {getAvatarUrl() && !imageError ? (
            <Image
              src={getAvatarUrl()!}
              alt={getUserDisplayName()}
              width={size === 'xs' ? 32 : size === 'sm' ? 48 : size === 'md' ? 64 : 80}
              height={size === 'xs' ? 32 : size === 'sm' ? 48 : size === 'md' ? 64 : 80}
              className="object-cover w-full h-full"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          ) : (
            <span className={`font-medium ${size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-sm'}`}>{getUserInitials()}</span>
          )}
        </div>

        {/* Music Player Icon */}
        {showMusicPlayer && user.spotify_id && typeof user.spotify_id === 'string' && user.spotify_id.trim() !== '' && (
          <button
            type="button"
            className="absolute -bottom-1 -right-0 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (user.spotify_id) {
                toggleProfileSpotifyPlayer(user.spotify_id);
              }
            }}
            tabIndex={0}
            aria-label="Open music player"
          >
            <Music className={`${classes.musicIcon} text-white`} />
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${classes.text}`}>{getUserDisplayName()}</div>

        {showUsername && user.username && user.username.trim() !== '' && (
          <span className={`block text-muted-foreground truncate ${classes.subText}`}>@{user.username}</span>
        )}
        {showBelt && user.belt_level && (
          <span className={`${getBeltColor(user.belt_level)} text-xs font-semibold inline-flex w-auto px-2 py-0.5 rounded`}>{user.belt_level} Belt</span>
        )}
      </div>
    </div>
  );

  if (linkToProfile) {
    return (
      <Link href={`/profile/${user.id}`} className="block rounded-lg p-2 -m-2">
        <ProfileContent />
      </Link>
    );
  }

  return <ProfileContent />;
}

// Compact version for smaller spaces
export function UserProfileCompact({
  user,
  showBelt = true,
  linkToProfile = true,
  className = '',
}: {
  user: UserProfile;
  showBelt?: boolean;
  linkToProfile?: boolean;
  className?: string;
}) {
  return (
    <UserProfileDisplay user={user} size="sm" showMusicPlayer={false} showUsername={false} showBelt={showBelt} linkToProfile={linkToProfile} className={className} />
  );
}

// Version for competitor displays in matches
export function CompetitorProfile({
  user,
  position,
  confirmed = false,
  className = '',
}: {
  user: UserProfile;
  position?: number;
  confirmed?: boolean;
  className?: string;
}) {
  return (
    <div className={`border rounded-lg p-3 ${className}`}>
      {position && <div className="text-sm font-medium mb-2">Competitor {position}</div>}

      <UserProfileDisplay user={user} size="md" showMusicPlayer={true} showUsername={true} showBelt={true} linkToProfile={true} />

      {!confirmed && (
        <Badge variant="secondary" className="text-xs mt-2">
          Pending Confirmation
        </Badge>
      )}
    </div>
  );
}

// Version for manual competitor entries
export function ManualCompetitorProfile({
  name,
  belt,
  weight,
  photoUrl,
  position,
  confirmed = false,
  className = '',
}: {
  name: string;
  belt: string;
  weight?: number;
  photoUrl?: string;
  position?: number;
  confirmed?: boolean;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`border rounded-lg p-3 ${className}`}>
      {position && <div className="text-sm font-medium mb-2">Competitor {position}</div>}

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {photoUrl && !imageError ? (
            <Image
              src={photoUrl}
              alt={name}
              width={60}
              height={60}
              className="object-cover w-full h-full"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          ) : (
            <span className="text-sm font-medium">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-sm">{name}</div>
          <div className="text-xs text-muted-foreground">
            {belt} Belt
            {weight && ` • ${weight} lbs`}
          </div>
          <Badge variant="outline" className="text-xs mt-1">
            Manual Entry
          </Badge>
        </div>
      </div>

      {!confirmed && (
        <Badge variant="secondary" className="text-xs mt-2">
          Pending Confirmation
        </Badge>
      )}
    </div>
  );
}

// Empty competitor slot
export function EmptyCompetitorSlot({
  position,
  onRequestMatch,
  canRequest = false,
  className = '',
}: {
  position: number;
  onRequestMatch?: () => void;
  canRequest?: boolean;
  className?: string;
}) {
  return (
    <div className={`border rounded-lg p-3 ${className}`}>
      <div className="text-sm font-medium mb-2">Competitor {position}</div>

      <div className="text-center py-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-2">Open Slot</p>

        {canRequest && onRequestMatch && (
          <Button size="sm" variant="outline" onClick={onRequestMatch}>
            Request Match
          </Button>
        )}
      </div>
    </div>
  );
}
