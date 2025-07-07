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
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'injured', label: 'Injured' },
  { value: 'withdrew', label: 'Withdrew' },
];

const MATCH_TYPE_OPTIONS = [
  { value: 'single', label: 'Single Match' },
  { value: 'single_team', label: 'Single Team Event' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'tournament_team', label: 'Tournament Team Event' },
];

const RESULT_OPTIONS = [
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
];

const PLACEMENT_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: (i + 1).toString(),
  label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`,
}));

export default function EditCompetitionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const competitionId = params.id as string;

  // Form state
  const [competitionDate, setCompetitionDate] = useState<Date>(new Date());
  const [eventName, setEventName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [placement, setPlacement] = useState('');
  const [result, setResult] = useState('');
  const [status, setStatus] = useState('');
  const [matchType, setMatchType] = useState('');
  const [podiumPhoto, setPodiumPhoto] = useState<File | null>(null);
  const [podiumPhotoPreview, setPodiumPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load existing competition data
  useEffect(() => {
    async function fetchCompetition() {
      if (!user || !competitionId) return;

      setInitialLoading(true);
      setFetchError(null);

      try {
        const { data, error } = await supabase.from('competitions').select('*').eq('id', competitionId).eq('user_id', user.id).single();

        if (error) {
          setFetchError('Failed to load competition');
          console.error('Error fetching competition:', error);
        } else {
          // Populate form with existing data
          setCompetitionDate(new Date(data.competition_date));
          setEventName(data.event_name);
          setCity(data.city);
          setState(data.state);
          setCountry(data.country || '');
          setPlacement(data.placement?.toString() || '');
          setResult(data.result || '');
          setStatus(data.status);
          setMatchType(data.match_type);
          if (data.podium_photo_url) {
            setExistingPhotoUrl(data.podium_photo_url);
          }
        }
      } catch {
        setFetchError('Failed to load competition');
      } finally {
        setInitialLoading(false);
      }
    }

    fetchCompetition();
  }, [competitionId, user]);

  // Handle image upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, podiumPhoto: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, podiumPhoto: 'File size must be less than 5MB' });
      return;
    }

    setPodiumPhoto(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPodiumPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Clear any previous errors
    const newErrors = { ...errors };
    delete newErrors.podiumPhoto;
    setErrors(newErrors);
  };

  const removePhoto = () => {
    setPodiumPhoto(null);
    setPodiumPhotoPreview(null);
    setExistingPhotoUrl(null);
    // Clear file input
    const fileInput = document.getElementById('podium-photo') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Upload photo to Supabase storage
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    setUploadingPhoto(true);
    try {
      // Delete existing photo if it exists
      if (existingPhotoUrl) {
        const fileName = existingPhotoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage.from('podium-photos').remove([`${user.id}/${fileName}`]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('podium-photos').upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('podium-photos').getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!competitionDate) newErrors.competitionDate = 'Competition date is required.';
    if (!eventName.trim()) newErrors.eventName = 'Event name is required.';
    if (!city.trim()) newErrors.city = 'City/Town is required.';
    if (!state.trim()) newErrors.state = 'State/Province/Region is required.';
    if (!country.trim()) newErrors.country = 'Country is required.';
    if (!status) newErrors.status = 'Status is required.';
    if (!matchType) newErrors.matchType = 'Match type is required.';

    // Validate field lengths
    if (eventName.length > 100) newErrors.eventName = 'Event name must be 100 characters or less.';
    if (city.length > 50) newErrors.city = 'City/Town must be 50 characters or less.';
    if (state.length > 50) newErrors.state = 'State/Province/Region must be 50 characters or less.';
    if (country.length > 50) newErrors.country = 'Country must be 50 characters or less.';

    // Validate placement/result based on match type and status
    if (status === 'completed') {
      if (matchType === 'tournament' || matchType === 'tournament_team') {
        if (!placement) {
          newErrors.placement = 'Placement is required for tournament competitions.';
        }
      } else if (matchType === 'single' || matchType === 'single_team') {
        if (!result) {
          newErrors.result = 'Result (Win/Loss) is required for single matches and team events.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user || !competitionId) return;

    setLoading(true);

    try {
      // Upload new photo if provided
      let podiumPhotoUrl = existingPhotoUrl;
      if (podiumPhoto) {
        const uploadedUrl = await uploadPhotoToStorage(podiumPhoto);
        if (!uploadedUrl) {
          setErrors({ submit: 'Failed to upload podium photo' });
          setLoading(false);
          return;
        }
        podiumPhotoUrl = uploadedUrl;
      }

      const competitionData = {
        event_name: eventName.trim(),
        competition_date: competitionDate.toISOString().split('T')[0],
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        placement: (matchType === 'tournament' || matchType === 'tournament_team') && placement ? parseInt(placement) : null,
        result: (matchType === 'single' || matchType === 'single_team') && result ? result : null,
        status,
        match_type: matchType,
        podium_photo_url: podiumPhotoUrl,
      };

      const { error } = await supabase.from('competitions').update(competitionData).eq('id', competitionId).eq('user_id', user.id);

      if (error) {
        setErrors({ submit: error.message });
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/competitions/${competitionId}`);
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
    { label: 'Competitions', href: '/competitions' },
    { label: 'Competition Details', href: `/competitions/${competitionId}` },
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
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
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
            <CardTitle className="text-3xl font-bold">Edit Competition</CardTitle>
            <CardDescription>Update competition details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">{fetchError}</div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => router.push('/competitions')}>
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
          <CardTitle className="text-3xl font-bold">Edit Competition</CardTitle>
          <CardDescription>Update your competition details and results</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Edit competition form">
            {/* Competition Date and Event Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="competition-date">
                  Competition Date<span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !competitionDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {competitionDate ? formatDate(competitionDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={competitionDate} onSelect={(date) => date && setCompetitionDate(date)} captionLayout="dropdown" initialFocus />
                  </PopoverContent>
                </Popover>
                {errors.competitionDate && <div className="text-red-500 text-sm">{errors.competitionDate}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-name">
                  Event Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event-name"
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., IBJJF World Championships"
                  maxLength={100}
                />
                {errors.eventName && <div className="text-red-500 text-sm">{errors.eventName}</div>}
              </div>
            </div>

            {/* City, State, and Country */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City/Town<span className="text-red-500">*</span>
                </Label>
                <Input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Las Vegas" maxLength={50} />
                {errors.city && <div className="text-red-500 text-sm">{errors.city}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">
                  State/Province/Region<span className="text-red-500">*</span>
                </Label>
                <Input id="state" type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g., Nevada" maxLength={50} />
                {errors.state && <div className="text-red-500 text-sm">{errors.state}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">
                  Country<span className="text-red-500">*</span>
                </Label>
                <Input id="country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., United States" maxLength={50} />
                {errors.country && <div className="text-red-500 text-sm">{errors.country}</div>}
              </div>
            </div>

            {/* Status and Match Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">
                  Status<span className="text-red-500">*</span>
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <div className="text-red-500 text-sm">{errors.status}</div>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="match-type">
                  Match Type<span className="text-red-500">*</span>
                </Label>
                <Select value={matchType} onValueChange={setMatchType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select match type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.matchType && <div className="text-red-500 text-sm">{errors.matchType}</div>}
              </div>
            </div>

            {/* Placement/Result (conditional based on match type) */}
            {status === 'completed' && (matchType === 'tournament' || matchType === 'tournament_team') && (
              <div className="space-y-2">
                <Label htmlFor="placement">
                  Placement<span className="text-red-500">*</span>
                </Label>
                <Select value={placement} onValueChange={setPlacement}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Select placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.placement && <div className="text-red-500 text-sm">{errors.placement}</div>}
              </div>
            )}

            {/* Result (Win/Loss) for single matches and team events */}
            {status === 'completed' && (matchType === 'single' || matchType === 'single_team') && (
              <div className="space-y-2">
                <Label htmlFor="result">
                  Result<span className="text-red-500">*</span>
                </Label>
                <Select value={result} onValueChange={setResult}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Select result" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.result && <div className="text-red-500 text-sm">{errors.result}</div>}
              </div>
            )}

            {/* Podium Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="podium-photo">Podium Photo</Label>
              <div className="space-y-4">
                {podiumPhotoPreview || existingPhotoUrl ? (
                  <div className="relative w-full max-w-md">
                    <Image src={podiumPhotoPreview || existingPhotoUrl || ''} alt="Podium photo preview" width={400} height={300} className="rounded-lg object-cover" />
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={removePhoto}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <label htmlFor="podium-photo" className="cursor-pointer">
                      <span className="text-sm font-medium text-blue-600 hover:text-blue-500">Click to upload a photo</span>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                    </label>
                    <input id="podium-photo" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </div>
                )}
              </div>
              {errors.podiumPhoto && <div className="text-red-500 text-sm">{errors.podiumPhoto}</div>}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push(`/competitions/${competitionId}`)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploadingPhoto} className="min-w-32">
                {loading ? 'Updating...' : success ? 'Updated!' : 'Update Competition'}
              </Button>
            </div>

            {/* Error Messages */}
            {errors.submit && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded">{errors.submit}</div>}

            {/* Success Message */}
            {success && <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded">Competition updated successfully! Redirecting...</div>}
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
