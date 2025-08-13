'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { convertHeightToMeters, convertWeightToKg } from '@/lib/auth';

export function RegistrationForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: '',
    beltLevel: '' as 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black',
    gender: '' as 'male' | 'female',
    feet: '',
    inches: '',
    weight: '',
  });
  const [date, setDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!date) {
      setError('Please select your date of birth');
      return;
    }

    if (!formData.beltLevel) {
      setError('Please select your belt level');
      return;
    }

    if (!formData.username) {
      setError('Please enter a username');
      return;
    }

    if (!formData.gender) {
      setError('Please select your gender');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError('Username can only contain lowercase letters, numbers, and underscores');
      return;
    }

    const feet = parseInt(formData.feet);
    const inches = parseInt(formData.inches);
    const weightLbs = parseInt(formData.weight);

    if (isNaN(feet) || isNaN(inches) || isNaN(weightLbs)) {
      setError('Please enter valid height and weight values');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        beltLevel: formData.beltLevel,
        gender: formData.gender,
        height: convertHeightToMeters(feet, inches),
        weight: convertWeightToKg(weightLbs),
        dateOfBirth: format(date, 'yyyy-MM-dd'),
      });
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Enter your information below to create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Email */}
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Username */}
              <div className="grid gap-3">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe123"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Username can only contain lowercase letters, numbers, and underscores</p>
              </div>

              {/* Belt Level */}
              <div className="grid gap-3">
                <Label htmlFor="beltLevel">Belt Level</Label>
                <Select value={formData.beltLevel} onValueChange={(value) => handleInputChange('beltLevel', value)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your belt level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="White">White</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Purple">Purple</SelectItem>
                    <SelectItem value="Brown">Brown</SelectItem>
                    <SelectItem value="Black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gender */}
              <div className="grid gap-3">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Height */}
              <div className="grid gap-3">
                <Label>Height</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="feet" className="text-sm text-muted-foreground">
                      Feet
                    </Label>
                    <Input
                      id="feet"
                      type="number"
                      placeholder="5"
                      min="3"
                      max="8"
                      value={formData.feet}
                      onChange={(e) => handleInputChange('feet', e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inches" className="text-sm text-muted-foreground">
                      Inches
                    </Label>
                    <Input
                      id="inches"
                      type="number"
                      placeholder="10"
                      min="0"
                      max="11"
                      value={formData.inches}
                      onChange={(e) => handleInputChange('inches', e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Weight */}
              <div className="grid gap-3">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="160"
                  min="50"
                  max="500"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Date of Birth */}
              <div className="grid gap-3">
                <Label>Date of Birth</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={'outline'} className={cn('justify-start text-left font-normal', !date && 'text-muted-foreground')} disabled={isLoading}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Password */}
              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Confirm Password */}
              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <a href="/login" className="underline underline-offset-4">
                Sign in
              </a>
            </div>
            <div className="mt-2 text-center text-sm">
              <a href="/feed" className="text-primary underline underline-offset-4 hover:text-primary/80">
                View Demo Dashboard
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
