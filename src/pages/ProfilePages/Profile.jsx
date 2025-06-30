import { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import ProfileImageUploader from '../../components/ProfileImageUploader';
import { supabase } from '../../../utils/supabaseClient.js';
import TrainingStats from '../../components/TrainingStats';
import TrainingHistory from '../../components/TrainingHistory';
import { MdFitnessCenter, MdOutlineQueryStats, MdSettings, MdHome } from 'react-icons/md';
import { RiVideoUploadLine } from 'react-icons/ri';
import { SiInstagram, SiFacebook, SiTiktok } from 'react-icons/si';
import { FaLink, FaTwitter, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
// import EditProfileForm from '../../components/EditProfileForm';
import { AnimatePresence } from 'framer-motion';
import GymProfileForm from '../../components/GymProfileForm';
// import TrainingHistory from '../../components/TrainingHistory';

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isUploaderOpen, setUploaderOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const navigate = useNavigate();
  const [userGym, setUserGym] = useState(null);
  const [userGymName, setUserGymName] = useState(null);
  const [userGymId, setUserGymId] = useState(null);

  useEffect(() => {
    if (user) {
      let profileSource = user.profile || user.user_metadata;
      if (profileSource) {
        const {
          first_name,
          last_name,
          full_name,
          belt_level,
          height,
          weight,
          date_of_birth,
          avatar_url,
          youtube_url,
          instagram_url,
          x_url,
          facebook_url,
          tiktok_url,
          website_url,
        } = profileSource;

        // Convert height from meters to feet and inches
        const totalInches = height / 0.0254;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        const heightFormatted = `${feet}' ${inches}"`;

        // Convert weight from kg to lbs
        const weightInLbs = (weight / 0.453592).toFixed(1);

        // Format date of birth
        const dobFormatted = new Date(date_of_birth).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        setAvatarUrl(avatar_url);
        setProfileData({
          user_id: user.id,
          first_name,
          last_name,
          fullName: full_name,
          email: user.email,
          beltLevel: belt_level,
          height: heightFormatted,
          weight: `${weightInLbs} lbs`,
          dateOfBirth: dobFormatted,
          youtube_url,
          instagram_url,
          x_url,
          facebook_url,
          tiktok_url,
          website_url,
        });
        // Fetch active gym from gym_followers
        (async () => {
          const { data: follower } = await supabase.from('gym_followers').select('gym_id').eq('user_id', user.id).eq('status', 'approved').eq('active', true).single();
          if (follower && follower.gym_id) {
            setUserGymId(follower.gym_id);
            const { data: gym, error: gymError } = await supabase.from('gyms').select('name').eq('id', follower.gym_id).single();
            if (!gymError && gym) setUserGymName(gym.name);
            else setUserGymName(null);
          } else {
            setUserGymName(null);
            setUserGymId(null);
          }
        })();
      }
    }

    async function fetchTechniques() {
      if (user) {
        const { error } = await supabase.from('techniques').select('*').eq('user_id', user.id);

        if (error) {
          console.error('Error fetching techniques:', error);
        }
      }
    }

    // Check if user owns a gym
    async function fetchUserGym() {
      if (user) {
        const { data, error } = await supabase.from('gyms').select('*').eq('owner_user_id', user.id).single();
        if (!error && data) setUserGym(data);
        else setUserGym(null);
      }
    }

    fetchTechniques();
    fetchUserGym();
  }, [user]);

  const handleUploadComplete = (newUrl) => {
    setAvatarUrl(newUrl);
  };

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

  if (loading) {
    return (
      <div className="pt-20 text-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pt-2">
      <div className=" mx-auto">
        {profileData ? (
          <div>
            <div className="flex md:justify-between justify-center flex-wrap">
              <div className="flex gap-4 mb-6">
                {profileData && (
                  <Avatar
                    url={avatarUrl}
                    name={
                      profileData.first_name || profileData.last_name ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : profileData.fullName
                    }
                    onUpload={() => setUploaderOpen(true)}
                    size={130}
                  />
                )}

                <div>
                  <h3 className=" text-2xl font-bold ">
                    {profileData.first_name || profileData.last_name ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : profileData.fullName}
                  </h3>
                  <p className="mb-3">
                    {/* Show gym name if user is a gym owner, otherwise show active gym */}
                    {userGym && userGym.id && userGym.name ? (
                      <Link to={`/gym/${userGym.id}`} className="text-base font-semibold text-blue-400 mt-1 hover:underline">
                        {userGym.name}
                      </Link>
                    ) : userGymName && userGymId ? (
                      <Link to={`/gym/${userGymId}`} className="text-base font-semibold text-blue-400 mt-1 hover:underline">
                        {userGymName}
                      </Link>
                    ) : null}
                  </p>
                  <p className={`text-sm mb-3 border-2 rounded-md px-2 py-1 text-center mt-1 ${getBeltClass(profileData.beltLevel)}`}>{profileData.beltLevel}</p>
                  <div className="flex justify-center gap-6">
                    {profileData.youtube_url && (
                      <a href={profileData.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                        <FaYoutube size={24} />
                      </a>
                    )}
                    {profileData.instagram_url && (
                      <a
                        href={profileData.instagram_url}
                        aria-label="Instagram"
                        className="hover:text-pink-500 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SiInstagram size={24} />
                      </a>
                    )}
                    {profileData.x_url && (
                      <a href={profileData.x_url} aria-label="X (Twitter)" className="hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                        <FaXTwitter size={24} />
                      </a>
                    )}
                    {profileData.facebook_url && (
                      <a
                        href={profileData.facebook_url}
                        aria-label="Facebook"
                        className="hover:text-blue-600 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SiFacebook size={24} />
                      </a>
                    )}
                    {profileData.tiktok_url && (
                      <a href={profileData.tiktok_url} aria-label="TikTok" className="hover:text-black transition-colors" target="_blank" rel="noopener noreferrer">
                        <SiTiktok size={24} />
                      </a>
                    )}
                    {profileData.website_url && (
                      <a href={profileData.website_url} aria-label="Website" className="hover:text-gray-400 transition-colors" target="_blank" rel="noopener noreferrer">
                        <FaLink size={24} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center">Could not load profile information.</p>
        )}
      </div>
      {/* Tab Content */}
      <div className="mt-6" style={{ minHeight: 200 }}>
        <h4 className="text-xl font-bold mb-4">Management</h4>
        <div className="flex flex-col gap-4">
          {profileData && user && user.id === profileData.user_id && (
            <Link to="/edit-profile">
              <button className="w-full bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 font-semibold border border-white">Edit Profile</button>
            </Link>
          )}
          <Link to="/manage-gym">
            <button className="w-full bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 font-semibold border border-white">Manage Gym</button>
          </Link>
          <Link to="/my-videos">
            <button className="w-full bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 font-semibold border border-white">Manage Videos</button>
          </Link>
          <Link to={`/public-profile/${user?.id}`}>
            <button className="w-full bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 font-semibold border border-white">View Public Profile</button>
          </Link>
          <button
            className="w-full bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 font-semibold border border-white"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            Log Out
          </button>
        </div>
      </div>
      <ProfileImageUploader isOpen={isUploaderOpen} onRequestClose={() => setUploaderOpen(false)} onUploadComplete={handleUploadComplete} />
    </div>
  );
}
