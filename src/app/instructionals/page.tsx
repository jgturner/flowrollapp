'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Search, BookOpen, DollarSign } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface Instructional {
  id: string;
  title: string;
  description: string;
  price: number;
  cover_image_url: string;
  status: string;
  created_at: string;
  user_id: string;
}

export default function InstructionalsPage() {
  const { user } = useAuth();
  const [instructionals, setInstructionals] = useState<Instructional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchInstructionals();
  }, [user, searchTerm]);

  const fetchInstructionals = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('instructionals').select('*');
      // Only show published instructionals
      query = query.eq('status', 'published');
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) {
        setError('Failed to load instructionals');
        console.error('Error fetching instructionals:', error);
      } else {
        setInstructionals(data || []);
      }
    } catch (err) {
      setError('Failed to load instructionals');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(instructionals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInstructionals = instructionals.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Instructionals', isActive: true },
  ];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const clearFilters = () => {
    setSearchTerm('');
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Instructionals
              </CardTitle>
              <CardDescription>Browse and create instructional content</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
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
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <BookOpen className="h-6 w-6" />
                    Instructionals
                  </CardTitle>
                  <CardDescription>Browse and create instructional content</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-500 py-8">{error}</div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header and Subheader (no Card) */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Instructionals
          </h1>
          <p className="text-muted-foreground">Browse and create instructional content</p>
        </div>

        {/* Search Bar (no Card) */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
            <Input placeholder="Search instructionals..." value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
          </div>
          {searchTerm && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Instructionals Grid */}
        {instructionals.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground py-8">
                {searchTerm ? 'No instructionals found. Try adjusting your search criteria.' : 'No published instructionals available yet.'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
              {paginatedInstructionals.map((instructional) => (
                <Link href={`/instructionals/${instructional.id}`} key={instructional.id} className="block group">
                  <Card className="overflow-hidden">
                    <div className="aspect-video flex items-center justify-center">
                      {instructional.cover_image_url ? (
                        <img
                          src={instructional.cover_image_url}
                          alt={instructional.title || 'Instructional cover'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/320x180/cccccc/666666?text=No+Cover+Image';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <BookOpen className="h-12 w-12 mb-2" />
                          <span className="text-sm">No Cover Image</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm line-clamp-2">{instructional.title}</h3>
                          <div className="flex items-center gap-1 font-semibold">
                            <DollarSign className="h-3 w-3" />
                            <span className="text-xs">{formatPrice(instructional.price)}</span>
                          </div>
                        </div>

                        {instructional.description && <p className="text-xs text-muted-foreground line-clamp-2">{instructional.description}</p>}

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs text-muted-foreground">Instructional</span>
                          <span className="text-xs px-2 py-1 rounded">{instructional.status.charAt(0).toUpperCase() + instructional.status.slice(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
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
