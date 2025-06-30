import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient.js';
import MuxPlayer from '@mux/mux-player-react';
import { FaRegHeart, FaHeart, FaEdit } from 'react-icons/fa';
import { FaRegShareSquare } from 'react-icons/fa';
import { MdOutlinePlaylistAdd, MdPlaylistAddCheck } from 'react-icons/md';
import { FaFileSignature } from 'react-icons/fa';
import { RiErrorWarningFill } from 'react-icons/ri';
import Avatar from './components/Avatar.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Comments from './components/Comments.jsx';
import DescriptionRenderer from './components/DescriptionRenderer.jsx';
import { AnimatePresence } from 'framer-motion';

export default function Technique() {
  const { id } = useParams();
  const { user } = useAuth();
  const [technique, setTechnique] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [isAddedToPlaylist, setIsAddedToPlaylist] = useState(false);
  const [isProcessingPlaylist, setIsProcessingPlaylist] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', description: '', position: '', thumbnail_time: null });
  const [updateError, setUpdateError] = useState(null);
  const navigate = useNavigate();
  const videoRef = useRef();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const descRef = useRef(null);
  const [descHeight, setDescHeight] = useState({ collapsed: 0, expanded: 0 });
  const [userGymName, setUserGymName] = useState(null);
  const [userGymId, setUserGymId] = useState(null);

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
  ];

  useEffect(() => {
    if (technique) {
      setEditData({
        title: technique.title || '',
        description: technique.description || '',
        position: technique.position || '',
        thumbnail_time: technique.thumbnail_time || 0,
      });
    }
  }, [technique]);

  useEffect(() => {
    let channel;

    const fetchTechniqueAndProfile = async () => {
      setLoading(true);
      // Step 1: Fetch the technique
      const { data: techData, error: techError } = await supabase.from('techniques').select('*').eq('id', id).single();

      if (techError) {
        setError(techError.message);
        setLoading(false);
        return;
      }

      if (!techData) {
        setTechnique(null);
        setLoading(false);
        return;
      }

      // Step 2: Fetch the profile using the user_id from the technique
      let profileData = null;
      if (techData.user_id) {
        const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', techData.user_id).single();
        if (profileError) {
          console.error('Error fetching profile:', profileError.message);
        }
        profileData = data;
      }

      // Step 3: Get public URL with cache busting
      if (profileData && profileData.avatar_url) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(profileData.avatar_url);
        const bustedUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
        setPublicUrl(bustedUrl);
      }

      // Step 4: Fetch gym info for the user (owner or active follower)
      let gymId = null;
      let gymName = null;
      if (techData.user_id) {
        // Check if user owns a gym
        const { data: ownedGym, error: ownerError } = await supabase.from('gyms').select('id, name').eq('owner_user_id', techData.user_id).single();
        if (!ownerError && ownedGym) {
          gymId = ownedGym.id;
          gymName = ownedGym.name;
        } else {
          // Fallback to follower
          const { data: follower } = await supabase
            .from('gym_followers')
            .select('gym_id')
            .eq('user_id', techData.user_id)
            .eq('status', 'approved')
            .eq('active', true)
            .single();
          if (follower && follower.gym_id) {
            gymId = follower.gym_id;
            const { data: gym, error: gymError } = await supabase.from('gyms').select('name').eq('id', follower.gym_id).single();
            if (!gymError && gym) gymName = gym.name;
          }
        }
      }
      setUserGymId(gymId);
      setUserGymName(gymName);

      // Step 5: Combine the data and update the state
      setTechnique({ ...techData, profile: profileData });
      setLoading(false);

      // Step 6: Subscribe to profile updates
      if (profileData) {
        channel = supabase
          .channel(`profile-updates-for-technique-${id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileData.id}` }, (payload) => {
            const newProfile = payload.new;
            setTechnique((prev) => ({ ...prev, profile: newProfile }));
            if (newProfile.avatar_url) {
              const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(newProfile.avatar_url);
              const bustedUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
              setPublicUrl(bustedUrl);
            } else {
              setPublicUrl('');
            }
          })
          .subscribe();
      }
    };

    fetchTechniqueAndProfile();

    // Cleanup subscription on component unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  useEffect(() => {
    const checkIfInPlaylist = async () => {
      if (!user) return;
      const { data, error } = await supabase.from('playlists').select('id').eq('user_id', user.id).eq('technique_id', id).single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking playlist:', error);
      }
      setIsAddedToPlaylist(!!data);
    };
    if (user && id) {
      checkIfInPlaylist();
    }
  }, [id, user]);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!id) return;

      // Fetch like count
      const { count, error: countError } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('technique_id', id);

      if (countError) {
        console.error('Error fetching like count:', countError);
      } else {
        setLikeCount(count);
      }

      // Check if user has liked
      if (user) {
        const { data: likeData, error: likeError } = await supabase.from('likes').select('id').eq('technique_id', id).eq('user_id', user.id).single();

        if (likeError && likeError.code !== 'PGRST116') {
          // PGRST116: no rows found
          console.error('Error checking if liked:', likeError);
        }
        setIsLiked(!!likeData);
      } else {
        setIsLiked(false); // Ensure isLiked is false if user is logged out
      }
    };

    if (id) {
      fetchLikes();
    }
  }, [id, user]);

  useEffect(() => {
    if (descRef.current) {
      // Temporarily remove line clamp to measure full height
      const el = descRef.current;
      const prev = el.className;
      el.className = prev.replace('line-clamp-3', '');
      const expanded = el.scrollHeight;
      el.className = prev;
      const collapsed = getComputedStyle(el).lineHeight.replace('px', '') * 3;
      setDescHeight({ collapsed: Number(collapsed), expanded });
    }
  }, [technique?.description]);

  const handlePlaylistClick = async () => {
    if (!user) {
      alert('You must be logged in to add to a playlist.');
      return;
    }

    setIsProcessingPlaylist(true);
    if (isAddedToPlaylist) {
      // Remove from playlist
      const { error } = await supabase.from('playlists').delete().eq('user_id', user.id).eq('technique_id', id);
      if (error) {
        console.error('Error removing from playlist:', error.message);
      } else {
        setIsAddedToPlaylist(false);
      }
    } else {
      // Add to playlist
      const { error } = await supabase.from('playlists').insert({ user_id: user.id, technique_id: id });
      if (error) {
        console.error('Error adding to playlist:', error.message);
      } else {
        setIsAddedToPlaylist(true);
      }
    }
    setIsProcessingPlaylist(false);
  };

  const handleLikeClick = async () => {
    if (!user) {
      alert('You must be logged in to like a technique.');
      return;
    }

    setIsProcessingLike(true);

    if (isLiked) {
      // Unlike
      const { error } = await supabase.from('likes').delete().eq('user_id', user.id).eq('technique_id', id);

      if (error) {
        console.error('Error unliking technique:', error.message);
      } else {
        setLikeCount((prev) => prev - 1);
        setIsLiked(false);
      }
    } else {
      // Like
      const { error } = await supabase.from('likes').insert({ user_id: user.id, technique_id: id });

      if (error) {
        console.error('Error liking technique:', error.message);
      } else {
        setLikeCount((prev) => prev + 1);
        setIsLiked(true);
      }
    }

    setIsProcessingLike(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'FlowRoll Technique',
      text: `Check out this technique: ${technique.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(
        () => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        },
        (err) => {
          console.error('Could not copy text: ', err);
          alert('Failed to copy link.');
        }
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCaptureFrame = () => {
    if (videoRef.current) {
      setEditData((prev) => ({ ...prev, thumbnail_time: Math.floor(videoRef.current.currentTime) }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdateError(null);
    if (!editData.title || !editData.position) {
      setUpdateError('Title and position are required.');
      return;
    }
    const updatePayload = { ...editData };
    // Ensure thumbnail_time is an integer
    if (updatePayload.thumbnail_time !== null) {
      updatePayload.thumbnail_time = Math.floor(updatePayload.thumbnail_time);
    }
    const { data, error } = await supabase.from('techniques').update(updatePayload).eq('id', id).select().single();
    if (error) {
      console.error('Error updating technique:', error);
      setUpdateError(error.message);
    } else {
      setTechnique(data);
      setIsEditing(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) return;

    // Get the user's session token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      alert('You must be logged in to delete a video.');
      return;
    }

    // 1. Delete from Mux via Edge Function
    try {
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://mrpiclpwihtqzgywfocm.functions.supabase.co';
      const res = await fetch(`${functionsUrl}/mux_delete_asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mux_playback_id: technique.mux_playback_id,
          technique_id: technique.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete from Mux');
      }
    } catch (err) {
      alert('Failed to delete video from Mux: ' + err.message);
      return;
    }
    // 2. Delete from Supabase
    const { error } = await supabase.from('techniques').delete().eq('id', technique.id);
    if (error) {
      alert('Failed to delete from database: ' + error.message);
      return;
    }
    // 3. Redirect
    navigate('/');
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!technique) return <div className="p-8 text-center">Technique not found.</div>;

  const isOwner = user && user.id === technique.user_id;

  // Add getBeltClass helper for belt styling
  function getBeltClass(beltLevel) {
    switch ((beltLevel || '').toLowerCase()) {
      case 'white':
        return 'bg-white text-black border-black';
      case 'blue':
        return 'bg-blue-600 text-white border-blue-600';
      case 'purple':
        return 'bg-purple-700 text-white border-purple-700';
      case 'brown':
        return 'bg-yellow-900 text-white border-yellow-900';
      case 'black':
        return 'bg-black text-red-600 border-red-600';
      default:
        return 'bg-black text-white border-white';
    }
  }

  return (
    <div>
      <div className="md:w-3/4 w-full">
        <MuxPlayer
          playbackId={technique.mux_playback_id}
          metadata={{
            video_id: technique.id,
            video_title: technique.title,
          }}
          className="w-full rounded"
          controls
        />

        <div className="mt-3">
          {isEditing ? (
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-white mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={editData.title}
                  onChange={handleInputChange}
                  className="w-full border border-white text-white placeholder-gray-400 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="position" className="block text-white mb-2">
                  Position
                </label>
                <select
                  name="position"
                  id="position"
                  value={editData.position}
                  onChange={handleInputChange}
                  className="w-full border border-white bg-black text-white p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500"
                >
                  <option value="">Select a Position</option>
                  {guardOptions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-white mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={editData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full border border-white text-white placeholder-gray-400 p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-white-500"
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-white mb-2">Video Preview & Thumbnail</label>
                <MuxPlayer
                  ref={videoRef}
                  playbackId={technique.mux_playback_id}
                  metadata={{ video_id: technique.id, video_title: technique.title }}
                  className="w-full rounded mb-2"
                  controls
                  style={{ maxHeight: 320 }}
                />
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className={`mt-2 px-4 py-2 border border-white text-white rounded-md font-bold hover:bg-white hover:text-black transition ${
                    editData.thumbnail_time !== null ? 'opacity-70' : ''
                  }`}
                >
                  {editData.thumbnail_time === null ? 'Select This Frame as Thumbnail' : `Frame Selected at ${Math.floor(editData.thumbnail_time)}s`}
                </button>
                {editData.thumbnail_time !== null && (
                  <div className="text-xs text-gray-400 mt-1">Selected thumbnail time: {Math.floor(editData.thumbnail_time)} seconds</div>
                )}
              </div>
              {updateError && <p className="text-red-500 text-sm mb-4">{updateError}</p>}
              <div className="flex gap-4 justify-between">
                <div className="flex gap-4">
                  <button type="submit" className="border border-white hover:bg-white hover:text-black text-white font-bold py-2 px-4 rounded">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="border border-white hover:bg-white hover:text-black text-white font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="border border-red-500 hover:bg-red-500 hover:text-white text-red-500 font-bold py-2 px-4 rounded"
                  >
                    Delete Video
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="md:text-2xl text-xl font-bold text-white mb-0 pb-0">{technique.title}</h1>
                  <div className="text-gray-400 mb-4 mt-[-7px]">{technique.position}</div>
                </div>

                {isOwner && (
                  <div>
                    <button onClick={() => setIsEditing(true)} className="pt-1.5">
                      <FaEdit size={20} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mb-4 justify-between">
                <div className="flex items-center gap-3 mb-4 ">
                  <Link to={technique.profile ? `/public-profile/${technique.profile.id}` : '#'} className="flex items-center gap-3">
                    <Avatar url={publicUrl} name={technique.profile ? `${technique.profile.first_name} ${technique.profile.last_name}` : 'Anonymous'} size={80} />
                    <div>
                      <h1 className="text-white mt-0 pt-0 mb-0">
                        {technique.profile ? `${technique.profile.first_name} ${technique.profile.last_name}` : 'Gordon Ryan'}
                      </h1>
                      {/* GYM NAME */}
                      {userGymName && userGymId ? (
                        <Link to={`/gym/${userGymId}`} className="text-base font-semibold text-blue-400 mt-1 hover:underline">
                          {userGymName}
                        </Link>
                      ) : null}
                      {/* BELT */}
                      {technique.profile && technique.profile.belt_level && (
                        <p className={`text-sm mb-0 border-2 rounded-md px-2 py-0.5 text-center mt-1 ${getBeltClass(technique.profile.belt_level)}`}>
                          {technique.profile.belt_level}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>

                {/* <div className="flex items-center gap-12">
                  <button className="text-white flex items-center gap-2 ">
                    <FaFileSignature /> Claim
                  </button>
                  <button className="text-white flex items-center gap-2 ">
                    <RiErrorWarningFill /> Report
                  </button>
                </div> */}
              </div>

              <hr className="border-gray-700 mb-2" />

              <div className="flex items-center gap-12 justify-around md:justify-start">
                <button onClick={handleLikeClick} disabled={isProcessingLike} className="text-white flex items-center gap-2 disabled:opacity-50">
                  {isLiked ? <FaHeart /> : <FaRegHeart />}
                  {likeCount === 0 ? 'Like' : `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
                </button>

                <button onClick={handlePlaylistClick} disabled={isProcessingPlaylist} className="text-white flex items-center gap-2 disabled:opacity-50">
                  {isAddedToPlaylist ? <MdPlaylistAddCheck /> : <MdOutlinePlaylistAdd />}
                  {isAddedToPlaylist ? 'Added' : 'Playlist'}
                </button>
                <button onClick={handleShare} className="text-white flex items-center gap-2 ">
                  <FaRegShareSquare /> {isCopied ? 'Copied!' : 'Share'}
                </button>
              </div>

              <hr className="border-gray-700 mt-2 mb-4" />

              <div className="text-white mb-4">
                <AnimatePresence>
                  <div
                    animate={{ height: showFullDescription ? descHeight.expanded : descHeight.collapsed }}
                    style={{ overflow: 'hidden' }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  >
                    <div ref={descRef} className={showFullDescription ? '' : 'line-clamp-3'}>
                      <DescriptionRenderer text={technique.description} />
                    </div>
                  </div>
                </AnimatePresence>
                {technique.description && technique.description.split(/\r?\n|<br\s*\/?>(?=\s*\S)/gi).length > 3 && (
                  <button className="mt-2 text-blue-400 hover:text-blue-500 text-sm focus:outline-none" onClick={() => setShowFullDescription((prev) => !prev)}>
                    {showFullDescription ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              <Comments techniqueId={id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
