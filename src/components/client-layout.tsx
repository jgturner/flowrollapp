'use client';

import { useAuth } from '@/contexts/auth-context';
import { SpotifyPlayerModal } from '@/components/spotify-player-modal';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { profile, isSpotifyPlaying, closeSpotifyPlayer, profileSpotifyPlaying, closeProfileSpotifyPlayer } = useAuth();

  return (
    <>
      {children}

      {/* Sidebar Spotify Player Modal */}
      {profile?.spotify_id && isSpotifyPlaying && <SpotifyPlayerModal isOpen={isSpotifyPlaying} onClose={closeSpotifyPlayer} spotifyId={profile.spotify_id} />}

      {/* Profile Spotify Player Modal */}
      {profileSpotifyPlaying.isPlaying && profileSpotifyPlaying.spotifyId && (
        <SpotifyPlayerModal isOpen={profileSpotifyPlaying.isPlaying} onClose={closeProfileSpotifyPlayer} spotifyId={profileSpotifyPlaying.spotifyId} />
      )}
    </>
  );
}
