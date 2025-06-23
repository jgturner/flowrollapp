import { useForm } from 'react-hook-form';
import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { useAuth } from '../../context/AuthContext';
import DescriptionRenderer from '../../components/DescriptionRenderer';
import { Link } from 'react-router-dom';

function AddTechnique() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [playbackId, setPlaybackId] = useState(null);
  const [polling, setPolling] = useState(false);
  const videoFile = watch('video');
  const description = watch('description');

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

  // Polling function for playbackId
  const pollMuxForPlaybackId = async (uploadId) => {
    setPolling(true);
    setError(null);
    setPlaybackId(null);
    try {
      for (let i = 0; i < 20; i++) {
        // Try for up to ~20 seconds
        const res = await fetch('https://mrpiclpwihtqzgywfocm.supabase.co/functions/v1/mux_poll_playback_id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upload_id: uploadId }),
        });
        const json = await res.json();
        if (json.playback_id) {
          setPlaybackId(json.playback_id);
          setPolling(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      setError('Timed out waiting for Mux asset to be ready.');
    } catch (err) {
      setError('Error fetching playback ID: ' + err.message);
    } finally {
      setPolling(false);
    }
  };

  const onSubmit = async (data) => {
    setUploading(true);
    setResult(null);
    setError(null);
    setPlaybackId(null);
    try {
      const formData = new FormData();
      formData.append('video', data.video[0]);
      formData.append('title', data.title);
      formData.append('position', data.position);
      formData.append('description', data.description);
      if (user) {
        formData.append('user_id', user.id);
      }
      const res = await fetch('https://mrpiclpwihtqzgywfocm.supabase.co/functions/v1/mux_upload_video', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setResult(json);
      reset();
      if (json.playback_id) {
        setPlaybackId(json.playback_id);
      } else if (json.upload_id) {
        pollMuxForPlaybackId(json.upload_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-4">Add Technique</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="block mb-1 font-semibold" htmlFor="video">
            Upload Video
          </label>
          <input
            type="file"
            id="video"
            accept="video/*"
            {...register('video', { required: 'A video file is required' })}
            className="block w-full text-sm placeholder:text-white-900 border border-gray-300 rounded p-1 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
          />
          {errors.video && <p className="text-red-500 text-xs mt-1">{errors.video.message}</p>}
          {videoFile && videoFile.length > 0 && <p className="text-neutral-400 text-xs mt-2">Selected file: {videoFile[0].name}</p>}
        </div>
        <div>
          <label className="block mb-1 font-semibold" htmlFor="title">
            Video Title
          </label>
          <input
            type="text"
            id="title"
            {...register('title', { required: 'A title is required' })}
            className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block mb-1 font-semibold" htmlFor="position">
            Position
          </label>
          <select
            id="position"
            {...register('position', { required: 'A position is required' })}
            className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-black "
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
          <label className="block mb-1 font-semibold" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows="4"
            className="w-full placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
          ></textarea>
        </div>
        {description && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Description Preview</h3>
            <div className="p-4 border border-gray-600 rounded-md bg-gray-800 text-white">
              <DescriptionRenderer text={description} />
            </div>
          </div>
        )}
        <div className="flex justify-between items-center gap-2">
          <button
            type="submit"
            className="w-1/2  rounded  py-1.5 px-4 border bg-white border-white text-center text-sm text-black transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-transparent hover:text-white active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Add Video'}
          </button>
          <Link
            to="/"
            className="w-1/2  rounded  py-1.5 px-4 border bg-white border-white text-center text-sm text-black transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-transparent hover:text-white active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none"
          >
            Cancel
          </Link>
        </div>

        {result && <div className="mt-4 text-green-700 text-sm">Upload successful! Upload ID: {result.upload_id}</div>}
        {polling && <div className="mt-4 text-blue-600 text-sm">Waiting for video to be ready...</div>}
        {playbackId && (
          <div className="mt-8">
            <MuxPlayer
              playbackId={playbackId}
              metadata={{
                video_id: result?.upload_id || 'video-id-123456',
                video_title: 'Your Video Title',
                viewer_user_id: 'user-id-789',
              }}
              controls
            />
          </div>
        )}
        {error && <div className="mt-4 text-red-600 text-sm">Error: {error}</div>}
      </form>
    </>
  );
}

export default AddTechnique;
