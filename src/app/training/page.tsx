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
import { Plus, CalendarIcon, X, MapPin } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import { AISummary } from '@/components/ai-summary';

const PAGE_SIZE = 10;

const CATEGORY_OPTIONS = [
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

interface TrainingSession {
  id: string;
  date: string;
  class_time: string;
  location: string;
  format_uniform: string;
  category: string;
  class_summary?: string;
  notes?: string;
  sparring: boolean;
  rounds?: number;
  minutes_per_round?: number;
  created_at: string;
}

export default function TrainingPage() {
  const { user, userPlusSubscription } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);

  // Filter state
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Add state for XAI summary
  const [xaiSummary, setXaiSummary] = useState<string | null>(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  const [xaiError, setXaiError] = useState<string | null>(null);

  const lastSessionRef = useCallback(
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
    setSessions([]);
    setPage(0);
    setHasMore(true);
  }, [user, fromDate, toDate, selectedCategory]);

  useEffect(() => {
    async function fetchSessions() {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        let query = supabase.from('training_session').select('*').eq('user_id', user.id);

        // Apply filters
        if (fromDate) {
          query = query.gte('date', fromDate.toISOString().split('T')[0]);
        }
        if (toDate) {
          query = query.lte('date', toDate.toISOString().split('T')[0]);
        }
        if (selectedCategory) {
          query = query.eq('category', selectedCategory);
        }

        const { data, error } = await query
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
          setError('Failed to load sessions');
          console.error('Error fetching sessions:', error);
        } else {
          setSessions((prev) => {
            const all = [...prev, ...data];
            const unique = Array.from(new Map(all.map((item) => [item.id, item])).values());
            return unique;
          });
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (err) {
        setError('Failed to load sessions');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (hasMore) fetchSessions();
  }, [page, user, hasMore]);

  // Fetch XAI summary when sessions change with caching
  useEffect(() => {
    if (!user || loading || sessions.length === 0 || !userPlusSubscription) {
      setXaiSummary(null);
      setXaiError(null);
      setXaiLoading(false);
      return;
    }

    setXaiLoading(true);
    setXaiError(null);

    getAISummary(user.id, 'training', sessions)
      .then((result) => {
        setXaiSummary(result.summary);
        setXaiError(result.error);
      })
      .finally(() => {
        setXaiLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, fromDate, toDate, selectedCategory, sessions.length, userPlusSubscription]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Training', isActive: true },
  ];

  const handleSessionClick = (sessionId: string) => {
    router.push(`/training/${sessionId}`);
  };

  const handleCreateNew = () => {
    router.push('/training/new');
  };

  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setSelectedCategory('');
  };

  const hasActiveFilters = fromDate || toDate || selectedCategory;

  if (error) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="border-none">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl font-bold">Training Logs</CardTitle>
                <CardDescription>Your training session history</CardDescription>
              </div>
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                New Training Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Bar */}
            <div className="mb-6 p-4 border rounded-lg bg-secondary/20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* From Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? formatDate(fromDate, 'MMM dd, yyyy') : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
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
                        {toDate ? formatDate(toDate, 'MMM dd, yyyy') : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 ">
                      <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <div>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="w-full flex align-items-center justify-center">
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="text-center text-red-500 py-8">{error}</div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!loading && sessions.length === 0) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl font-bold">Training Logs</CardTitle>
                <CardDescription>Your training session history</CardDescription>
              </div>
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                New Training Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Bar */}
            <div className="mb-6 p-4 border rounded-lg ">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* From Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4 " />
                        {fromDate ? formatDate(fromDate, 'MMM dd, yyyy') : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
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
                        {toDate ? formatDate(toDate, 'MMM dd, yyyy') : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                <div>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      <X className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {/* XAI Summary Section or Upgrade Banner */}
            <div className="mb-6">
              {!userPlusSubscription && (
                <Card>
                  <CardContent className="flex flex-col items-center">
                    <div className="mb-2 text-center">Upgrade to User+ to unlock AI-powered training summaries and recommendations!</div>
                    <Button onClick={() => router.push('/subscriptions')} variant="default">
                      View Subscription Options
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="text-center text-muted-foreground py-8">
              {hasActiveFilters ? 'No training sessions found for the selected filters.' : 'No training sessions yet. Create your first training log!'}
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <Card className="border-none">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl font-bold">Training Logs</CardTitle>
              <CardDescription>Your training session history</CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Training Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="mb-6 p-4 border rounded-lg ">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* From Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !fromDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? formatDate(fromDate, 'MMM dd, yyyy') : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
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
                      {toDate ? formatDate(toDate, 'MMM dd, yyyy') : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="w-full flex align-items-center">
                    <X />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
          {/* XAI Summary Section */}
          <div className="mb-6">
            {userPlusSubscription ? (
              <>
                {xaiLoading && <Skeleton className="h-6 w-full mb-2" />}
                {xaiError && <div className="text-red-500 text-sm mb-2">{xaiError}</div>}
                {xaiSummary && !xaiLoading && !xaiError && <AISummary title="Training Summary & Recommendation:" content={xaiSummary} />}
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center">
                  <div className="mb-2 text-center">Upgrade to User+ to unlock AI-powered training summaries and recommendations!</div>
                  <Button onClick={() => router.push('/subscriptions')} variant="default">
                    View Subscription Options
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="space-y-1">
            {sessions.map((session, index) => {
              const isLast = index === sessions.length - 1;
              return (
                <div
                  key={session.id}
                  ref={isLast ? lastSessionRef : null}
                  className="p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSessionClick(session.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View session on ${session.date}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSessionClick(session.id);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-lg">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {formatDate(new Date(session.date), 'MMM dd, yyyy')} • {session.class_time}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded">{session.format_uniform}</div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mb-3">
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{session.location}</span>
                  </div>
                  <div className="text-sm mb-3">
                    <span className="font-medium">Category:</span> {session.category}
                  </div>
                  {session.sparring && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="font-medium">Sparring:</span>
                      <span className="bg-white text-black px-2 py-1 rounded-full">Rounds: {session.rounds}</span>
                      <span className="bg-white text-black px-2 py-1 rounded-full">Minutes/Round: {session.minutes_per_round}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {loading && (
            <div className="space-y-4 mt-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {!hasMore && sessions.length > 0 && <div className="text-center text-muted-foreground mt-4">End of Training Logs.</div>}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
