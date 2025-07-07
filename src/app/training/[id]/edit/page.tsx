'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';

const HOURS = [...Array.from({ length: 12 }, (_, i) => i + 1)];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const FORMATS = [
  { value: 'Gi', label: 'Gi' },
  { value: 'No-Gi', label: 'No-Gi' },
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

export default function EditTrainingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [hour, setHour] = useState('7');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('PM');
  const [locationName, setLocationName] = useState('');
  const [format, setFormat] = useState('');
  const [category, setCategory] = useState('');
  const [classSummary, setClassSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [sparring, setSparring] = useState(false);
  const [rounds, setRounds] = useState('');
  const [minutesPerRound, setMinutesPerRound] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load existing session data
  useEffect(() => {
    async function fetchSession() {
      if (!user || !sessionId) return;

      setInitialLoading(true);
      setFetchError(null);

      try {
        const { data, error } = await supabase.from('training_session').select('*').eq('id', sessionId).eq('user_id', user.id).single();

        if (error) {
          setFetchError('Failed to load session');
          console.error('Error fetching session:', error);
        } else {
          // Populate form with existing data
          setDate(new Date(data.date));
          const timeParts = data.class_time.split(' ');
          const [hourPart, minutePart] = timeParts[0].split(':');
          setHour(hourPart);
          setMinute(minutePart);
          setAmpm(timeParts[1] || 'PM');
          setLocationName(data.location);
          setFormat(data.format_uniform);
          setCategory(data.category);
          setClassSummary(data.class_summary || '');
          setNotes(data.notes || '');
          setSparring(data.sparring);
          setRounds(data.rounds?.toString() || '');
          setMinutesPerRound(data.minutes_per_round?.toString() || '');
        }
      } catch {
        setFetchError('Failed to load session');
      } finally {
        setInitialLoading(false);
      }
    }

    fetchSession();
  }, [sessionId, user]);

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required.';
    if (!hour || !minute || !ampm) newErrors.class_time = 'Class time is required.';
    if (!locationName) newErrors.location = 'Location is required.';
    if (!format) newErrors.format = 'Please select a Format/Uniform.';
    if (!category) newErrors.category = 'Please select a Category.';
    if (classSummary.length > 500) newErrors.classSummary = 'Class summary must be 500 characters or less.';
    if (notes.length > 500) newErrors.notes = 'Notes must be 500 characters or less.';
    if (sparring) {
      if (!rounds) newErrors.rounds = 'Rounds is required when sparring is enabled.';
      if (!minutesPerRound) newErrors.minutesPerRound = 'Minutes per round is required when sparring is enabled.';
      if (rounds && (Number(rounds) < 1 || Number(rounds) > 10)) newErrors.rounds = 'Rounds must be between 1 and 10.';
      if (minutesPerRound && (Number(minutesPerRound) < 1 || Number(minutesPerRound) > 10)) {
        newErrors.minutesPerRound = 'Minutes per round must be between 1 and 10.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user || !sessionId) return;

    setLoading(true);
    const class_time = `${hour}:${minute} ${ampm}`;
    const sessionData = {
      date: date.toISOString().split('T')[0],
      class_time,
      location: locationName,
      format_uniform: format,
      category,
      class_summary: classSummary,
      notes,
      sparring,
      rounds: sparring ? Number(rounds) : null,
      minutes_per_round: sparring ? Number(minutesPerRound) : null,
    };

    try {
      const { error } = await supabase.from('training_session').update(sessionData).eq('id', sessionId).eq('user_id', user.id);

      if (error) {
        setErrors({ submit: error.message });
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/training/${sessionId}`);
        }, 1200);
      }
    } catch {
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Training', href: '/training' },
    { label: 'Session Details', href: `/training/${sessionId}` },
    { label: 'Edit', isActive: true },
  ];

  if (initialLoading) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="w-full mx-auto border-none">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (fetchError) {
    return (
      <DashboardLayout breadcrumbs={breadcrumbs}>
        <Card className="w-full mx-auto border-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Edit Training Session</CardTitle>
            <CardDescription>Update your training session details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">{fetchError}</div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => router.push('/training')}>
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
          <CardTitle className="text-3xl font-bold">Edit Training Session</CardTitle>
          <CardDescription>Update your training session details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Training session form">
            {/* Date and Class Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">
                  Date<span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? formatDate(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 ">
                    <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} captionLayout="dropdown" initialFocus />
                  </PopoverContent>
                </Popover>
                {errors.date && <div className="text-red-500 text-sm">{errors.date}</div>}
              </div>

              <div className="space-y-2">
                <Label>
                  Class Time<span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={hour} onValueChange={setHour}>
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={h.toString()}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="self-center">:</span>
                  <Select value={minute} onValueChange={setMinute}>
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={ampm} onValueChange={setAmpm}>
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.class_time && <div className="text-red-500 text-sm">{errors.class_time}</div>}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                Location<span className="text-red-500">*</span>
              </Label>
              <Input id="location" type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
              {errors.location && <div className="text-red-500 text-sm">{errors.location}</div>}
            </div>

            {/* Format/Uniform and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format">
                  Format/Uniform<span className="text-red-500">*</span>
                </Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.format && <div className="text-red-500 text-sm">{errors.format}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category<span className="text-red-500">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <div className="text-red-500 text-sm">{errors.category}</div>}
              </div>
            </div>

            {/* Class Summary */}
            <div className="space-y-2">
              <Label htmlFor="classSummary">Class Summary</Label>
              <textarea
                id="classSummary"
                className="w-full p-2 border border-border rounded-md resize-none bg-background"
                value={classSummary}
                onChange={(e) => setClassSummary(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <div className="text-xs text-muted-foreground">{classSummary.length}/500</div>
              {errors.classSummary && <div className="text-red-500 text-sm">{errors.classSummary}</div>}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="w-full p-2 border border-border rounded-md resize-none bg-background"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <div className="text-xs text-muted-foreground">{notes.length}/500</div>
              {errors.notes && <div className="text-red-500 text-sm">{errors.notes}</div>}
            </div>

            {/* Sparring */}
            <div className="flex items-center space-x-2">
              <input id="sparring" type="checkbox" checked={sparring} onChange={(e) => setSparring(e.target.checked)} className="rounded border-border" />
              <Label htmlFor="sparring" className="font-medium">
                Sparring
              </Label>
            </div>

            {/* Rounds and Minutes per Round (conditional) */}
            {sparring && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rounds">
                    Rounds<span className="text-red-500">*</span>
                  </Label>
                  <Input id="rounds" type="number" min={1} max={10} value={rounds} onChange={(e) => setRounds(e.target.value)} required={sparring} />
                  {errors.rounds && <div className="text-red-500 text-sm">{errors.rounds}</div>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minutesPerRound">
                    Minutes per Round<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="minutesPerRound"
                    type="number"
                    min={1}
                    max={10}
                    value={minutesPerRound}
                    onChange={(e) => setMinutesPerRound(e.target.value)}
                    required={sparring}
                  />
                  {errors.minutesPerRound && <div className="text-red-500 text-sm">{errors.minutesPerRound}</div>}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating Session...' : 'Update Session'}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/training/${sessionId}`)}>
                Cancel
              </Button>
            </div>

            {errors.submit && <div className="text-red-500 text-sm text-center">{errors.submit}</div>}
            {success && <div className="text-green-600 text-center">Training session updated successfully!</div>}
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
