'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { getAISummary } from '@/lib/ai-summary-cache';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

import { Plus, CalendarIcon, X, Trophy, MapPin, Medal } from 'lucide-react';
import Image from 'next/image';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import { AISummary } from '@/components/ai-summary';

const PAGE_SIZE = 10;

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

const PLACEMENT_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`,
}));

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
  [key: string]: unknown;
}

export default function CompetitionsPage() {
  const { user, userPlusSubscription } = useAuth();
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);

  // Filter state
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [selectedPlacement, setSelectedPlacement] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedMatchType, setSelectedMatchType] = useState<string>('');

  // Add XAI summary state
  const [xaiSummary, setXaiSummary] = useState<string | null>(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  const [xaiError, setXaiError] = useState<string | null>(null);

  const lastCompetitionRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    setCompetitions([]);
    setPage(0);
    setHasMore(true);
  }, [user, fromDate, toDate, selectedPlacement, selectedStatus, selectedMatchType]);

  useEffect(() => {
    async function fetchCompetitions() {
      if (!user || !userPlusSubscription) return;

      setLoading(true);
      setError(null);

      try {
        let query = supabase.from('competitions').select('*').eq('user_id', user.id);

        // Apply filters
        if (fromDate) {
          query = query.gte('competition_date', fromDate.toISOString().split('T')[0]);
        }
        if (toDate) {
          query = query.lte('competition_date', toDate.toISOString().split('T')[0]);
        }
        if (selectedPlacement) {
          query = query.eq('placement', parseInt(selectedPlacement));
        }
        if (selectedStatus) {
          query = query.eq('status', selectedStatus);
        }
        if (selectedMatchType) {
          query = query.eq('match_type', selectedMatchType);
        }

        const { data, error } = await query
          .order('competition_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
          setError('Failed to load competitions');
          console.error('Error fetching competitions:', error);
        } else {
          setCompetitions((prev) => {
            const all = [...prev, ...data];
            const unique = Array.from(new Map(all.map((item) => [item.id, item])).values());
            return unique;
          });
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (err) {
        setError('Failed to load competitions');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (hasMore && userPlusSubscription) fetchCompetitions();
  }, [page, user, hasMore, userPlusSubscription]);

  // Fetch XAI summary when competitions are loaded with caching
  useEffect(() => {
    if (!user || loading || !competitions.length || !userPlusSubscription) {
      setXaiSummary(null);
      setXaiError(null);
      setXaiLoading(false);
      return;
    }

    setXaiLoading(true);
    setXaiError(null);

    getAISummary(user.id, 'competitions', competitions)
      .then((result) => {
        setXaiSummary(result.summary);
        setXaiError(result.error);
      })
      .finally(() => {
        setXaiLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, competitions.length, userPlusSubscription]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Competitions', isActive: true },
  ];

  const handleCompetitionClick = (competitionId: string) => {
    router.push(`/competitions/${competitionId}`);
  };

  const handleCreateNew = () => {
    router.push('/competitions/new');
  };

  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedPlacement('');
    setSelectedStatus('');
    setSelectedMatchType('');
  };

  const hasActiveFilters = fromDate || toDate || selectedPlacement || selectedStatus || selectedMatchType;

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption ? statusOption : { value: status, label: status, color: 'bg-gray-500' };
  };

  const getPlacementIcon = (placement: number | null) => {
    if (!placement) return null;
    if (placement <= 3) {
      return <Medal className="h-4 w-4 text-yellow-500" />;
    }
    return <Trophy className="h-4 w-4 text-gray-500" />;
  };

  if (error) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="border-none">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold">Competitions</CardTitle>
                <CardDescription>Track your competition history and results</CardDescription>
              </div>
              <Button onClick={handleCreateNew} className="sm:flex-shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Add Competition
              </Button>
            </div>
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
      <Card className="border-none">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold">Competitions</CardTitle>
              <CardDescription>Track your competition history and results</CardDescription>
            </div>
            <Button onClick={handleCreateNew} className="sm:flex-shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Add Competition
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* User+ Upgrade Banner */}
          {!userPlusSubscription && (
            <div className="mb-6">
              <Card>
                <CardContent className="flex flex-col items-center">
                  <div className="mb-2 text-center">Upgrade to User+ to unlock AI-powered competition tracking and recommendations!</div>
                  <Button onClick={() => router.push('/subscriptions')} variant="default">
                    View Subscription Options
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          {userPlusSubscription && (
            <>
              {/* XAI Summary Section */}
              <div className="mb-6">
                {xaiLoading && <Skeleton className="h-6 w-full mb-2" />}
                {xaiError && <div className="text-red-500 text-sm mb-2">{xaiError}</div>}
                {xaiSummary && !xaiLoading && !xaiError && <AISummary title="Competition Summary & Recommendation:" content={xaiSummary} />}
              </div>

              {/* Filter Bar */}
              <div className="mb-6 p-4 border rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
                  {/* From Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? formatDate(fromDate, 'MMM dd, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={fromDate} onSelect={setFromDate} captionLayout="dropdown" initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* To Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !toDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? formatDate(toDate, 'MMM dd, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={toDate} onSelect={setToDate} captionLayout="dropdown" initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Placement */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Placement</label>
                    <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
                      <SelectTrigger className="w-full justify-start text-left font-normal">
                        <SelectValue placeholder="Any placement" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLACEMENT_OPTIONS.map((placement) => (
                          <SelectItem key={placement.value} value={placement.value}>
                            {placement.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full justify-start text-left font-normal">
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Match Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Match Type</label>
                    <Select value={selectedMatchType} onValueChange={setSelectedMatchType}>
                      <SelectTrigger className="w-full justify-start text-left font-normal">
                        <SelectValue placeholder="Any type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MATCH_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>

              {/* Competition List */}
              <div className="space-y-4">
                {competitions.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No competitions yet</h3>
                    <p className="text-muted-foreground mb-4">Start tracking your competition history</p>
                    <Button onClick={handleCreateNew}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Competition
                    </Button>
                  </div>
                ) : (
                  competitions.map((competition, index) => (
                    <Card
                      key={competition.id}
                      ref={index === competitions.length - 1 ? lastCompetitionRef : null}
                      className="cursor-pointer hover:shadow-md transition-shadow py-3"
                      onClick={() => handleCompetitionClick(competition.id)}
                    >
                      <CardContent className="px-4 py-0">
                        <div className="flex gap-4">
                          {/* Podium Photo - Left Side */}
                          <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
                            {competition.podium_photo_url ? (
                              <Image src={competition.podium_photo_url} alt="Podium photo" width={80} height={80} className="rounded-full object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
                                <Trophy className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Competition Content - Right Side */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div className="min-w-0 flex-1 pr-2">
                                <h3 className="font-semibold text-lg truncate">{competition.event_name}</h3>
                                <div className="flex items-center text-sm text-muted-foreground mt-1">
                                  <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{formatDate(new Date(competition.competition_date), 'MMM dd, yyyy')}</span>
                                  <MapPin className="ml-3 mr-1 h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {competition.city}, {competition.state}, {competition.country}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <Badge variant="secondary" className={`${getStatusBadge(competition.status).color} text-white`}>
                                  {getStatusBadge(competition.status).label}
                                </Badge>
                                {(competition.match_type === 'tournament' || competition.match_type === 'tournament_team') && competition.placement && (
                                  <div className="flex items-center gap-1 text-sm">
                                    {getPlacementIcon(competition.placement)}
                                    <span>
                                      {competition.placement}
                                      {competition.placement === 1 ? 'st' : competition.placement === 2 ? 'nd' : competition.placement === 3 ? 'rd' : 'th'} Place
                                    </span>
                                  </div>
                                )}
                                {(competition.match_type === 'single' || competition.match_type === 'single_team') && competition.result && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <span className={`font-semibold ${competition.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                                      {competition.result === 'win' ? 'Win' : 'Loss'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="capitalize">
                                {MATCH_TYPE_OPTIONS.find((option) => option.value === competition.match_type)?.label || competition.match_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}

                {loading && (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-20" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
