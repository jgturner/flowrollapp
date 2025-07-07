'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ListVideo, Search, Heart, ListX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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

interface Technique {
  id: string;
  title: string;
  position: string;
  mux_playback_id: string;
  thumbnail_time?: number;
  created_date: string;
}

interface PlaylistItem {
  id: string;
  technique: Technique;
  created_at: string;
}

export default function PlaylistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (user) {
      fetchPlaylist();
    }
  }, [user]);

  const fetchPlaylist = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First get the playlist entries
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('id, created_at, technique_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (playlistError) {
        throw playlistError;
      }

      if (!playlistData || playlistData.length === 0) {
        setPlaylist([]);
        return;
      }

      // Get the technique IDs
      const techniqueIds = playlistData.map((item) => item.technique_id);

      // Fetch the techniques
      const { data: techniquesData, error: techniquesError } = await supabase
        .from('techniques')
        .select('id, title, position, mux_playback_id, thumbnail_time, created_date')
        .in('id', techniqueIds);

      if (techniquesError) {
        throw techniquesError;
      }

      // Combine playlist and technique data
      const transformedData = playlistData
        .map((playlistItem) => {
          const technique = techniquesData?.find((tech) => tech.id === playlistItem.technique_id);
          return {
            id: playlistItem.id,
            created_at: playlistItem.created_at,
            technique: technique || null,
          };
        })
        .filter((item) => item.technique !== null) as PlaylistItem[];

      setPlaylist(transformedData);
    } catch (err) {
      setError('Failed to load playlist');
      console.error('Error fetching playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromPlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);

      if (error) throw error;

      setPlaylist((prev) => prev.filter((item) => item.id !== playlistId));
    } catch (error) {
      console.error('Error removing from playlist:', error);
      alert('Failed to remove from playlist');
    }
  };

  const filteredPlaylist = playlist.filter((item) => {
    if (!item.technique) return false;

    const technique = item.technique;
    const matchesPosition = selectedPosition ? technique.position === selectedPosition : true;
    const matchesSearch = searchTerm
      ? technique.title.toLowerCase().includes(searchTerm.toLowerCase()) || technique.position.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    return matchesPosition && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPlaylist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlaylist = filteredPlaylist.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPosition]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'My Playlist', isActive: true },
  ];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handlePositionChange = (value: string) => {
    setSelectedPosition(value === 'all' ? '' : value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPosition('');
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <ListVideo className="h-6 w-6" />
                My Playlist
              </CardTitle>
              <CardDescription>Techniques you have saved for later</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="w-full aspect-video rounded" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ListVideo className="h-6 w-6" />
              My Playlist
            </CardTitle>
            <CardDescription>Techniques you have saved for later</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">{error}</div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-2">
        {/* Header */}
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <ListVideo className="h-6 w-6" />
              My Playlist ({playlist.length})
            </CardTitle>
            <CardDescription>Techniques you have saved for later viewing</CardDescription>
          </CardHeader>
        </Card>

        {playlist.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your playlist is empty</h3>
                <p className="text-gray-600 mb-6">Start adding techniques to your playlist by clicking the Add to Playlist button on any technique.</p>
                <Button asChild>
                  <Link href="/videos">Browse Techniques</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search and Filter */}
            <Card className="mb-6">
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Search playlist..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
                  </div>
                  <Select value={selectedPosition || 'all'} onValueChange={handlePositionChange}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {POSITION_OPTIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(searchTerm || selectedPosition) && (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Playlist Grid */}
            {filteredPlaylist.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-8">No techniques found matching your search criteria.</div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedPlaylist.map((item) => {
                    const technique = item.technique;
                    const thumbnailUrl = `https://image.mux.com/${technique.mux_playback_id}/thumbnail.jpg?width=320${
                      technique.thumbnail_time !== undefined && technique.thumbnail_time !== null ? `&time=${technique.thumbnail_time}` : ''
                    }`;

                    return (
                      <div key={item.id} className="group relative">
                        <div
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
                            <p className="text-xs text-gray-400">Added {new Date(item.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white border-gray-300"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFromPlaylist(item.id);
                          }}
                        >
                          <ListX className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                              }
                            }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                              }
                            }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
