'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Video, Upload, CheckCircle, AlertCircle, XCircle, ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/protected-route';
import React from 'react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Import the thumbnail component from the original upload page
const InstantThumbnailSection = ({
  playbackId,
  onSelectThumbnail,
  onRegenerateRef,
}: {
  playbackId: string;
  onSelectThumbnail: (time: number) => void;
  onRegenerateRef?: React.MutableRefObject<(() => void) | null>;
}) => {
  const [thumbnails, setThumbnails] = React.useState<{ time: number; url: string; selected: boolean }[]>([]);
  const [, setSelectedIndex] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(false);

  // Generate thumbnails with loading delay to give Mux time to process
  const generateThumbnails = React.useCallback(async () => {
    console.log('🎬 generateThumbnails called with playbackId:', playbackId);

    if (!playbackId) {
      console.log('🎬 No playbackId available, skipping thumbnail generation');
      return;
    }

    // Show loading state
    setIsLoading(true);
    setThumbnails([]); // Clear any existing thumbnails

    // Brief delay to ensure Mux has started processing
    console.log('🎬 Brief delay for Mux processing...');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Use fixed timestamps that work well for most videos (in seconds)
    const timePoints = [0, 5, 15, 30, 45, 60]; // Include 0 seconds as first option

    const newThumbnails = timePoints.map((time, index) => ({
      time,
      url: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=320&height=180&v=${Date.now()}`, // Add cache busting
      selected: index === 0, // Select first thumbnail by default
    }));

    console.log('🎬 Generated thumbnails after delay for times:', timePoints);
    setThumbnails(newThumbnails);
    setSelectedIndex(0);
    setIsLoading(false);
    onSelectThumbnail(0); // Default to 0 seconds instead of first timepoint
  }, [playbackId]);

  const handleThumbnailClick = (index: number) => {
    setThumbnails((prev) => prev.map((thumb, i) => ({ ...thumb, selected: i === index })));
    setSelectedIndex(index);
    onSelectThumbnail(thumbnails[index].time);
  };

  const regenerateThumbnails = React.useCallback(async () => {
    // Show loading state briefly
    setIsLoading(true);
    setThumbnails([]); // Clear existing thumbnails

    // Brief delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate 6 new random timestamps, ensuring they're spread out and different
    const minTime = 0;
    const maxTime = 120;
    const randomTimes: number[] = [0]; // Always include 0 seconds

    // Generate 5 more unique random timestamps
    while (randomTimes.length < 6) {
      const newTime = Math.floor(Math.random() * (maxTime - minTime)) + minTime;
      // Ensure the new time is at least 10 seconds away from existing times
      if (!randomTimes.some((existingTime) => Math.abs(existingTime - newTime) < 10)) {
        randomTimes.push(newTime);
      }
    }

    // Sort times for better user experience
    randomTimes.sort((a, b) => a - b);

    const newThumbnails = randomTimes.map((time, index) => ({
      time,
      url: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=320&height=180&v=${Date.now()}`, // Add cache busting
      selected: index === 0,
    }));

    console.log('🎬 Regenerated 6 new thumbnails for times:', randomTimes);
    setThumbnails(newThumbnails);
    setSelectedIndex(0);
    setIsLoading(false);
    onSelectThumbnail(0); // Default to 0 seconds
  }, [playbackId]);

  // Generate thumbnails when component mounts and playbackId is available
  React.useEffect(() => {
    if (playbackId) {
      console.log('🎬 PlaybackId available, generating initial thumbnails:', playbackId);
      generateThumbnails();
    }
  }, [playbackId, generateThumbnails]);

  // Expose regenerate function to parent via ref
  React.useEffect(() => {
    if (onRegenerateRef) {
      onRegenerateRef.current = regenerateThumbnails;
    }
  }, [regenerateThumbnails]);

  if (!playbackId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Upload a video to see thumbnails</p>
      </div>
    );
  }

  if (isLoading || thumbnails.length === 0) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{isLoading ? 'Loading thumbnails...' : 'Upload a video to see thumbnails'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thumbnail grid */}
      <div className="grid grid-cols-3 gap-4">
        {thumbnails.map((thumb, index) => (
          <div
            key={`${thumb.time}-${index}`}
            className={cn(
              'relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
              thumb.selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted hover:border-muted-foreground/50'
            )}
            onClick={() => handleThumbnailClick(index)}
          >
            <div className="aspect-video bg-muted relative">
              <img
                src={thumb.url}
                alt={`Thumbnail at ${thumb.time}s`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('🖼️ Thumbnail failed to load, retrying...', thumb.url);
                  // Retry with a slight delay
                  setTimeout(() => {
                    e.currentTarget.src = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${thumb.time}&width=320&height=180&retry=${Date.now()}`;
                  }, 1000);
                }}
                onLoad={() => {
                  console.log('🖼️ Thumbnail loaded successfully:', thumb.time);
                }}
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center">{thumb.time}s</div>
            {thumb.selected && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <CheckCircle className="h-3 w-3" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Position options
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

interface EditState {
  activeTab: 'upload' | 'thumbnails' | 'details';
  videoFile: File | null;
  playbackId: string | null;
  selectedThumbnailTime: number | null;
  customThumbnail: File | null;
  formData: {
    title: string;
    position: string;
    description: string;
  };
  isPublished: boolean;
  uploadProgress: number;
  isUploading: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
}

interface Technique {
  id: string;
  title: string;
  position: string | null;
  description: string | null;
  mux_playback_id: string | null;
  thumbnail_time: number | null;
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'uploading' | 'error' | null;
}

export default function EditVideoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const regenerateRef = useRef<(() => void) | null>(null);

  const isNewVideo = params.id === 'new';
  const initialStep = (searchParams.get('step') as 'upload' | 'thumbnails' | 'details' | 'publish') || (isNewVideo ? 'upload' : 'thumbnails');

  const [technique, setTechnique] = useState<Technique | null>(null);
  const [state, setState] = useState<EditState>({
    activeTab: isNewVideo ? 'upload' : initialStep,
    videoFile: null,
    playbackId: null,
    selectedThumbnailTime: null,
    customThumbnail: null,
    formData: {
      title: '',
      position: '',
      description: '',
    },
    isPublished: false,
    uploadProgress: 0,
    isUploading: false,
    isSaving: false,
    error: null,
    success: null,
  });

  useEffect(() => {
    if (!isNewVideo) {
      fetchTechnique();
    }
  }, [params.id, isNewVideo]);

  const fetchTechnique = async () => {
    try {
      const { data, error } = await supabase.from('techniques').select('*').eq('id', params.id).eq('user_id', user?.id).single();

      if (error) throw error;

      console.log('🎬 Fetched technique data:', data);
      console.log('🎬 Technique mux_playback_id:', data.mux_playback_id);

      setTechnique(data);
      setState((prev) => ({
        ...prev,
        playbackId: data.mux_playback_id,
        selectedThumbnailTime: data.thumbnail_time,
        isPublished: data.status === 'published',
        formData: {
          title: data.title || '',
          position: data.position || '',
          description: data.description || '',
        },
      }));
    } catch (error) {
      console.error('Error fetching technique:', error);
      setState((prev) => ({ ...prev, error: 'Failed to load video data' }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setState((prev) => ({ ...prev, error: 'Please select a valid video file.' }));
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setState((prev) => ({ ...prev, error: 'Video file must be smaller than 100MB.' }));
        return;
      }

      setState((prev) => ({
        ...prev,
        videoFile: file,
        error: null,
      }));
    }
  };

  const handleUpload = async () => {
    if (!state.videoFile || !user) return;

    setState((prev) => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }));

    try {
      const formData = new FormData();
      formData.append('video', state.videoFile);
      formData.append('title', 'Draft Video');
      formData.append('position', 'Standing');
      formData.append('user_id', user.id);

      // Start the upload in the background (don't await)
      console.log('🎬 Starting background upload...');
      fetch('/api/mux/upload-video', {
        method: 'POST',
        body: formData,
      })
        .then(async (response) => {
          console.log('🎬 Upload response status:', response.status);
          if (response.ok) {
            const result = await response.json();
            console.log('🎬 Background upload completed successfully:', result);
          } else {
            const errorText = await response.text();
            console.error('🎬 Background upload failed:', response.status, errorText);
          }
        })
        .catch((error) => {
          console.error('🎬 Background upload error:', error);
        });

      // Immediately redirect to manage videos page
      console.log('🎬 Redirecting to manage videos page...');
      router.push('/videos/upload');
    } catch (error) {
      console.error('Upload error:', error);
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: 'Failed to start upload. Please try again.',
      }));
    }
  };

  const handleSave = async () => {
    if (!user || (!technique && !state.playbackId)) return;

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      let thumbnailUrl: string | null = null;

      // Handle custom thumbnail upload if present
      if (state.customThumbnail) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', state.customThumbnail);
        uploadFormData.append('userId', user.id);

        const uploadResponse = await fetch('/api/thumbnails/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload custom thumbnail');
        }

        const uploadResult = await uploadResponse.json();
        thumbnailUrl = uploadResult.url;
      }

      // Update technique
      const updateResponse = await fetch('/api/techniques/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playbackId: state.playbackId || technique?.mux_playback_id,
          title: state.formData.title,
          position: state.formData.position,
          description: state.formData.description,
          thumbnailTime: state.selectedThumbnailTime,
          thumbnailUrl: thumbnailUrl,
          userId: user.id,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to save changes');
      }

      setState((prev) => ({
        ...prev,
        isSaving: false,
        success: 'Changes saved successfully!',
      }));

      // Refresh data
      if (!isNewVideo) {
        await fetchTechnique();
      }
    } catch (error) {
      console.error('Save error:', error);
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: 'Failed to save changes. Please try again.',
      }));
    }
  };

  const handlePublish = async () => {
    if (!technique && !state.playbackId) return;

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      // First save current changes
      await handleSave();

      // Then update status based on toggle
      const { error } = await supabase
        .from('techniques')
        .update({ status: state.isPublished ? 'published' : 'draft' })
        .eq('id', technique?.id || params.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isSaving: false,
        success: 'Video updated successfully!',
      }));

      // Redirect back to manage page after a short delay
      setTimeout(() => {
        router.push('/videos/upload');
      }, 1500);
    } catch (error) {
      console.error('Publish error:', error);
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: 'Failed to publish video. Please try again.',
      }));
    }
  };

  const handleFormChange = (field: keyof EditState['formData'], value: string) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    }));
  };

  const canProceedToThumbnails = state.playbackId || technique?.mux_playback_id;
  const canProceedToDetails = canProceedToThumbnails && (state.selectedThumbnailTime !== null || state.customThumbnail);
  const canPublish = canProceedToDetails && state.formData.title && state.formData.position;

  const breadcrumbs = [
    { label: 'Videos', href: '/videos' },
    { label: 'Manage Videos', href: '/videos/upload' },
    { label: isNewVideo ? 'Upload New Video' : 'Edit Video', isActive: true },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">{isNewVideo ? 'Upload New Video' : `Edit Video${technique?.title ? `: ${technique.title}` : ''}`}</h1>
            <p className="text-muted-foreground">{isNewVideo ? 'Upload and configure your technique video' : 'Edit your technique video'}</p>
          </div>

          {/* Alerts */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs value={state.activeTab} onValueChange={(value) => setState((prev) => ({ ...prev, activeTab: value as EditState['activeTab'] }))}>
            <TabsList className={`grid w-full ${isNewVideo ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {isNewVideo && <TabsTrigger value="upload">Upload</TabsTrigger>}
              <TabsTrigger value="thumbnails" disabled={!canProceedToThumbnails}>
                Thumbnails
              </TabsTrigger>
              <TabsTrigger value="details" disabled={!canProceedToThumbnails}>
                Details
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab - Only for new videos */}
            {isNewVideo && (
              <TabsContent value="upload">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Video
                    </CardTitle>
                    <CardDescription>Choose a video file to upload. Supported formats: MP4, MOV, AVI (max 100MB)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">{state.videoFile ? state.videoFile.name : 'Select video file'}</h3>
                      <p className="text-muted-foreground mb-4">
                        {state.videoFile ? `${(state.videoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Click to browse or drag and drop your video file here'}
                      </p>
                      <Button variant="outline">{state.videoFile ? 'Change File' : 'Browse Files'}</Button>
                    </div>

                    <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />

                    {state.isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{state.uploadProgress}%</span>
                        </div>
                        <Progress value={state.uploadProgress} />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={handleUpload} disabled={!state.videoFile || state.isUploading} className="flex-1">
                        {state.isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Video
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Thumbnails Tab */}
            <TabsContent value="thumbnails">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Choose Thumbnail
                    </div>
                    <Button onClick={() => regenerateRef.current?.()} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </CardTitle>
                  <CardDescription>Select a thumbnail for your video or upload a custom one.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auto-generated thumbnails */}
                  <div>
                    <h4 className="font-medium mb-4">Auto-generated Thumbnails</h4>
                    <InstantThumbnailSection
                      playbackId={state.playbackId || technique?.mux_playback_id || ''}
                      onSelectThumbnail={React.useCallback((time: number) => {
                        setState((prev) => ({ ...prev, selectedThumbnailTime: time, customThumbnail: null }));
                      }, [])}
                      onRegenerateRef={regenerateRef}
                    />
                  </div>

                  <Separator />

                  {/* Custom thumbnail upload */}
                  <div>
                    <h4 className="font-medium mb-4">Custom Thumbnail</h4>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setState((prev) => ({
                              ...prev,
                              customThumbnail: file,
                              selectedThumbnailTime: null,
                            }));
                          }
                        }}
                        className="hidden"
                        id="custom-thumbnail"
                      />
                      <label htmlFor="custom-thumbnail">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Custom Thumbnail
                          </span>
                        </Button>
                      </label>
                      {state.customThumbnail && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {state.customThumbnail.name}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => setState((prev) => ({ ...prev, customThumbnail: null }))}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handlePublish} disabled={!canPublish || state.isSaving}>
                      {state.isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save Video
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video Details
                  </CardTitle>
                  <CardDescription>Fill in the details for your technique video.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={state.formData.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        placeholder="Enter video title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position *</Label>
                      <Select value={state.formData.position} onValueChange={(value) => handleFormChange('position', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {POSITION_OPTIONS.map((position) => (
                            <SelectItem key={position} value={position}>
                              {position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={state.formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="Describe the technique shown in this video..."
                      rows={4}
                    />
                  </div>

                  {/* Published/Draft Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="published-toggle" className="text-base font-medium">
                        Video Status
                      </Label>
                      <p className="text-sm text-muted-foreground">{state.isPublished ? 'Video is published and visible to others' : 'Video is saved as draft'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{state.isPublished ? 'Published' : 'Draft'}</span>
                      <Switch id="published-toggle" checked={state.isPublished} onCheckedChange={(checked) => setState((prev) => ({ ...prev, isPublished: checked }))} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handlePublish} disabled={!canPublish || state.isSaving}>
                      {state.isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save Video
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
