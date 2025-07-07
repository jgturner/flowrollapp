'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUploadCrop } from '@/components/image-upload-crop';
import { Plus, X, Search, Video } from 'lucide-react';

interface Section {
  id: string;
  name: string;
  videos: Video[];
}

interface Video {
  id: string;
  title: string;
  mux_playback_id: string;
  thumbnail_time?: number;
}

export default function NewInstructionalPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Basic form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [coverImageData, setCoverImageData] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Sections and videos
  const [sections, setSections] = useState<Section[]>([]);
  const [availableVideos, setAvailableVideos] = useState<Video[]>([]);
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [showVideoSelector, setShowVideoSelector] = useState<string | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAvailableVideos();
    }
  }, [user]);

  const fetchAvailableVideos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('techniques')
        .select('id, title, mux_playback_id, thumbnail_time')
        .eq('user_id', user.id)
        .order('created_date', { ascending: false });

      if (error) throw error;
      setAvailableVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const filteredVideos = availableVideos.filter((video) => video.title.toLowerCase().includes(videoSearchTerm.toLowerCase()));

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: '',
      videos: [],
    };
    setSections([...sections, newSection]);
  };

  const updateSectionName = (sectionId: string, name: string) => {
    setSections(sections.map((section) => (section.id === sectionId ? { ...section, name } : section)));
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((section) => section.id !== sectionId));
  };

  const addVideoToSection = (sectionId: string, video: Video) => {
    setSections(sections.map((section) => (section.id === sectionId ? { ...section, videos: [...section.videos, video] } : section)));
    setShowVideoSelector(null);
    setVideoSearchTerm('');
  };

  const removeVideoFromSection = (sectionId: string, videoId: string) => {
    setSections(sections.map((section) => (section.id === sectionId ? { ...section, videos: section.videos.filter((v) => v.id !== videoId) } : section)));
  };

  const uploadCoverImage = async (imageData: string): Promise<string | null> => {
    if (!user || !imageData) return null;

    try {
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();

      const fileName = `${user.id}/${Date.now()}.png`;

      const { data, error } = await supabase.storage.from('instructional-covers').upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false,
      });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('instructional-covers').getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading cover image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Starting instructional creation...');

      // Upload cover image if provided
      let coverImageUrl = null;
      if (coverImageData) {
        console.log('Uploading cover image...');
        coverImageUrl = await uploadCoverImage(coverImageData);
        console.log('Cover image uploaded:', coverImageUrl);
      }

      console.log('Creating instructional with data:', {
        title,
        description,
        price: parseFloat(price),
        cover_image_url: coverImageUrl,
        status,
        user_id: user.id,
      });

      console.log('User object:', user);
      console.log('User authenticated:', !!user);
      console.log('Supabase client:', supabase);

      // Create the instructional
      console.log('About to call supabase.from...');

      const insertData = {
        title,
        description,
        price: parseFloat(price),
        cover_image_url: coverImageUrl,
        status,
        user_id: user.id,
      };

      console.log('Insert data prepared:', insertData);

      let insertResult;
      try {
        console.log('Starting database insert...');

        // Add a timeout to detect hanging calls
        const insertPromise = supabase.from('instructionals').insert(insertData).select().single();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database call timed out after 10 seconds')), 10000);
        });

        insertResult = await Promise.race([insertPromise, timeoutPromise]);

        console.log('Insert completed successfully');
      } catch (dbError) {
        console.error('Database call threw an exception:', dbError);
        console.error('Error details:', {
          name: (dbError as any)?.name,
          message: (dbError as any)?.message,
          code: (dbError as any)?.code,
          details: (dbError as any)?.details,
          hint: (dbError as any)?.hint,
          stack: (dbError as any)?.stack,
        });
        const errorMessage = (dbError as any)?.message || String(dbError);
        throw new Error(`Database call failed: ${errorMessage}`);
      }

      console.log('Insert result:', insertResult);

      const { data: instructional, error: instructionalError } = insertResult;

      if (instructionalError) {
        console.error('Instructional creation error details:', {
          error: instructionalError,
          message: instructionalError.message,
          code: instructionalError.code,
          details: instructionalError.details,
          hint: instructionalError.hint,
        });
        throw new Error(`Database error: ${instructionalError.message} (Code: ${instructionalError.code})`);
      }

      console.log('Instructional created:', instructional);

      // Create sections and attach videos
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.name.trim()) continue;

        console.log(`Creating section ${i + 1}:`, section.name);

        const { data: sectionData, error: sectionError } = await supabase
          .from('instructional_sections')
          .insert({
            instructional_id: instructional.id,
            name: section.name,
            order_index: i,
          })
          .select()
          .single();

        if (sectionError) {
          console.error('Section creation error:', sectionError);
          throw sectionError;
        }

        console.log('Section created:', sectionData);

        // Add videos to section
        for (let j = 0; j < section.videos.length; j++) {
          const video = section.videos[j];
          console.log(`Adding video ${j + 1} to section:`, video.title);

          const { error: videoError } = await supabase.from('instructional_section_videos').insert({
            section_id: sectionData.id,
            technique_id: video.id,
            order_index: j,
          });

          if (videoError) {
            console.error('Video attachment error:', videoError);
            throw videoError;
          }
        }
      }

      console.log('All sections and videos created. Redirecting...');

      // Redirect to the instructional page
      router.push(`/instructionals/${instructional.id}`);
    } catch (err) {
      console.error('Full error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create instructional: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Instructionals', href: '/instructionals' },
    { label: 'Create New', isActive: true },
  ];

  if (!user) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500 py-8">You must be logged in to create instructionals.</div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Instructional</CardTitle>
            <CardDescription>Create a comprehensive instructional with multiple sections and video content.</CardDescription>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter instructional title" required />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this instructional covers"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
              </div>

              <div>
                <Label>Cover Image</Label>
                <ImageUploadCrop onImageSelect={(imageData) => setCoverImageData(imageData)} currentImageUrl={coverImageData || undefined} />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Sections</CardTitle>
                  <CardDescription>Organize your instructional into sections and add videos to each section.</CardDescription>
                </div>
                <Button type="button" onClick={addSection} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sections yet. Click "Add Section" to get started.</div>
              ) : (
                sections.map((section, index) => (
                  <Card key={section.id}>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Label htmlFor={`section-${section.id}`}>Section {index + 1} Name</Label>
                          <Input
                            id={`section-${section.id}`}
                            value={section.name}
                            onChange={(e) => updateSectionName(section.id, e.target.value)}
                            placeholder="Enter section name"
                          />
                        </div>
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeSection(section.id)} className="mt-6">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label>Videos in this section</Label>
                        {section.videos.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No videos added yet.</div>
                        ) : (
                          <div className="space-y-2">
                            {section.videos.map((video) => (
                              <div key={video.id} className="flex items-center gap-2 p-2 rounded">
                                <Video className="h-4 w-4" />
                                <span className="flex-1 text-sm">{video.title}</span>
                                <Button type="button" size="sm" variant="destructive" onClick={() => removeVideoFromSection(section.id, video.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button type="button" variant="outline" size="sm" onClick={() => setShowVideoSelector(section.id)} className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Video
                        </Button>
                      </div>

                      {/* Video Selector Modal */}
                      {showVideoSelector === section.id && (
                        <Card>
                          <CardContent className="pt-4 space-y-4">
                            <div className="flex justify-between items-center">
                              <Label>Select Videos</Label>
                              <Button type="button" variant="outline" size="sm" onClick={() => setShowVideoSelector(null)}>
                                Cancel
                              </Button>
                            </div>

                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
                              <Input placeholder="Search your videos..." value={videoSearchTerm} onChange={(e) => setVideoSearchTerm(e.target.value)} className="pl-10" />
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {filteredVideos.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">No videos found. Upload some videos first.</div>
                              ) : (
                                filteredVideos
                                  .filter((video) => !section.videos.some((v) => v.id === video.id))
                                  .map((video) => (
                                    <div
                                      key={video.id}
                                      className="flex items-center gap-2 p-2 rounded border cursor-pointer"
                                      onClick={() => addVideoToSection(section.id, video)}
                                    >
                                      <Video className="h-4 w-4" />
                                      <span className="flex-1 text-sm">{video.title}</span>
                                      <Button type="button" size="sm">
                                        Add
                                      </Button>
                                    </div>
                                  ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Status and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: 'draft' | 'published') => setStatus(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !title.trim()}>
                    {loading ? 'Creating...' : 'Create Instructional'}
                  </Button>
                </div>
              </div>

              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
