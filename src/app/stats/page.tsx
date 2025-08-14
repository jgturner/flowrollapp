'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { getAISummary } from '@/lib/ai-summary-cache';
interface DataItem {
  [key: string]: unknown;
}
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Target, Calendar, Dumbbell, Zap, Users } from 'lucide-react';
import { AISummary } from '@/components/ai-summary';

const FORMATS = [
  { key: 'Gi', color: 'bg-blue-500' },
  { key: 'No-Gi', color: 'bg-red-500' },
];

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
  format_uniform: string;
  category: string;
}

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
  created_at: string;
}

export default function StatsPage() {
  const { user, userPlusSubscription } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'training' | 'competitions'>('training');
  const [trainingSubView, setTrainingSubView] = useState<'format' | 'category'>('format');
  // Add XAI summary state
  const [xaiSummary, setXaiSummary] = useState<string | null>(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  const [xaiError, setXaiError] = useState<string | null>(null);
  // Add XAI summary state for competitions
  const [xaiCompSummary, setXaiCompSummary] = useState<string | null>(null);
  const [xaiCompLoading, setXaiCompLoading] = useState(false);
  const [xaiCompError, setXaiCompError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch training sessions
        const { data: sessionsData, error: sessionsError } = await supabase.from('training_session').select('format_uniform, category').eq('user_id', user.id);

        // Fetch competitions
        const { data: competitionsData, error: competitionsError } = await supabase.from('competitions').select('*').eq('user_id', user.id);

        if (sessionsError) {
          setError('Failed to load training stats');
          console.error('Error fetching sessions:', sessionsError);
        } else if (competitionsError) {
          setError('Failed to load competition stats');
          console.error('Error fetching competitions:', competitionsError);
        } else {
          setSessions(sessionsData || []);
          setCompetitions(competitionsData || []);
        }
      } catch (err) {
        setError('Failed to load stats');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Fetch XAI summary when sessions are loaded with caching
  useEffect(() => {
    if (!user || loading || !sessions.length || !userPlusSubscription) {
      setXaiSummary(null);
      setXaiError(null);
      setXaiLoading(false);
      return;
    }

    setXaiLoading(true);
    setXaiError(null);

    getAISummary(user.id, 'training', sessions as DataItem[])
      .then((result) => {
        setXaiSummary(result.summary);
        setXaiError(result.error);
      })
      .finally(() => {
        setXaiLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, sessions.length, userPlusSubscription]);

  // Fetch XAI summary for competitions when competitions are loaded with caching
  useEffect(() => {
    if (!user || loading || !competitions.length || !userPlusSubscription) {
      setXaiCompSummary(null);
      setXaiCompError(null);
      setXaiCompLoading(false);
      return;
    }

    setXaiCompLoading(true);
    setXaiCompError(null);

    getAISummary(user.id, 'competitions', competitions)
      .then((result) => {
        setXaiCompSummary(result.summary);
        setXaiCompError(result.error);
      })
      .finally(() => {
        setXaiCompLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, competitions.length, userPlusSubscription]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Stats', isActive: true },
  ];

  // Competition stats calculations
  const totalCompetitions = competitions.length;
  const podiumFinishes = competitions.filter((c) => c.placement && c.placement <= 3).length;
  const goldMedals = competitions.filter((c) => c.placement === 1).length;
  const matchWins = competitions.filter((c) => c.result === 'win').length;
  const completedCompetitions = competitions.filter((c) => c.status === 'completed').length;
  const completionRate = totalCompetitions > 0 ? (completedCompetitions / totalCompetitions) * 100 : 0;

  // Competition experience level
  const getExperienceLevel = (totalComps: number) => {
    if (totalComps === 0) return 'Beginner';
    if (totalComps < 5) return 'Novice';
    if (totalComps < 15) return 'Intermediate';
    if (totalComps < 30) return 'Experienced';
    return 'Veteran';
  };

  // Years active calculation
  const yearsActive =
    competitions.length > 0 ? new Date().getFullYear() - new Date(Math.min(...competitions.map((c) => new Date(c.competition_date).getTime()))).getFullYear() + 1 : 0;

  // Competition type breakdown
  const tournamentComps = competitions.filter((c) => c.match_type === 'tournament' || c.match_type === 'tournament_team').length;
  const singleMatchComps = competitions.filter((c) => c.match_type === 'single' || c.match_type === 'single_team').length;

  // Status breakdown
  const statusCounts = {
    completed: competitions.filter((c) => c.status === 'completed').length,
    disqualified: competitions.filter((c) => c.status === 'disqualified').length,
    injured: competitions.filter((c) => c.status === 'injured').length,
    withdrew: competitions.filter((c) => c.status === 'withdrew').length,
  };

  // Location diversity
  const uniqueLocations = new Set(competitions.map((c) => `${c.city}, ${c.state}`)).size;

  // Training stats (existing logic)
  const total = sessions.length;
  const formatCounts = FORMATS.reduce((acc, f) => {
    acc[f.key] = sessions.filter((s) => s.format_uniform === f.key).length;
    return acc;
  }, {} as Record<string, number>);

  const categoryCounts = CATEGORY_OPTIONS.reduce((acc, cat) => {
    acc[cat] = sessions.filter((s) => s.category === cat).length;
    return acc;
  }, {} as Record<string, number>);
  const totalCategories = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Stats</CardTitle>
            <CardDescription>Your training and competition statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Stats</CardTitle>
            <CardDescription>Your training and competition statistics</CardDescription>
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
          <CardTitle className="text-3xl font-bold">Stats</CardTitle>
          <CardDescription>Your training and competition statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* XAI Summary Section */}
            {view === 'training' && (
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
                      <Button onClick={() => (window.location.href = '/subscriptions')} variant="default">
                        View Subscription Options
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            {view === 'competitions' && (
              <div className="mb-6">
                {userPlusSubscription ? (
                  <>
                    {xaiCompLoading && <Skeleton className="h-6 w-full mb-2" />}
                    {xaiCompError && <div className="text-red-500 text-sm mb-2">{xaiCompError}</div>}
                    {xaiCompSummary && !xaiCompLoading && !xaiCompError && <AISummary title="Competition Summary & Recommendation:" content={xaiCompSummary} />}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center">
                      <div className="mb-2 text-center">Upgrade to User+ to unlock AI-powered competition summaries and recommendations!</div>
                      <Button onClick={() => (window.location.href = '/subscriptions')} variant="default">
                        View Subscription Options
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            {/* Main View Toggle */}
            <div className="flex gap-2">
              <Button variant={view === 'training' ? 'default' : 'outline'} onClick={() => setView('training')}>
                Training Stats
              </Button>
              <Button variant={view === 'competitions' ? 'default' : 'outline'} onClick={() => setView('competitions')}>
                Competition Stats
              </Button>
            </div>

            {/* Competition Stats View */}
            {view === 'competitions' && (
              <div className="space-y-6">
                {/* Competition Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Competitions */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Competitions</p>
                          <p className="text-3xl font-bold">{totalCompetitions}</p>
                        </div>
                        <Trophy className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Podium Finishes */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Podium Finishes</p>
                          <p className="text-3xl font-bold">{podiumFinishes}</p>
                          <p className="text-xs text-muted-foreground">{goldMedals} Gold</p>
                        </div>
                        <Medal className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Match Victories */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Match Victories</p>
                          <p className="text-3xl font-bold">{matchWins}</p>
                        </div>
                        <Target className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Experience Level */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Experience Level</p>
                          <p className="text-2xl font-bold">{getExperienceLevel(totalCompetitions)}</p>
                          <p className="text-xs text-muted-foreground">{yearsActive} Years Active</p>
                        </div>
                        <Calendar className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bars Section */}
                {totalCompetitions > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Competition Breakdown</h3>

                    {/* Completion Rate */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Completion Rate</span>
                        <span className="text-muted-foreground">
                          {completedCompetitions}/{totalCompetitions} completed
                        </span>
                      </div>
                      <Progress value={completionRate} className="h-4" />
                      <div className="text-xs text-muted-foreground text-right">{completionRate.toFixed(1)}%</div>
                    </div>

                    {/* Competition Types */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Tournament Events</span>
                        <span className="text-muted-foreground">{tournamentComps} tournaments</span>
                      </div>
                      <Progress value={totalCompetitions > 0 ? (tournamentComps / totalCompetitions) * 100 : 0} className="h-4" />
                      <div className="text-xs text-muted-foreground text-right">
                        {totalCompetitions > 0 ? ((tournamentComps / totalCompetitions) * 100).toFixed(1) : 0}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Single Matches</span>
                        <span className="text-muted-foreground">{singleMatchComps} matches</span>
                      </div>
                      <Progress value={totalCompetitions > 0 ? (singleMatchComps / totalCompetitions) * 100 : 0} className="h-4" />
                      <div className="text-xs text-muted-foreground text-right">
                        {totalCompetitions > 0 ? ((singleMatchComps / totalCompetitions) * 100).toFixed(1) : 0}%
                      </div>
                    </div>

                    {/* Status Distribution */}
                    {statusCounts.completed > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Completed Events</span>
                          <span className="text-muted-foreground">{statusCounts.completed} events</span>
                        </div>
                        <Progress value={(statusCounts.completed / totalCompetitions) * 100} className="h-4" />
                        <div className="text-xs text-muted-foreground text-right">{((statusCounts.completed / totalCompetitions) * 100).toFixed(1)}%</div>
                      </div>
                    )}

                    {/* Location Diversity */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Unique Locations</span>
                        <span className="text-muted-foreground">{uniqueLocations} cities</span>
                      </div>
                      <Progress value={Math.min((uniqueLocations / Math.max(totalCompetitions, 1)) * 100, 100)} className="h-4" />
                      <div className="text-xs text-muted-foreground text-right">
                        {Math.min((uniqueLocations / Math.max(totalCompetitions, 1)) * 100, 100).toFixed(1)}% diversity
                      </div>
                    </div>
                  </div>
                )}

                {/* No competitions message */}
                {totalCompetitions === 0 && (
                  <div className="text-center py-12">
                    <Trophy className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No competitions yet</h3>
                    <p className="text-muted-foreground">Start tracking your competition journey</p>
                  </div>
                )}
              </div>
            )}

            {/* Training Stats View */}
            {view === 'training' && (
              <div className="space-y-6">
                {!sessions.length ? (
                  <div className="text-center text-muted-foreground py-8">No training sessions yet.</div>
                ) : (
                  <>
                    {/* Training Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Sessions */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                              <p className="text-3xl font-bold">{total}</p>
                            </div>
                            <Dumbbell className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Favorite Format */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Favorite Format</p>
                              <p className="text-2xl font-bold">{formatCounts['Gi'] >= formatCounts['No-Gi'] ? 'Gi' : 'No-Gi'}</p>
                              <p className="text-xs text-muted-foreground">{Math.max(formatCounts['Gi'] || 0, formatCounts['No-Gi'] || 0)} sessions</p>
                            </div>
                            <Users className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Most Practiced Position */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Top Position</p>
                              <p className="text-lg font-bold">
                                {Object.entries(categoryCounts).reduce((a, b) => (categoryCounts[a[0]] > categoryCounts[b[0]] ? a : b), ['None', 0])[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {Object.entries(categoryCounts).reduce((a, b) => (categoryCounts[a[0]] > categoryCounts[b[0]] ? a : b), ['None', 0])[1]} sessions
                              </p>
                            </div>
                            <Target className="h-8 w-8 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Training Diversity */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Training Diversity</p>
                              <p className="text-3xl font-bold">{Object.values(categoryCounts).filter((count) => count > 0).length}</p>
                              <p className="text-xs text-muted-foreground">Positions Trained</p>
                            </div>
                            <Zap className="h-8 w-8 text-orange-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Training Sub-view Toggle */}
                    <div className="flex gap-2">
                      <Button variant={trainingSubView === 'format' ? 'default' : 'outline'} onClick={() => setTrainingSubView('format')}>
                        Format
                      </Button>
                      <Button variant={trainingSubView === 'category' ? 'default' : 'outline'} onClick={() => setTrainingSubView('category')}>
                        Positions
                      </Button>
                    </div>

                    {/* Format View */}
                    {trainingSubView === 'format' && (
                      <div className="space-y-4">
                        {FORMATS.map((format) => {
                          const count = formatCounts[format.key] || 0;
                          const percent = total ? (count / total) * 100 : 0;

                          return (
                            <div key={format.key} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{format.key}</span>
                                <span className="text-muted-foreground">
                                  {count} session{count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <Progress value={percent} className="h-4" aria-label={`${format.key} progress`} />
                              <div className="text-xs text-muted-foreground text-right">{percent.toFixed(1)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Category View */}
                    {trainingSubView === 'category' && (
                      <div className="space-y-4">
                        {CATEGORY_OPTIONS.map((category) => {
                          const count = categoryCounts[category] || 0;
                          const percent = totalCategories ? (count / totalCategories) * 100 : 0;

                          return (
                            <div key={category} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{category}</span>
                                <span className="text-muted-foreground">
                                  {count} session{count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <Progress value={percent} className="h-4" aria-label={`${category} progress`} />
                              <div className="text-xs text-muted-foreground text-right">{percent.toFixed(1)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
