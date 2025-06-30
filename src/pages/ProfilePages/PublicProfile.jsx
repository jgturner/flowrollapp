import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import TrainingStats from '../../components/TrainingStats';
import TrainingHistory from '../../components/TrainingHistory';
import MyVideos from './MyVideos';
import { supabase } from '../../../utils/supabaseClient.js';
import { SiInstagram, SiFacebook, SiTiktok } from 'react-icons/si';
import { FaLink, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

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

export default function PublicProfile() {
  const { userId } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('logs');
  const [privacy, setPrivacy] = useState({
    public_show_training_logs: true,
    public_show_stats: true,
    public_show_videos: true,
  });
  const [userGymName, setUserGymName] = useState(null);
  const [userGymId, setUserGymId] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfileData(data);
        // If avatar_url is a path, get the public URL
        let avatar = data.avatar_url;
        if (avatar && !avatar.startsWith('http')) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(avatar);
          avatar = urlData.publicUrl;
        }
        setAvatarUrl(avatar);
        setPrivacy({
          public_show_training_logs: data.public_show_training_logs ?? true,
          public_show_stats: data.public_show_stats ?? true,
          public_show_videos: data.public_show_videos ?? true,
        });
        // Fetch gym: owner first, then follower
        let gymId = null;
        let gymName = null;
        // Check if user owns a gym
        const { data: ownedGym, error: ownerError } = await supabase.from('gyms').select('id, name').eq('owner_user_id', userId).single();
        if (!ownerError && ownedGym) {
          gymId = ownedGym.id;
          gymName = ownedGym.name;
        } else {
          // Fallback to follower
          const { data: follower } = await supabase.from('gym_followers').select('gym_id').eq('user_id', userId).eq('status', 'approved').eq('active', true).single();
          if (follower && follower.gym_id) {
            gymId = follower.gym_id;
            const { data: gym, error: gymError } = await supabase.from('gyms').select('name').eq('id', follower.gym_id).single();
            if (!gymError && gym) gymName = gym.name;
          }
        }
        setUserGymId(gymId);
        setUserGymName(gymName);
      }
    }
    if (userId) fetchProfile();
  }, [userId]);

  if (!profileData) {
    return <div className="pt-20 text-center text-white">Loading profile...</div>;
  }

  return (
    <div className="pt-2">
      <div className="mx-auto">
        <div className="flex md:justify-between justify-center flex-wrap">
          <div className="flex gap-4 mb-6">
            <Avatar url={avatarUrl} name={profileData.first_name || profileData.full_name} size={130} />
            <div>
              <h3 className="text-2xl font-bold text-white">
                {profileData.first_name || profileData.last_name ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : profileData.full_name}
              </h3>
              <p className="mb-3">
                {userGymName && userGymId ? (
                  <Link to={`/gym/${userGymId}`} className="text-base font-semibold text-blue-400 mt-1 hover:underline">
                    {userGymName}
                  </Link>
                ) : null}
              </p>
              <p className={`text-sm mb-3 border-2 rounded-md px-2 py-1 text-center mt-1 ${getBeltClass(profileData.belt_level)}`}>{profileData.belt_level}</p>
              <div className="flex justify-center gap-6">
                {profileData.youtube_url && (
                  <a href={profileData.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <FaYoutube size={24} />
                  </a>
                )}
                {profileData.instagram_url && (
                  <a href={profileData.instagram_url} aria-label="Instagram" className="hover:text-pink-500 transition-colors" target="_blank" rel="noopener noreferrer">
                    <SiInstagram size={24} />
                  </a>
                )}
                {profileData.x_url && (
                  <a href={profileData.x_url} aria-label="X (Twitter)" className="hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">
                    <FaXTwitter size={24} />
                  </a>
                )}
                {profileData.facebook_url && (
                  <a href={profileData.facebook_url} aria-label="Facebook" className="hover:text-blue-600 transition-colors" target="_blank" rel="noopener noreferrer">
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
      {/* Tabs */}
      <div className="flex gap-2 justify-center mb-6">
        {privacy.public_show_training_logs && (
          <button
            className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white ${activeTab === 'logs' ? 'bg-black border-b-2 border-white' : 'bg-black'}`}
            onClick={() => setActiveTab('logs')}
          >
            Training Logs
          </button>
        )}
        {privacy.public_show_stats && (
          <button
            className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white ${activeTab === 'stats' ? 'bg-black border-b-2 border-white' : 'bg-black'}`}
            onClick={() => setActiveTab('stats')}
          >
            Stats
          </button>
        )}
        {privacy.public_show_videos && (
          <button
            className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white ${activeTab === 'videos' ? 'bg-black border-b-2 border-white' : 'bg-black'}`}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
        )}
      </div>
      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'logs' && privacy.public_show_training_logs && <TrainingHistory userId={userId} hideDetails />}
        {activeTab === 'stats' && privacy.public_show_stats && <TrainingStats userId={userId} />}
        {activeTab === 'videos' && privacy.public_show_videos && <MyVideos userId={userId} />}
      </div>
    </div>
  );
}
