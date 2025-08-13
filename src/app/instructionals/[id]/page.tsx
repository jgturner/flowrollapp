'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Edit, Play } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Instructional {
  id: string;
  title: string;
  description: string;
  price: number;
  cover_image_url: string;
  status: 'draft' | 'published' | 'archived';
  user_id: string;
  created_at: string;
  updated_at: string;
  sections: InstructionalSection[];
}

interface InstructionalSection {
  id: string;
  name: string;
  order_index: number;
  videos: SectionVideo[];
}

interface SectionVideo {
  id: string;
  technique_id: string;
  order_index: number;
  technique: {
    id: string;
    title: string;
    mux_playback_id: string;
    thumbnail_time: number;
  };
}

export default function InstructionalDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const instructionalId = params.id as string;

  const [instructional, setInstructional] = useState<Instructional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (instructionalId) {
      fetchInstructional();
    }
  }, [instructionalId]);

  const fetchInstructional = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('instructionals')
        .select(
          `
          *,
          sections:instructional_sections (
            id,
            name,
            order_index,
            videos:instructional_section_videos (
              id,
              technique_id,
              order_index,
              technique:techniques (
                id,
                title,
                mux_playback_id,
                thumbnail_time
              )
            )
          )
        `
        )
        .eq('id', instructionalId)
        .single();

      if (error) {
        throw error;
      }

      // Sort sections and videos by order_index
      if (data.sections) {
        (data.sections as InstructionalSection[]).sort((a, b) => a.order_index - b.order_index);
        (data.sections as InstructionalSection[]).forEach((section) => {
          if (section.videos) {
            (section.videos as SectionVideo[]).sort((a, b) => a.order_index - b.order_index);
          }
        });
      }

      setInstructional(data);
    } catch (err) {
      console.error('Error fetching instructional:', err);
      setError('Failed to load instructional');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = (): number => {
    if (!instructional?.sections) return 0;

    return instructional.sections.reduce((total, section) => {
      return (
        total +
        section.videos.reduce((sectionTotal) => {
          return sectionTotal + 0; // Duration not available in techniques table
        }, 0)
      );
    }, 0);
  };

  const getTotalVideoCount = (): number => {
    if (!instructional?.sections) return 0;

    return instructional.sections.reduce((total, section) => {
      return total + section.videos.length;
    }, 0);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Instructionals', href: '/instructionals' },
    { label: instructional?.title || 'Loading...', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-64 rounded-lg mb-4"></div>
            <div className="h-8 rounded mb-2"></div>
            <div className="h-4 rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 rounded"></div>
              <div className="h-4 rounded"></div>
              <div className="h-4 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !instructional) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500 py-8">{error || 'Instructional not found'}</div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isOwner = user?.id === instructional.user_id;
  const canEdit = isOwner;

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Cover Image */}
              <div className="lg:w-1/3">
                {instructional.cover_image_url ? (
                  <img src={instructional.cover_image_url} alt={instructional.title} className="w-full h-48 lg:h-64 object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-48 lg:h-64 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="lg:w-2/3 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold mb-2">{instructional.title}</h1>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-bold">${instructional.price.toFixed(2)}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <Link href={`/instructionals/${instructional.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>

                {instructional.description && <p className="text-muted-foreground leading-relaxed">{instructional.description}</p>}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    <span>{getTotalVideoCount()} videos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(getTotalDuration())} total</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{instructional.sections?.length || 0} sections</span>
                  </div>
                </div>
                <Button>Add to Cart</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Course Content</h2>
            <div className="text-muted-foreground">
              {getTotalVideoCount()} videos • {formatDuration(getTotalDuration())}
            </div>
          </div>

          {instructional.sections && instructional.sections.length > 0 ? (
            instructional.sections.map((section, sectionIndex) => (
              <Card key={section.id}>
                <CardHeader className="py-1 px-2">
                  <CardTitle className="">
                    {sectionIndex + 1}. {section.name}
                  </CardTitle>
                  <CardDescription>
                    {section.videos.length} videos • {formatDuration(section.videos.reduce((total) => total + 0, 0))}
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-1 px-2">
                  {section.videos.length > 0 ? (
                    <div className="space-y-0.5">
                      {section.videos.map((video, videoIndex) => (
                        <div key={video.id} className="flex items-center gap-2 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium">{videoIndex + 1}</div>
                          <div className="flex-1">
                            <Link href={`/technique/${video.technique.id}`} className="font-medium">
                              {video.technique.title}
                            </Link>
                          </div>
                          <div className="text-muted-foreground">--:--</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No videos in this section yet.</div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  No sections created yet.
                  {canEdit && (
                    <div className="mt-4">
                      <Link href={`/instructionals/${instructional.id}/edit`}>
                        <Button variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Add Sections
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
