'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Swords, Upload, Plus, X } from 'lucide-react';
import { CalendarIcon } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DashboardLayout } from '@/components/dashboard-layout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { RulesSetSelect } from '@/components/ui/rules-set-select';

interface EventFormData {
  title: string;
  description: string;
  image_url: string;
  venue: string;
  address: string;
  city: string;
  province: string;
  country: string;
  event_date: Date | null;
  event_type: 'tournament' | 'match';
  registration_url: string;
  log_withdrawals: boolean;
  allow_open_requests: boolean;
  rules_set: string;
  no_time_limit: boolean;
  rules_apply_to_all_matches: boolean;
  match_format: 'gi' | 'no_gi' | 'both';
  event_sub_only: boolean;
}

interface Match {
  id: string;
  weight_limit: string;
  weight_limit_kg: string;
  weight_limit_lbs: string;
  belt_level: string;
  age_category: string;
  match_format: string;
  time_limit: string;
  gender: string;
  sub_only: boolean;
  custom_rules: string;
  rules_set: string;
  no_time_limit: boolean;
  use_event_rules: boolean;
}

const BELT_LEVELS = ['White', 'Blue', 'Purple', 'Brown', 'Black'];
const AGE_CATEGORIES = [
  { value: 'kids', label: 'Kids' },
  { value: 'normal', label: 'Adult' },
  { value: 'masters', label: 'Masters' },
];
const MATCH_FORMATS = [
  { value: 'gi', label: 'Gi' },
  { value: 'no_gi', label: 'No-Gi' },
  { value: 'both', label: 'Both' },
];

export default function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [eventData, setEventData] = useState<EventFormData>({
    title: '',
    description: '',
    image_url: '',
    venue: '',
    address: '',
    city: '',
    province: '',
    country: 'United States',
    event_date: null,
    event_type: 'tournament',
    registration_url: '',
    log_withdrawals: true,
    allow_open_requests: true,
    rules_set: '',
    no_time_limit: false,
    rules_apply_to_all_matches: true,
    match_format: 'gi',
    event_sub_only: false,
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleInputChange = (field: keyof EventFormData, value: string | boolean | Date | null) => {
    setEventData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, eventImage: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, eventImage: 'File size must be less than 5MB' });
      return;
    }

    setEventImage(file);

    // Create optimized preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img') as HTMLImageElement;
      img.onload = () => {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        // Resize for preview (max 400px width to reduce base64 size)
        const maxWidth = 400;
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setEventImagePreview(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Clear any previous errors
    const newErrors = { ...errors };
    delete newErrors.eventImage;
    setErrors(newErrors);
  };

  const removeImage = () => {
    setEventImage(null);
    setEventImagePreview(null);
    // Clear both file inputs
    const tournamentInput = document.getElementById('tournament-image') as HTMLInputElement;
    const matchInput = document.getElementById('match-image') as HTMLInputElement;
    if (tournamentInput) tournamentInput.value = '';
    if (matchInput) matchInput.value = '';
  };

  // Upload image to Supabase storage - SIMPLIFIED VERSION
  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('event-images').upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('event-images').getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const addMatch = () => {
    const newMatch: Match = {
      id: Date.now().toString(),
      weight_limit: '',
      weight_limit_kg: '',
      weight_limit_lbs: '',
      belt_level: '',
      age_category: 'normal',
      match_format: eventData.match_format,
      time_limit: '',
      gender: '',
      sub_only: eventData.event_sub_only,
      custom_rules: '',
      rules_set: eventData.rules_set,
      no_time_limit: eventData.no_time_limit,
      use_event_rules: eventData.rules_apply_to_all_matches,
    };
    setMatches((prev) => [...prev, newMatch]);
  };

  const updateMatch = (id: string, field: keyof Match, value: string | boolean) => {
    setMatches((prev) => prev.map((match) => (match.id === id ? { ...match, [field]: value } : match)));
  };

  const removeMatch = (id: string) => {
    setMatches((prev) => prev.filter((match) => match.id !== id));
  };

  const handleEventRulesChange = (field: keyof EventFormData, value: string | boolean) => {
    setEventData((prev) => ({ ...prev, [field]: value }));
    if (field === 'rules_apply_to_all_matches' && value) {
      // When enabling event-level rules, update all matches to use event rules
      setMatches((prev) => prev.map((m) => ({ ...m, use_event_rules: true })));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!eventData.title.trim()) newErrors.title = 'Event title is required';
    if (!eventData.venue.trim()) newErrors.venue = 'Venue is required';
    if (!eventData.city.trim()) newErrors.city = 'City is required';
    if (!eventData.province.trim()) newErrors.province = 'Province/State is required';
    if (!eventData.country.trim()) newErrors.country = 'Country is required';
    if (!eventData.event_date) newErrors.event_date = 'Event date is required';

    if (eventData.event_type === 'tournament') {
      if (!eventData.registration_url.trim()) {
        newErrors.registration_url = 'Registration URL is required for tournaments';
      }
    }

    if (eventData.event_type === 'match') {
      if (matches.length === 0) {
        newErrors.matches = 'At least one match is required for match events';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setLoading(true);

    try {
      // Upload image if provided
      let imageUrl = null;
      if (eventImage) {
        imageUrl = await uploadImageToStorage(eventImage);
        if (!imageUrl) {
          setErrors({ submit: 'Failed to upload event image' });
          setLoading(false);
          return;
        }
      }

      // Create event
      const { data: eventResult, error: eventError } = await supabase
        .from('events')
        .insert([
          {
            user_id: user.id,
            event_type: eventData.event_type,
            title: eventData.title,
            description: eventData.description,
            image_url: imageUrl,
            venue: eventData.venue,
            address: eventData.address,
            city: eventData.city,
            province: eventData.province,
            country: eventData.country,
            event_date: eventData.event_date?.toISOString(),
            registration_url: eventData.registration_url || null,
            log_withdrawals: eventData.log_withdrawals,
            allow_open_requests: eventData.allow_open_requests,
            rules_set: eventData.rules_set || null,
            no_time_limit: eventData.no_time_limit,
            rules_apply_to_all_matches: eventData.rules_apply_to_all_matches,
            match_format: eventData.match_format,
            event_sub_only: eventData.event_sub_only,
          },
        ])
        .select()
        .single();

      if (eventError) throw eventError;

      // Create matches for match events
      if (eventData.event_type === 'match' && matches.length > 0) {
        const matchData = matches.map((match) => ({
          event_id: eventResult.id,
          weight_limit_kg: match.weight_limit_kg ? parseFloat(match.weight_limit_kg) : null,
          weight_limit_lbs: match.weight_limit_lbs ? parseFloat(match.weight_limit_lbs) : null,
          belt_level: match.belt_level || null,
          age_category: match.age_category,
          time_limit: match.time_limit ? parseInt(match.time_limit) : null,
          gender: match.gender || null,
          sub_only: match.sub_only,
          custom_rules: match.custom_rules || null,
          rules_set: eventData.rules_apply_to_all_matches && match.use_event_rules ? eventData.rules_set : match.rules_set,
          no_time_limit: eventData.rules_apply_to_all_matches && match.use_event_rules ? eventData.no_time_limit : match.no_time_limit,
          match_format: eventData.rules_apply_to_all_matches && match.use_event_rules ? eventData.match_format : match.match_format,
          use_event_rules: match.use_event_rules,
        }));

        const { error: matchError } = await supabase.from('event_matches').insert(matchData);

        if (matchError) throw matchError;
      }

      router.push('/events');
    } catch (error) {
      console.error('Error creating event:', error);
      setErrors({ submit: 'Failed to create event. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/feed' },
    { label: 'Events', href: '/events' },
    { label: 'Create Event', isActive: true },
  ];

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Create New Event</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Type Tabs */}
              <Tabs value={eventData.event_type} onValueChange={(value) => handleInputChange('event_type', value as 'tournament' | 'match')}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="tournament" className="data-[state=active]:bg-white data-[state=active]:text-black">
                    <Trophy className="h-4 w-4 mr-2" />
                    Tournament
                  </TabsTrigger>
                  <TabsTrigger value="match" className="data-[state=active]:bg-white data-[state=active]:text-black">
                    <Swords className="h-4 w-4 mr-2" />
                    Match
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tournament" className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title" className="mb-2 block">
                        Event Title
                      </Label>
                      <Input id="title" value={eventData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="Enter event title" />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                    </div>

                    <div>
                      <Label htmlFor="event-date" className="mb-2 block">
                        Event Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !eventData.event_date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {eventData.event_date ? formatDate(eventData.event_date, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={eventData.event_date || undefined}
                            onSelect={(date) => handleInputChange('event_date', date || null)}
                            captionLayout="dropdown"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.event_date && <p className="text-red-500 text-sm mt-1">{errors.event_date}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-2 block">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={eventData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter event description"
                      rows={3}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="venue" className="mb-2 block">
                        Venue
                      </Label>
                      <Input id="venue" value={eventData.venue} onChange={(e) => handleInputChange('venue', e.target.value)} placeholder="Enter venue name" />
                      {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
                    </div>

                    <div>
                      <Label htmlFor="address" className="mb-2 block">
                        Address
                      </Label>
                      <Input id="address" value={eventData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="Enter venue address" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="mb-2 block">
                        City
                      </Label>
                      <Input id="city" value={eventData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="Enter city" />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <Label htmlFor="province" className="mb-2 block">
                        Province/State
                      </Label>
                      <Input
                        id="province"
                        value={eventData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        placeholder="Enter province/state"
                      />
                      {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province}</p>}
                    </div>

                    <div>
                      <Label htmlFor="country" className="mb-2 block">
                        Country
                      </Label>
                      <Input id="country" value={eventData.country} onChange={(e) => handleInputChange('country', e.target.value)} placeholder="Enter country" />
                      {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                    </div>
                  </div>

                  {/* Event Image Upload */}
                  <div>
                    <Label htmlFor="tournament-image" className="mb-2 block">
                      Event Image
                    </Label>
                    <div className="space-y-4">
                      {eventImagePreview ? (
                        <div className="relative w-full max-w-md">
                          <Image src={eventImagePreview} alt="Event image preview" width={400} height={300} className="rounded-lg object-cover" />
                          <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={removeImage}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <label htmlFor="tournament-image" className="cursor-pointer">
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-500">Click to upload an image</span>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                          </label>
                          <input id="tournament-image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </div>
                      )}
                    </div>
                    {errors.eventImage && <p className="text-red-500 text-sm mt-1">{errors.eventImage}</p>}
                  </div>

                  {/* Registration URL */}
                  <div>
                    <Label htmlFor="registration_url" className="mb-2 block">
                      Registration URL
                    </Label>
                    <Input
                      id="registration_url"
                      value={eventData.registration_url}
                      onChange={(e) => handleInputChange('registration_url', e.target.value)}
                      placeholder="https://smoothcomp.com/..."
                    />
                    {errors.registration_url && <p className="text-red-500 text-sm mt-1">{errors.registration_url}</p>}
                  </div>
                </TabsContent>

                <TabsContent value="match" className="space-y-4">
                  {/* Same basic info fields for match events */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title" className="mb-2 block">
                        Event Title
                      </Label>
                      <Input id="title" value={eventData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="Enter event title" />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                    </div>

                    <div>
                      <Label htmlFor="event-date" className="mb-2 block">
                        Event Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !eventData.event_date && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {eventData.event_date ? formatDate(eventData.event_date, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={eventData.event_date || undefined}
                            onSelect={(date) => handleInputChange('event_date', date || null)}
                            captionLayout="dropdown"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.event_date && <p className="text-red-500 text-sm mt-1">{errors.event_date}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-2 block">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={eventData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter event description"
                      rows={3}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="venue" className="mb-2 block">
                        Venue
                      </Label>
                      <Input id="venue" value={eventData.venue} onChange={(e) => handleInputChange('venue', e.target.value)} placeholder="Enter venue name" />
                      {errors.venue && <p className="text-red-500 text-sm mt-1">{errors.venue}</p>}
                    </div>

                    <div>
                      <Label htmlFor="address" className="mb-2 block">
                        Address
                      </Label>
                      <Input id="address" value={eventData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="Enter venue address" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="mb-2 block">
                        City
                      </Label>
                      <Input id="city" value={eventData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="Enter city" />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <Label htmlFor="province" className="mb-2 block">
                        Province/State
                      </Label>
                      <Input
                        id="province"
                        value={eventData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        placeholder="Enter province/state"
                      />
                      {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province}</p>}
                    </div>

                    <div>
                      <Label htmlFor="country" className="mb-2 block">
                        Country
                      </Label>
                      <Input id="country" value={eventData.country} onChange={(e) => handleInputChange('country', e.target.value)} placeholder="Enter country" />
                      {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                    </div>
                  </div>

                  {/* Event Image Upload */}
                  <div>
                    <Label htmlFor="match-image" className="mb-2 block">
                      Event Image
                    </Label>
                    <div className="space-y-4">
                      {eventImagePreview ? (
                        <div className="relative w-full max-w-md">
                          <Image src={eventImagePreview} alt="Event image preview" width={400} height={300} className="rounded-lg object-cover" />
                          <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={removeImage}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <label htmlFor="match-image" className="cursor-pointer">
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-500">Click to upload an image</span>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                          </label>
                          <input id="match-image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </div>
                      )}
                    </div>
                    {errors.eventImage && <p className="text-red-500 text-sm mt-1">{errors.eventImage}</p>}
                  </div>

                  {/* Match Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Match Configuration</h3>
                      <Button type="button" onClick={addMatch} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Match
                      </Button>
                    </div>

                    {matches.map((match, index) => (
                      <Card key={match.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Match {index + 1}</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeMatch(match.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2 mb-4">
                          <Switch
                            id={`use-event-rules-${match.id}`}
                            checked={match.use_event_rules}
                            onCheckedChange={(checked) => updateMatch(match.id, 'use_event_rules', checked)}
                          />
                          <Label htmlFor={`use-event-rules-${match.id}`}>Use event rules</Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="mb-2 block">Weight Limit (lbs)</Label>
                            <Input
                              value={match.weight_limit}
                              onChange={(e) => updateMatch(match.id, 'weight_limit', e.target.value)}
                              placeholder="e.g., 170"
                              type="number"
                            />
                          </div>

                          <div>
                            <Label className="mb-2 block">Belt Level</Label>
                            <Select value={match.belt_level} onValueChange={(value) => updateMatch(match.id, 'belt_level', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select belt level" />
                              </SelectTrigger>
                              <SelectContent>
                                {BELT_LEVELS.map((belt) => (
                                  <SelectItem key={belt} value={belt}>
                                    {belt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="mb-2 block">Age Category</Label>
                            <Select value={match.age_category} onValueChange={(value) => updateMatch(match.id, 'age_category', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AGE_CATEGORIES.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="mb-2 block">Gender</Label>
                            <Select value={match.gender} onValueChange={(value) => updateMatch(match.id, 'gender', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Only show rules fields if not using event rules */}
                        {(!eventData.rules_apply_to_all_matches || !match.use_event_rules) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <RulesSetSelect value={match.rules_set} onChange={(value) => updateMatch(match.id, 'rules_set', value)} label="Rules Set" />
                            <div>
                              <Label className="mb-2 block">Format</Label>
                              <Select value={match.match_format} onValueChange={(value) => updateMatch(match.id, 'match_format', value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MATCH_FORMATS.map((format) => (
                                    <SelectItem key={format.value} value={format.value}>
                                      {format.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {!match.no_time_limit && (
                              <div className="mt-4 ">
                                <Label className="mb-2 block">Time Limit (minutes)</Label>
                                <Input
                                  value={match.time_limit}
                                  onChange={(e) => updateMatch(match.id, 'time_limit', e.target.value)}
                                  placeholder="e.g., 6"
                                  type="number"
                                />
                              </div>
                            )}
                            {/* Toggles must be outside the grid and time limit input */}
                            <div className="flex items-center space-x-6 mt-4">
                              <div className="flex items-center space-x-2">
                                <Switch id={`sub-only-${match.id}`} checked={match.sub_only} onCheckedChange={(checked) => updateMatch(match.id, 'sub_only', checked)} />
                                <Label htmlFor={`sub-only-${match.id}`}>Submission Only</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id={`no-time-limit-${match.id}`}
                                  checked={match.no_time_limit}
                                  onCheckedChange={(checked) => updateMatch(match.id, 'no_time_limit', checked)}
                                />
                                <Label htmlFor={`no-time-limit-${match.id}`}>No Time Limit</Label>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}

                    {errors.matches && <p className="text-red-500 text-sm">{errors.matches}</p>}
                  </div>

                  {/* Event Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Event Settings</h3>
                    <div className="flex items-center space-x-4">
                      <Switch
                        id="rules_apply_to_all_matches"
                        checked={eventData.rules_apply_to_all_matches}
                        onCheckedChange={(checked) => handleEventRulesChange('rules_apply_to_all_matches', checked)}
                      />
                      <Label htmlFor="rules_apply_to_all_matches">Rules apply to all matches</Label>
                    </div>
                    {eventData.rules_apply_to_all_matches && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RulesSetSelect value={eventData.rules_set} onChange={(value) => handleEventRulesChange('rules_set', value)} label="Rules Set" />
                        <div>
                          <Label className="mb-2 block">Format</Label>
                          <Select value={eventData.match_format} onValueChange={(value) => handleEventRulesChange('match_format', value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MATCH_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {!eventData.no_time_limit && (
                          <div className="mt-4">
                            <Label className="mb-2 block">Time Limit (minutes)</Label>
                            <Input
                              value={matches[0]?.time_limit || ''}
                              onChange={(e) => setMatches((prev) => prev.map((m, i) => (i === 0 ? { ...m, time_limit: e.target.value } : m)))}
                              placeholder="e.g., 6"
                              type="number"
                            />
                          </div>
                        )}
                        {/* Toggles must be outside the grid and time limit input */}
                        <div className="flex items-center space-x-6 mt-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="event_sub_only"
                              checked={eventData.event_sub_only}
                              onCheckedChange={(checked) => handleEventRulesChange('event_sub_only', checked)}
                            />
                            <Label htmlFor="event_sub_only">Submission Only</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="event_no_time_limit"
                              checked={eventData.no_time_limit}
                              onCheckedChange={(checked) => handleEventRulesChange('no_time_limit', checked)}
                            />
                            <Label htmlFor="event_no_time_limit">No Time Limit</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push('/events')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || uploadingImage}>
                  {loading ? 'Creating...' : 'Create Event'}
                </Button>
              </div>

              {errors.submit && <p className="text-red-500 text-sm mt-2">{errors.submit}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
