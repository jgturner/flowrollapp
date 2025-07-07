'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  BarChart3,
  FileText,
  Bell,
  MessageSquare,
  Activity,
  Video,
  List,
  BookOpen,
  MapPin,
  Info,
  Calendar,
  Clock,
  UserCheck,
  Target,
  Play,
  Trophy,
  LogOut,
  User,
  LayoutDashboard,
  X,
  Music,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { authService, Profile } from '@/lib/auth';

// Extended profile type that includes username
interface ProfileWithUsername extends Profile {
  username?: string | null;
}

// Menu items.
const items = [
  {
    title: 'Feed',
    url: '/feed',
    icon: LayoutDashboard,
  },
  {
    title: 'Training',
    url: '/training',
    icon: Activity,
  },
  {
    title: 'Stats',
    url: '/stats',
    icon: BarChart3,
  },
  {
    title: 'Competitions',
    url: '/competitions',
    icon: Trophy,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
  },
];

const gymItems = [
  {
    title: 'Locations',
    url: '/locations',
    icon: MapPin,
  },
  {
    title: 'Info',
    url: '/info',
    icon: Info,
  },
  {
    title: 'Schedule',
    url: '/schedule',
    icon: Calendar,
  },
  {
    title: 'Hours',
    url: '/hours',
    icon: Clock,
  },
  {
    title: 'Members',
    url: '/members',
    icon: UserCheck,
  },
  {
    title: 'Programs',
    url: '/programs',
    icon: Target,
  },
  {
    title: 'Videos',
    url: '/gym-videos',
    icon: Play,
  },
];

const instructionItems = [
  {
    title: 'Videos',
    url: '/videos',
    icon: Video,
  },
  {
    title: 'Playlist',
    url: '/playlist',
    icon: List,
  },
  {
    title: 'Instructionals',
    url: '/instructionals',
    icon: BookOpen,
  },
];

const platformItems = [
  {
    title: 'Users',
    url: '/users',
    icon: Users,
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'Posts',
    url: '/posts',
    icon: FileText,
  },
  {
    title: 'Notifications',
    url: '/notifications',
    icon: Bell,
  },
  {
    title: 'Messages',
    url: '/messages',
    icon: MessageSquare,
  },
];

export function AppSidebar() {
  const { user, profile, signOut, isSpotifyPlaying, toggleSpotifyPlayer, closeSpotifyPlayer } = useAuth();
  const { state } = useSidebar();
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  // Reset image error when profile changes
  useEffect(() => {
    setImageError(false);
  }, [profile?.avatar_url]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfileClick = () => {
    if (user?.id) {
      router.push(`/profile/${user.id}`);
    }
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || 'User';
  };

  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return null;
    return authService.getAvatarUrl(profile.avatar_url);
  };

  const handleClosePlayer = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent profile click
    closeSpotifyPlayer();
  };

  // Cast profile to include username
  const profileWithUsername = profile as ProfileWithUsername;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className={`flex items-center py-2 ${state === 'collapsed' ? 'justify-center px-2' : 'px-4'}`}>
          <div className="h-8 w-8 rounded-lg overflow-hidden">
            <Image src="/imgs/logo.png" alt="Logo" width={32} height={32} className="object-contain" style={{ width: 'auto', height: 'auto' }} />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {state === 'expanded' ? (
            <div className="flex flex-col gap-3 px-2 py-2">
              <div className="relative w-18">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden" onClick={handleProfileClick}>
                  {getAvatarUrl() && !imageError ? (
                    <Image
                      src={getAvatarUrl()!}
                      alt="Profile"
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      onError={() => {
                        setImageError(true);
                        console.error('Failed to load avatar image');
                      }}
                      onLoad={() => {
                        setImageError(false);
                      }}
                    />
                  ) : (
                    <span className="text-lg font-medium">{getUserInitials()}</span>
                  )}
                </div>

                {profile?.spotify_id && (
                  <div
                    className="absolute bottom-0 right-0 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors shadow-lg"
                    onClick={isSpotifyPlaying ? handleClosePlayer : () => toggleSpotifyPlayer()}
                    title={isSpotifyPlaying ? 'Close player' : 'Play anthem'}
                  >
                    {isSpotifyPlaying ? <X className="h-3 w-3 text-white" /> : <Music className="h-3 w-3 text-white" />}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold truncate cursor-pointer hover:text-primary transition-colors" onClick={handleProfileClick}>
                  {getUserDisplayName()}
                </span>
                {profileWithUsername?.username && (
                  <span className="text-xs text-muted-foreground cursor-pointer hover:text-primary/80 transition-colors" onClick={handleProfileClick}>
                    @{profileWithUsername.username}
                  </span>
                )}
                {profile?.belt_level && (
                  <span className="text-xs text-primary font-medium cursor-pointer hover:text-primary/80 transition-colors" onClick={handleProfileClick}>
                    {profile.belt_level} Belt
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center cursor-pointer" onClick={handleProfileClick}>
                <User className="h-4 w-4" />
              </div>
            </div>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Instruction</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {instructionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Gym</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gymItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
