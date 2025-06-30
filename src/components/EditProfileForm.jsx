import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../utils/supabaseClient';

const BELT_OPTIONS = ['White', 'Blue', 'Purple', 'Brown', 'Black'];

export default function EditProfileForm({ initialProfileData, user, onClose, onSuccess }) {
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      first_name: initialProfileData.first_name || '',
      last_name: initialProfileData.last_name || '',
      belt_level: initialProfileData.belt_level || '',
      instagram_url: initialProfileData.instagram_url || '',
      x_url: initialProfileData.x_url || '',
      facebook_url: initialProfileData.facebook_url || '',
      tiktok_url: initialProfileData.tiktok_url || '',
      youtube_url: initialProfileData.youtube_url || '',
      website_url: initialProfileData.website_url || '',
      public_show_training_logs: initialProfileData.public_show_training_logs ?? true,
      public_show_stats: initialProfileData.public_show_stats ?? true,
      public_show_videos: initialProfileData.public_show_videos ?? true,
    },
  });

  const allowedFields = [
    'first_name',
    'last_name',
    'belt_level',
    'instagram_url',
    'x_url',
    'facebook_url',
    'tiktok_url',
    'youtube_url',
    'website_url',
    'public_show_training_logs',
    'public_show_stats',
    'public_show_videos',
  ];

  const onSubmit = async (data) => {
    setSubmitError('');
    setSubmitSuccess('');
    if (!user || user.id !== initialProfileData.id) {
      setSubmitError('You are not authorized to edit this profile.');
      return;
    }
    // Filter data to only allowed fields
    const filteredData = Object.fromEntries(Object.entries(data).filter(([key]) => allowedFields.includes(key)));
    try {
      const { error } = await supabase.from('profiles').update(filteredData).eq('id', initialProfileData.id);
      if (error) throw error;
      setSubmitSuccess('Profile updated successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError(err.message || 'Failed to update profile.');
    }
  };

  // URL validation regex
  const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/i;

  const handleCancel = () => {
    if (onClose) onClose();
  };

  return (
    <div className="w-full max-w-lg mx-auto p-8 bg-black rounded-lg shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4 text-center">Edit Profile</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1" htmlFor="first_name">
            First Name
          </label>
          <input
            id="first_name"
            type="text"
            maxLength={50}
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('first_name', { required: 'First Name is required', maxLength: 50 })}
          />
          {errors.first_name && <span className="text-red-400 text-sm">{errors.first_name.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="last_name">
            Last Name
          </label>
          <input
            id="last_name"
            type="text"
            maxLength={50}
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('last_name', { required: 'Last Name is required', maxLength: 50 })}
          />
          {errors.last_name && <span className="text-red-400 text-sm">{errors.last_name.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="belt_level">
            Belt
          </label>
          <select
            id="belt_level"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('belt_level', { required: 'Belt is required' })}
          >
            <option value="">Select Belt</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
          {errors.belt_level && <span className="text-red-400 text-sm">{errors.belt_level.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="instagram_url">
            Instagram URL
          </label>
          <input
            id="instagram_url"
            type="url"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('instagram_url', {
              pattern: { value: urlPattern, message: 'Invalid URL for Instagram' },
            })}
          />
          {errors.instagram_url && <span className="text-red-400 text-sm">{errors.instagram_url.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="x_url">
            X URL
          </label>
          <input
            id="x_url"
            type="url"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('x_url', {
              pattern: { value: urlPattern, message: 'Invalid URL for X' },
            })}
          />
          {errors.x_url && <span className="text-red-400 text-sm">{errors.x_url.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="facebook_url">
            Facebook URL
          </label>
          <input
            id="facebook_url"
            type="url"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('facebook_url', {
              pattern: { value: urlPattern, message: 'Invalid URL for Facebook' },
            })}
          />
          {errors.facebook_url && <span className="text-red-400 text-sm">{errors.facebook_url.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="tiktok_url">
            TikTok URL
          </label>
          <input
            id="tiktok_url"
            type="url"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('tiktok_url', {
              pattern: { value: urlPattern, message: 'Invalid URL for TikTok' },
            })}
          />
          {errors.tiktok_url && <span className="text-red-400 text-sm">{errors.tiktok_url.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="youtube_url">
            YouTube URL
          </label>
          <input
            id="youtube_url"
            type="url"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('youtube_url', {
              pattern: { value: urlPattern, message: 'Invalid URL for YouTube' },
            })}
          />
          {errors.youtube_url && <span className="text-red-400 text-sm">{errors.youtube_url.message}</span>}
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="website_url">
            Website URL
          </label>
          <input
            id="website_url"
            type="url"
            className="w-full border border-gray-700 bg-black text-white rounded px-3 py-2"
            {...register('website_url', {
              pattern: { value: urlPattern, message: 'Invalid URL for Website' },
            })}
          />
          {errors.website_url && <span className="text-red-400 text-sm">{errors.website_url.message}</span>}
        </div>
        <div className="border-t border-gray-700 pt-4 mt-4">
          <h3 className="font-bold mb-2">Profile Privacy Settings</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('public_show_training_logs')} />
              Show Training Logs on Public Profile
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('public_show_stats')} />
              Show Stats on Public Profile
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register('public_show_videos')} />
              Show Videos on Public Profile
            </label>
          </div>
        </div>
        {submitError && <div className="text-red-400 text-center">{submitError}</div>}
        {submitSuccess && <div className="text-green-400 text-center">{submitSuccess}</div>}
        <div className="flex flex-col items-center gap-2">
          <button type="submit" className="w-full bg-black border border-white text-white px-6 py-2 rounded hover:bg-neutral-800 font-semibold" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="w-full bg-black border border-white text-white px-6 py-2 rounded hover:bg-neutral-800 font-semibold" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
