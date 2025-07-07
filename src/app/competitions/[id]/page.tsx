'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ArrowLeft, Calendar, MapPin, Trophy, Medal } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import Image from 'next/image';

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'disqualified', label: 'Disqualified', color: 'bg-red-500' },
  { value: 'injured', label: 'Injured', color: 'bg-yellow-500' },
  { value: 'withdrew', label: 'Withdrew', color: 'bg-gray-500' },
];

const MATCH_TYPE_OPTIONS = [
  { value: 'single', label: 'Single Match' },
  { value: 'single_team', label: 'Single Team Event' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'tournament_team', label: 'Tournament Team Event' },
];

interface Competition {
  id: string;
  event_name: string;
  competition_date: string;
  city: string;
  state: string;
  country: string;
  placement: number | null;
  result: string | null;
  status: string;
  match_type: string;
  podium_photo_url?: string;
  created_at: string;
}

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const competitionId = params.id as string;

  useEffect(() => {
    async function fetchCompetition() {
      if (!user || !competitionId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.from('competitions').select('*').eq('id', competitionId).eq('user_id', user.id).single();

        if (error) {
          setError('Failed to load competition');
          console.error('Error fetching competition:', error);
        } else {
          setCompetition(data);
        }
      } catch (err) {
        setError('Failed to load competition');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompetition();
  }, [competitionId, user]);

  const handleEdit = () => {
    router.push(`/competitions/${competitionId}/edit`);
  };

  const handleDelete = async () => {
    if (!competitionId) return;

    setDeleting(true);

    try {
      // Delete podium photo from storage if it exists
      if (competition?.podium_photo_url) {
        const fileName = competition.podium_photo_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('podium-photos').remove([`${user?.id}/${fileName}`]);
        }
      }

      // Delete competition record
      const { error } = await supabase.from('competitions').delete().eq('id', competitionId);

      if (error) {
        setError('Failed to delete competition');
      } else {
        router.push('/competitions');
      }
    } catch {
      setError('Failed to delete competition');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption ? statusOption : { value: status, label: status, color: 'bg-gray-500' };
  };

  const getMatchTypeLabel = (matchType: string) => {
    const matchTypeOption = MATCH_TYPE_OPTIONS.find((m) => m.value === matchType);
    return matchTypeOption ? matchTypeOption.label : matchType;
  };

  const getPlacementIcon = (placement: number | null) => {
    if (!placement) return null;
    if (placement <= 3) {
      return <Medal className="h-5 w-5 text-yellow-500" />;
    }
    return <Trophy className="h-5 w-5 text-gray-500" />;
  };

  const getPlacementText = (placement: number | null) => {
    if (!placement) return null;
    return `${placement}${placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th'} Place`;
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Competitions', href: '/competitions' },
    { label: 'Competition Details', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="w-full mx-auto border-none">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="w-full mx-auto border-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Competition Details</CardTitle>
            <CardDescription>Competition information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">{error}</div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => router.push('/competitions')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Competitions
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!competition) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="w-full mx-auto border-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Competition Details</CardTitle>
            <CardDescription>Competition not found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">Competition not found</div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => router.push('/competitions')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Competitions
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <Card className="w-full mx-auto border-none">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">{competition.event_name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4" />
                {formatDate(new Date(competition.competition_date), 'MMMM dd, yyyy')}
                <MapPin className="h-4 w-4 ml-2" />
                {competition.city}, {competition.state}, {competition.country}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowConfirm(true)} disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Competition Details with Photo */}
          <div className={`grid gap-6 ${competition.podium_photo_url ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {/* Competition Details - Left Side */}
            <div className={`space-y-6 ${competition.podium_photo_url ? 'lg:col-span-2' : 'col-span-1'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-muted-foreground">Status</div>
                    <Badge className={`${getStatusBadge(competition.status).color} text-white`}>{getStatusBadge(competition.status).label}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-muted-foreground">Match Type</div>
                    <div className="text-lg">{getMatchTypeLabel(competition.match_type)}</div>
                  </div>

                  {(competition.match_type === 'tournament' || competition.match_type === 'tournament_team') && competition.placement && (
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-muted-foreground">Placement</div>
                      <div className="flex items-center gap-2 text-lg">
                        {getPlacementIcon(competition.placement)}
                        {getPlacementText(competition.placement)}
                      </div>
                    </div>
                  )}

                  {(competition.match_type === 'single' || competition.match_type === 'single_team') && competition.result && (
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-muted-foreground">Result</div>
                      <div className="text-lg capitalize font-semibold">
                        {competition.result === 'win' ? <span className="text-green-600">Win</span> : <span className="text-red-600">Loss</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-muted-foreground">Event Name</div>
                    <div className="text-lg">{competition.event_name}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-muted-foreground">Location</div>
                    <div className="text-lg">
                      {competition.city}, {competition.state}, {competition.country}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-muted-foreground">Date</div>
                    <div className="text-lg">{formatDate(new Date(competition.competition_date), 'MMMM dd, yyyy')}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Podium Photo - Right Side */}
            {competition.podium_photo_url && (
              <div className="relative w-full">
                <Image src={competition.podium_photo_url} alt="Podium photo" width={400} height={300} className="rounded-lg object-cover w-full h-auto" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button variant="outline" onClick={() => router.push('/competitions')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Competitions
            </Button>
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Competition
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Competition</CardTitle>
              <CardDescription>Are you sure you want to delete this competition? This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
