'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Search, Video } from 'lucide-react';
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
  thumbnail_url?: string;
  status?: string;
  created_date: string;
}

export default function VideosPage() {
  const { user } = useAuth();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    async function fetchTechniques() {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        let query;

        // Use search function if search term is provided
        if (searchTerm) {
          const { data, error } = await supabase.rpc('search_techniques', {
            search_term: searchTerm,
          });

          if (error) {
            console.error('Search error:', error);
            // Fallback to regular query if search function doesn't exist
            query = supabase.from('techniques').select('*').eq('status', 'published');
          } else {
            setTechniques(data || []);
            setLoading(false);
            return;
          }
        } else {
          query = supabase.from('techniques').select('*').eq('status', 'published');
        }

        // Apply position filter if selected
        if (selectedPosition) {
          query = query.eq('position', selectedPosition);
        }

        // Order by creation date
        query = query.order('created_date', { ascending: false });

        const { data, error } = await query;

        if (error) {
          setError('Failed to load techniques');
          console.error('Error fetching techniques:', error);
        } else {
          setTechniques(data || []);
        }
      } catch (err) {
        setError('Failed to load techniques');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTechniques();
  }, [user, searchTerm, selectedPosition]);

  // Pagination logic
  const totalPages = Math.ceil(techniques.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTechniques = techniques.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPosition]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Videos', isActive: true },
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
                <Video className="h-6 w-6" />
                Technique Videos
              </CardTitle>
              <CardDescription>Browse and search technique videos</CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6" />
              Technique Videos
            </CardTitle>
            <CardDescription>Browse and search technique videos</CardDescription>
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
              <Video className="h-6 w-6" />
              Technique Videos
            </CardTitle>
            <CardDescription>Browse and search technique videos</CardDescription>
          </CardHeader>
        </Card>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search techniques..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
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

        {/* Videos Grid */}
        {techniques.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground py-8">No techniques found. Try adjusting your search criteria.</div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedTechniques.map((technique) => {
                // Use custom thumbnail if available, otherwise use Mux thumbnail with timestamp
                const thumbnailUrl =
                  technique.thumbnail_url ||
                  `https://image.mux.com/${technique.mux_playback_id}/thumbnail.jpg?width=320${
                    technique.thumbnail_time !== undefined && technique.thumbnail_time !== null ? `&time=${technique.thumbnail_time}` : ''
                  }`;

                return (
                  <Link href={`/technique/${technique.id}`} key={technique.id} className="block">
                    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
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
                  </Link>
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
      </div>
    </DashboardLayout>
  );
}
