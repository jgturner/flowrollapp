import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  const [editData, setEditData] = useState({ title: '', description: '', position: '' });
  const [updateError, setUpdateError] = useState(null);

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

      // Step 4: Combine the data and update the state
      setTechnique({ ...techData, profile: profileData });
      setLoading(false);

      // Step 5: Subscribe to profile updates
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdateError(null);
    if (!editData.title || !editData.position) {
      setUpdateError('Title and position are required.');
      return;
    }

    const { data, error } = await supabase.from('techniques').update(editData).eq('id', id).select().single();

    if (error) {
      console.error('Error updating technique:', error);
      setUpdateError(error.message);
    } else {
      setTechnique(data);
      setIsEditing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!technique) return <div className="p-8 text-center">Technique not found.</div>;

  const isOwner = user && user.id === technique.user_id;

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
              {updateError && <p className="text-red-500 text-sm mb-4">{updateError}</p>}
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
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-0 pb-0">{technique.title}</h1>
                  <div className="text-gray-400 mb-4 mt-[-7px]">{technique.position}</div>
                </div>

                {isOwner && (
                  <div>
                    <button onClick={() => setIsEditing(true)}>
                      <FaEdit size={25} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mb-4 justify-between">
                <div className="flex items-center gap-3 mb-4 ">
                  <Avatar url={publicUrl} name={technique.profile ? `${technique.profile.first_name} ${technique.profile.last_name}` : 'Anonymous'} size={60} />
                  <div>
                    {/* <p className="text-xs mb-[-5px] pb-0">"The King"</p> */}
                    <h1 className="text-white mt-0 pt-0 mb-1">{technique.profile ? `${technique.profile.first_name} ${technique.profile.last_name}` : 'Gordon Ryan'}</h1>
                    {/* <hr className="border-gray-700 mb-2" /> */}
                    {/* <p className="text-xs mt-[-5px] pb-0">10th Planet Jiu Jitsu</p> */}
                  </div>
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

              <div className="text-gray-400 mb-4">
                <DescriptionRenderer text={technique.description} />
              </div>

              <Comments techniqueId={id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
