import { useForm } from 'react-hook-form';
import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const guardOptions = [
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
  'Sparring',
];

function generateThumbnailTimes(duration) {
  if (!duration) return [];
  const thumbnailCount = Math.min(5, Math.max(3, Math.floor(duration / 10)));
  const times = [];
  for (let i = 0; i < thumbnailCount; i++) {
    const time = Math.floor((duration / (thumbnailCount + 1)) * (i + 1));
    times.push(time);
  }
  return times;
}

export default function TechniqueDetailsForm({ uploadId, playbackId, videoDuration }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const thumbnailTimes = playbackId && videoDuration ? generateThumbnailTimes(videoDuration) : [];

  const onSubmit = async (data) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        upload_id: uploadId,
        title: data.title,
        position: data.position,
        description: data.description || null,
        thumbnail_time: selectedThumbnailTime || null,
        user_id: user?.id,
      };
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://mrpiclpwihtqzgywfocm.supabase.co';
      const res = await fetch(`${functionsUrl}/functions/v1/save_technique_metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save technique');
      navigate(`/technique/${json.technique.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-md text-red-300 text-sm">{error}</div>}
      {playbackId && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-white">Video Preview</h3>
          <MuxPlayer
            playbackId={playbackId}
            metadata={{ video_id: uploadId, video_title: 'Preview', viewer_user_id: user?.id || 'anonymous' }}
            thumbnailTime={selectedThumbnailTime}
            controls
            style={{ maxHeight: '300px' }}
          />
        </div>
      )}
      {thumbnailTimes.length > 0 && (
        <div>
          <label className="block mb-3 font-semibold text-white">Choose Thumbnail</label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {thumbnailTimes.map((time, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedThumbnailTime(time)}
                className={`relative border-2 rounded overflow-hidden transition-all ${
                  selectedThumbnailTime === time ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-400 hover:border-gray-300'
                }`}
              >
                <img
                  src={`https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=120&height=68&fit_mode=crop`}
                  alt={`Thumbnail at ${time}s`}
                  className="w-full h-auto aspect-video object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                  {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                </div>
                {selectedThumbnailTime === time && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</div>
                  </div>
                )}
              </button>
            ))}
          </div>
          {selectedThumbnailTime !== null && (
            <p className="text-sm text-gray-400 mt-2">
              Thumbnail selected at {Math.floor(selectedThumbnailTime / 60)}:{(selectedThumbnailTime % 60).toString().padStart(2, '0')}
            </p>
          )}
        </div>
      )}
      <div className="grid gap-4">
        <div>
          <label className="block mb-1 font-semibold text-white" htmlFor="title">
            Video Title *
          </label>
          <input
            type="text"
            id="title"
            {...register('title', { required: 'A title is required' })}
            className="w-full text-white text-sm border border-slate-200 rounded px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-gray-800"
            placeholder="Enter a descriptive title for your technique"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block mb-1 font-semibold text-white" htmlFor="position">
            Position *
          </label>
          <select
            id="position"
            {...register('position', { required: 'A position is required' })}
            className="w-full text-white text-sm border border-slate-200 rounded px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-gray-800"
            defaultValue=""
          >
            <option value="" disabled>
              Select a position
            </option>
            {guardOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
        </div>
        <div>
          <label className="block mb-1 font-semibold text-white" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows="4"
            className="w-full text-white text-sm border border-slate-200 rounded px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-gray-800"
            placeholder="Describe the technique, key details, when to use it, etc."
          ></textarea>
        </div>
      </div>
      <div className="flex gap-4">
        <button type="submit" className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={saving}>
          {saving ? 'Saving...' : 'Save Technique'}
        </button>
      </div>
    </form>
  );
}
