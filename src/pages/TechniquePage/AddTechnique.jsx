import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function AddTechnique() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState(1); // 1: select video, 2: details+frame, 3: uploading
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailTime, setThumbnailTime] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef();

  // Guard options (could be imported from TechniqueDetailsForm)
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
    'Competition/Match',
  ];

  if (!user) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white mb-4">Add Technique</h1>
        <div className="p-6 bg-gray-800 rounded-lg">
          <p className="text-white mb-4">You must be logged in to upload techniques.</p>
          <Link to="/login" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
            Login
          </Link>
        </div>
      </div>
    );
  }

  // Step 1: Select video
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setStep(2);
    }
  };

  // Step 2: Details + frame selection
  const handleCaptureFrame = () => {
    if (videoRef.current) {
      setThumbnailTime(videoRef.current.currentTime);
    }
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title || !position || !videoFile) {
      setError('Please fill out all required fields.');
      return;
    }
    if (thumbnailTime === null) {
      setError('Please select a frame for the thumbnail.');
      return;
    }
    setUploading(true);
    setStep(3);
    // Always show the uploading message for 5 seconds, regardless of upload speed
    setTimeout(() => {
      navigate('/profile');
    }, 5000);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      formData.append('position', position);
      formData.append('description', description);
      formData.append('thumbnail_time', Math.floor(thumbnailTime));
      formData.append('user_id', user.id);
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://mrpiclpwihtqzgywfocm.supabase.co';
      const response = await fetch(`${functionsUrl}/functions/v1/mux_upload_video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const data = await response.json();
      console.log('Mux upload response:', data);
      if (!response.ok || data.error) {
        setError(data.error || 'Upload failed. Please try again.');
        setUploading(false);
        setStep(2);
        return;
      }
      // Optionally handle response here
    } catch {
      setError('Upload failed. Please try again.');
      setUploading(false);
      setStep(2);
      return;
    }
  };

  // Step 3: Uploading message
  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <h1 className="text-2xl font-bold text-white mb-4">Uploading your video...</h1>
        <p className="text-neutral-300">Your video is being uploaded and processed. It will appear in your profile soon.</p>
      </div>
    );
  }

  // Step 2: Details + frame selection
  if (step === 2 && videoFile) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-black p-8 rounded-lg shadow-lg border border-white">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Add Technique Details</h1>
        <form onSubmit={handleDetailsSubmit} className="space-y-6">
          {error && <div className="mb-4 p-3 bg-black border border-white rounded-md text-white text-sm">{error}</div>}
          <div className="mb-4">
            <label className="block mb-2 font-semibold text-white">Video Preview</label>
            <video ref={videoRef} src={videoUrl} controls className="w-full rounded mb-2 bg-black border border-white" style={{ maxHeight: 320 }} />
            <button
              type="button"
              onClick={handleCaptureFrame}
              className={`mt-2 px-4 py-2 border border-white text-white rounded-md font-bold hover:bg-white hover:text-black transition ${
                thumbnailTime !== null ? 'opacity-70' : ''
              }`}
            >
              {thumbnailTime === null ? 'Select This Frame as Thumbnail' : `Frame Selected at ${Math.floor(thumbnailTime)}s`}
            </button>
            {thumbnailTime !== null && <div className="text-xs text-gray-400 mt-1">Selected thumbnail time: {Math.floor(thumbnailTime)} seconds</div>}
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold text-white" htmlFor="title">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-white text-white placeholder-gray-400 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500 bg-black"
              placeholder="Enter a descriptive title"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold text-white" htmlFor="position">
              Position *
            </label>
            <select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full border border-white bg-black text-white p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500"
              required
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
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold text-white" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-white text-white placeholder-gray-400 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500 bg-black"
              placeholder="Describe the technique (optional)"
              rows={3}
            />
          </div>
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              className="border border-white text-white rounded-md font-bold py-2 px-4 hover:bg-white hover:text-black transition disabled:opacity-50"
              disabled={uploading}
            >
              Upload Video
            </button>
            <button
              type="button"
              className="border border-white text-white rounded-md font-bold py-2 px-4 hover:bg-white hover:text-black transition"
              onClick={() => setStep(1)}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 1: Select video
  return (
    <div className="max-w-md mx-auto mt-20 bg-black p-8 rounded-lg shadow-lg border border-white">
      <h1 className="text-3xl font-bold text-white mb-6 text-center">Add Technique</h1>
      <label className="block mb-2 font-semibold text-white" htmlFor="video">
        Select Video File
      </label>
      <input
        type="file"
        id="video"
        accept="video/*"
        onChange={handleVideoChange}
        className="block w-full border border-white text-white text-sm rounded-md p-2 bg-black file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-white hover:file:text-black"
      />
      {videoFile && <p className="text-gray-400 text-xs mt-2">Selected: {videoFile.name}</p>}
      <div className="flex gap-4 mt-6">
        <Link to="/" className="border border-white text-white rounded-md font-bold py-2 px-4 hover:bg-white hover:text-black transition text-center w-full">
          Cancel
        </Link>
      </div>
    </div>
  );
}
