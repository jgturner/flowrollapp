'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Upload, Search, Edit, Eye, Trash2, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { UploadVideoModal } from '@/components/upload-video-modal';

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
  position: string | null;
  description: string | null;
  mux_playback_id: string | null;
  thumbnail_time: number | null;
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'uploading' | 'error' | null;
  created_date: string;
  updated_date: string;
}

export default function ManageVideosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [activeTab, setActiveTab] = useState<'drafts' | 'published'>('drafts');
  const [, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Check if we should redirect to edit mode
  const editId = searchParams.get('edit');
  const step = searchParams.get('step');

  useEffect(() => {
    if (editId && step) {
      // Redirect to edit mode
      router.push(`/videos/edit/${editId}?step=${step}`);
      return;
    }

    if (user) {
      fetchTechniques();
    } else {
      // If no user yet, set loading to false to show the ProtectedRoute handling
      setLoading(false);
    }
  }, [user, editId, step]);

  // Polling effect to auto-refresh drafts with processing videos
  useEffect(() => {
    if (activeTab !== 'drafts' || !user) return;

    const hasProcessingVideos = techniques.some((technique) => technique.status === 'uploading' || (technique.status === 'draft' && !technique.mux_playback_id));

    if (!hasProcessingVideos) {
      setIsPolling(false);
      return;
    }

    console.log('🔄 Found processing videos, setting up polling...');
    setIsPolling(true);

    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for video processing updates...');
      fetchTechniques(true); // Silent refresh to prevent blinking
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('🔄 Cleaning up polling interval');
      setIsPolling(false);
      clearInterval(pollInterval);
    };
  }, [activeTab, user, techniques]);

  const fetchTechniques = async (silentRefresh = false) => {
    if (!user) {
      console.log('🔍 No user found, skipping fetch');
      setLoading(false);
      return;
    }

    console.log('🔍 Fetching techniques for user:', user.id, silentRefresh ? '(silent)' : '');
    if (!silentRefresh) {
      setLoading(true);
    }
    setError(null);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('🔍 Techniques fetch timed out after 20 seconds');
      setError('Connection timeout. Please check your internet connection and try again.');
      setLoading(false);
      setTechniques([]);
    }, 20000);

    try {
      const { data, error } = await supabase.from('techniques').select('*').eq('user_id', user.id).order('updated_date', { ascending: false }); // Order by most recently updated

      clearTimeout(timeoutId); // Clear timeout on successful response
      console.log('🔍 Techniques query result:', { data, error });

      if (error) {
        console.error('🔍 Supabase error:', error);
        throw error;
      }

      console.log('🔍 Setting techniques:', data?.length || 0, 'videos');
      setTechniques(data || []);
    } catch (error) {
      console.error('🔍 Error fetching techniques:', error);
      clearTimeout(timeoutId); // Clear timeout on error
      setError(error instanceof Error ? error.message : 'Failed to load videos');
      setTechniques([]); // Set empty array on error
    } finally {
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  };

  const filteredTechniques = techniques.filter((technique) => {
    // Map activeTab to actual database status values
    const matchesTab =
      activeTab === 'drafts' ? technique.status === 'draft' || technique.status === 'uploading' || technique.status === 'error' : technique.status === 'published';
    const matchesSearch =
      !searchTerm ||
      technique.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (technique.position && technique.position.toLowerCase().includes(searchTerm.toLowerCase()));
    // Position filter
    const matchesPosition = !selectedPosition || technique.position === selectedPosition;
    return matchesTab && matchesSearch && matchesPosition;
  });

  // Debug logging
  console.log('🎬 Debug - activeTab:', activeTab);
  console.log('🎬 Debug - techniques total:', techniques.length);
  console.log('🎬 Debug - techniques by status:', {
    draft: techniques.filter((t) => t.status === 'draft').length,
    published: techniques.filter((t) => t.status === 'published').length,
    null: techniques.filter((t) => t.status === null).length,
    undefined: techniques.filter((t) => t.status === undefined).length,
  });
  console.log('🎬 Debug - filteredTechniques:', filteredTechniques.length);

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const { error } = await supabase.from('techniques').delete().eq('id', id).eq('user_id', user?.id);

      if (error) throw error;
      await fetchTechniques();
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const getThumbnailUrl = (technique: Technique) => {
    // Use the same logic as other pages (videos page, profile page)
    if (technique.thumbnail_url && technique.thumbnail_url.trim() !== '') {
      return technique.thumbnail_url;
    }
    if (technique.mux_playback_id && technique.mux_playback_id.trim() !== '') {
      return `https://image.mux.com/${technique.mux_playback_id}/thumbnail.jpg?width=320${
        technique.thumbnail_time !== undefined && technique.thumbnail_time !== null ? `&time=${technique.thumbnail_time}` : ''
      }`;
    }
    return null;
  };

  const handlePositionChange = (value: string) => {
    setSelectedPosition(value === 'all' ? '' : value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPosition('');
  };

  const breadcrumbs = [
    { label: 'Videos', href: '/videos' },
    { label: 'Manage Videos', isActive: true },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout breadcrumbs={breadcrumbs}>
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading videos...</span>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">Manage Videos</h1>
              </div>
              <p className="text-muted-foreground">Upload and manage your technique videos</p>
            </div>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search videos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedPosition || 'all'} onValueChange={handlePositionChange}>
              <SelectTrigger className="w-48">
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'drafts' | 'published')}>
            <TabsList>
              <TabsTrigger value="drafts">Drafts ({techniques.filter((t) => t.status === 'draft' || t.status === 'uploading').length})</TabsTrigger>
              <TabsTrigger value="published">Published ({techniques.filter((t) => t.status === 'published').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="drafts" className="space-y-4">
              {filteredTechniques.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No drafts found</h3>
                      <p className="text-muted-foreground mb-4">{searchTerm ? 'No drafts match your search.' : 'Start uploading videos to see them here.'}</p>
                      <Button onClick={() => router.push('/videos/edit/new')}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Your First Video
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTechniques.map((technique) => {
                    const thumbnailUrl = getThumbnailUrl(technique);

                    const isReady = technique.mux_playback_id && technique.status === 'draft';
                    const isUploading = technique.status === 'uploading';
                    const isProcessing = technique.status === 'draft' && !technique.mux_playback_id;
                    const hasError = technique.status === 'error';

                    return (
                      <Card key={technique.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted relative">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={technique.title || 'Video thumbnail'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            {isReady ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            ) : isUploading ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 animate-pulse">
                                <Upload className="h-3 w-3 mr-1" />
                                Uploading
                              </Badge>
                            ) : isProcessing ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 animate-pulse">
                                <Clock className="h-3 w-3 mr-1" />
                                Processing
                              </Badge>
                            ) : hasError ? (
                              <Badge variant="secondary" className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Unknown
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-sm mb-1">{technique.title || 'Untitled Video'}</h4>
                          {technique.position && <p className="text-xs text-muted-foreground mb-3">{technique.position}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => router.push(`/videos/edit/${technique.id}`)} disabled={!isReady}>
                              <Edit className="h-3 w-3 mr-1" />
                              {isUploading ? 'Uploading...' : isProcessing ? 'Processing...' : hasError ? 'Error' : isReady ? 'Edit' : 'Unknown'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteDraft(technique.id)}>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="published" className="space-y-4">
              {filteredTechniques.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No published videos found</h3>
                      <p className="text-muted-foreground">{searchTerm ? 'No published videos match your search.' : 'Publish some drafts to see them here.'}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTechniques.map((technique) => {
                    const thumbnailUrl = getThumbnailUrl(technique);

                    return (
                      <Card key={technique.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={technique.title || 'Video thumbnail'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-sm mb-1">{technique.title}</h4>
                          {technique.position && <p className="text-xs text-muted-foreground mb-3">{technique.position}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => router.push(`/technique/${technique.id}`)}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/videos/edit/${technique.id}`)}>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Upload Video Modal */}
        <UploadVideoModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onUploadSuccess={() => {
            // Refresh the data when upload is successful
            fetchTechniques();
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
