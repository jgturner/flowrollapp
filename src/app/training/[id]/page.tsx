'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';

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

export default function SingleSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const sessionId = params.id as string;

  useEffect(() => {
    async function fetchSession() {
      if (!user || !sessionId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.from('training_session').select('*').eq('id', sessionId).eq('user_id', user.id).single();

        if (error) {
          setError('Failed to load session');
          console.error('Error fetching session:', error);
        } else {
          setSession(data);
        }
      } catch (err) {
        setError('Failed to load session');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId, user]);

  const handleEdit = () => {
    router.push(`/training/${sessionId}/edit`);
  };

  const handleDelete = async () => {
    if (!sessionId) return;

    setDeleting(true);

    try {
      const { error } = await supabase.from('training_session').delete().eq('id', sessionId);

      if (error) {
        setError('Failed to delete session');
      } else {
        router.push('/training');
      }
    } catch {
      setError('Failed to delete session');
    } finally {
      setDeleting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Training', href: '/training' },
    { label: 'Session Details', isActive: true },
  ];

  if (loading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
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
            <CardTitle className="text-3xl font-bold">Training Session</CardTitle>
            <CardDescription>Session details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">{error}</div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => router.push('/training')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Training
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="w-full mx-auto border-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Training Session</CardTitle>
            <CardDescription>Session not found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">Session not found</div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => router.push('/training')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Training
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
              <CardTitle className="text-3xl font-bold">Training Session Details</CardTitle>
              <CardDescription>Session from {new Date(session.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
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
          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Date</div>
              <div>{new Date(session.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Class Time</div>
              <div>{session.class_time}</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Location</div>
              <div>{session.location}</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Format/Uniform</div>
              <div>{session.format_uniform}</div>
            </div>
          </div>

          {session.category && (
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Category</div>
              <div>{session.category}</div>
            </div>
          )}

          {session.class_summary && (
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Class Summary</div>
              <div className="rounded-md">{session.class_summary}</div>
            </div>
          )}

          {session.notes && (
            <div className="space-y-1">
              <div className="font-semibold text-sm text-muted-foreground">Notes</div>
              <div className="rounded-md">{session.notes}</div>
            </div>
          )}

          {/* Sparring Section */}
          {session.sparring && (
            <div className="space-y-2">
              <div className="font-semibold text-sm text-muted-foreground">Sparring</div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white text-black px-3 py-1 rounded-full text-sm">Rounds: {session.rounds}</span>
                <span className="bg-white text-black px-3 py-1 rounded-full text-sm">Minutes/Round: {session.minutes_per_round}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button variant="outline" onClick={() => router.push('/training')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Training
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <Card className="max-w-sm w-full mx-4">
            <CardHeader>
              <CardTitle>Delete Training Session</CardTitle>
              <CardDescription>Are you sure you want to delete this training session? This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
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
