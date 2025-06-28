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
import EditProfileForm from '../../components/EditProfileForm';
import { AnimatePresence, motion } from 'framer-motion';
import GymProfileForm from '../../components/GymProfileForm';

// Placeholder imports for new components
// import TrainingStats from '../../components/TrainingStats';
// import TrainingHistory from '../../components/TrainingHistory';

export default function Profile() {
  const { user, loading, refreshUser, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isUploaderOpen, setUploaderOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [techniques, setTechniques] = useState([]);
  const [activeTab, setActiveTab] = useState('videos');
  const navigate = useNavigate();
  const [isEditModalOpen, setEditModalOpen] = useState(false);
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
        const { data, error } = await supabase.from('techniques').select('*').eq('user_id', user.id);

        if (error) {
          console.error('Error fetching techniques:', error);
        } else {
          setTechniques(data);
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
        {/* Edit Profile Button */}

        <AnimatePresence>
          {isEditModalOpen && (
            <EditProfileForm
              key="edit-profile-modal"
              initialProfileData={profileData}
              user={user}
              onClose={() => setEditModalOpen(false)}
              onSuccess={async () => {
                setEditModalOpen(false);
                await refreshUser();
              }}
            />
          )}
        </AnimatePresence>
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

              <div className="w-full md:w-1/6">
                {profileData && user && user.id === profileData.user_id && (
                  <div className="flex justify-center mb-6">
                    <button
                      className="border border-white text-sm text-white px-3 py-1 rounded hover:bg-white hover:text-black w-full"
                      onClick={() => setEditModalOpen(true)}
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center">Could not load profile information.</p>
        )}
      </div>
      {/* Tabs */}
      <hr className="border-white" />
      <div className="flex justify-center">
        <button className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none ml-2 text-white`} onClick={() => setActiveTab('training')}>
          <MdFitnessCenter size={22} />
        </button>
        <button className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white`} onClick={() => setActiveTab('stats')}>
          <MdOutlineQueryStats size={22} />
        </button>
        <button className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white`} onClick={() => setActiveTab('videos')}>
          <RiVideoUploadLine size={22} className="mr-2" />
        </button>
        {userGym && (
          <button className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white`} onClick={() => setActiveTab('gym')} title="Manage Gym">
            <MdHome size={22} />
          </button>
        )}
        <button className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white`} onClick={() => setActiveTab('settings')}>
          <MdSettings size={22} />
        </button>
      </div>
      <hr className="border-white" />
      {/* Tab Content */}
      <div className="mt-6" style={{ minHeight: 300 }}>
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'videos' && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <h4 className="text-xl font-bold ">Video Uploads</h4>
              {techniques.length > 0 ? (
                <div className="grid md:grid-cols-3 grid-cols-2 gap-4 mt-8">
                  {techniques.map((tech) => (
                    <Link to={`/technique/${tech.id}`} key={tech.id} className="block">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <img
                          src={`https://image.mux.com/${tech.mux_playback_id}/thumbnail.jpg?width=320${
                            tech.thumbnail_time !== undefined && tech.thumbnail_time !== null ? `&time=${tech.thumbnail_time}` : ''
                          }`}
                          alt={tech.title || 'Video thumbnail'}
                          className="absolute top-0 left-0 w-full h-full object-cover rounded"
                        />
                      </div>
                      <div className="mt-2">
                        <div className="font-semibold text-sm text-white truncate">{tech.title}</div>
                        <div className="text-xs text-gray-500">{tech.position}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center mt-4">No techniques uploaded yet.</p>
              )}
            </motion.div>
          )}
          {activeTab === 'training' && (
            <motion.div
              key="training"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold">Training</h4>
                <button className="border border-white text-white px-4 py-1 rounded hover:bg-white hover:text-black" onClick={() => navigate('/training/new')}>
                  + Log Session
                </button>
              </div>
              <TrainingHistory userId={user.id} />
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <h4 className="text-xl font-bold mb-4">Stats</h4>
              {/* Add your stats content here, or reuse <TrainingStats userId={user.id} /> if appropriate */}
              <TrainingStats userId={user.id} />
            </motion.div>
          )}
          {activeTab === 'gym' && (
            <motion.div
              key="gym"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <GymProfileForm
                gym={userGym}
                user={user}
                onSave={async () => {
                  // Refresh gym state after save
                  if (user) {
                    const { data, error } = await supabase.from('gyms').select('*').eq('owner_user_id', user.id).single();
                    if (!error && data) setUserGym(data);
                  }
                }}
                onDelete={() => {
                  setUserGym(null);
                  setActiveTab('videos');
                }}
              />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <h4 className="text-xl font-bold mb-4">Settings</h4>
              {!userGym && (
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold mb-6" onClick={() => setActiveTab('gym')}>
                  Create Gym Profile
                </button>
              )}
              <button
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-semibold mt-6"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
              >
                Log Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ProfileImageUploader isOpen={isUploaderOpen} onRequestClose={() => setUploaderOpen(false)} onUploadComplete={handleUploadComplete} />
    </div>
  );
}
