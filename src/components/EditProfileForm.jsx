import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../utils/supabaseClient';
import { motion } from 'framer-motion';

const BELT_OPTIONS = ['White', 'Blue', 'Purple', 'Brown', 'Black'];

export default function EditProfileForm({ initialProfileData, user, onClose, onSuccess }) {
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isExiting, setIsExiting] = useState(false);
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
    },
  });

  const allowedFields = ['first_name', 'last_name', 'belt_level', 'instagram_url', 'x_url', 'facebook_url', 'tiktok_url', 'youtube_url', 'website_url'];

  const onSubmit = async (data) => {
    setSubmitError('');
    setSubmitSuccess('');
    if (!user || user.id !== initialProfileData.user_id) {
      setSubmitError('You are not authorized to edit this profile.');
      return;
    }
    // Filter data to only allowed fields
    const filteredData = Object.fromEntries(Object.entries(data).filter(([key]) => allowedFields.includes(key)));
    try {
      const { error } = await supabase.from('profiles').update(filteredData).eq('id', user.id);
      if (error) throw error;
      setSubmitSuccess('Profile updated successfully!');
      setIsExiting(true); // trigger exit animation
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 300); // match animation duration
    } catch (err) {
      setSubmitError(err.message || 'Failed to update profile.');
    }
  };

  // URL validation regex
  const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/i;

  const handleCancel = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // match animation duration
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        className="bg-black rounded-lg shadow-lg w-full max-w-lg p-8 relative text-white"
        initial={{ opacity: 0, scale: 0.95 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        animate={isExiting ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
        onAnimationComplete={() => {
          if (isExiting && onClose) onClose();
        }}
      >
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
          {submitError && <div className="text-red-400 text-center">{submitError}</div>}
          {submitSuccess && <div className="text-green-400 text-center">{submitSuccess}</div>}
          <div className="flex flex-col items-center gap-2">
            <button type="submit" className="bg-white text-black px-6 py-2 rounded hover:bg-gray-200 disabled:opacity-50" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-700 border border-gray-600" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
