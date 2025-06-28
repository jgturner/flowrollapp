import { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import ProfileImageUploader from '../../components/ProfileImageUploader';
import { supabase } from '../../../utils/supabaseClient.js';
import TrainingStats from '../../components/TrainingStats';
import TrainingHistory from '../../components/TrainingHistory';
import { MdFitnessCenter } from 'react-icons/md';
import { RiVideoUploadLine } from 'react-icons/ri';
import { SiInstagram, SiFacebook, SiTiktok } from 'react-icons/si';
import { FaLink, FaTwitter, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import EditProfileForm from '../../components/EditProfileForm';

// Placeholder imports for new components
// import TrainingStats from '../../components/TrainingStats';
// import TrainingHistory from '../../components/TrainingHistory';

export default function Profile() {
  const { user, loading, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isUploaderOpen, setUploaderOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [techniques, setTechniques] = useState([]);
  const [activeTab, setActiveTab] = useState('videos');
  const navigate = useNavigate();
  const [isEditModalOpen, setEditModalOpen] = useState(false);

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

    fetchTechniques();
  }, [user]);

  const handleUploadComplete = (newUrl) => {
    setAvatarUrl(newUrl);
  };

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
    <div className="pt-8">
      <div className="xl:w-1/3 lg:w-2/3 sm:w-3/4 px-5 mx-auto  relative">
        {/* Edit Profile Button */}

        {isEditModalOpen && (
          <EditProfileForm
            initialProfileData={profileData}
            user={user}
            onClose={() => setEditModalOpen(false)}
            onSuccess={async () => {
              setEditModalOpen(false);
              await refreshUser();
            }}
          />
        )}
        {profileData ? (
          <div>
            <div className="flex justify-center">
              {profileData && (
                <Avatar
                  url={avatarUrl}
                  name={profileData.first_name || profileData.last_name ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : profileData.fullName}
                  onUpload={() => setUploaderOpen(true)}
                  size={100}
                />
              )}
            </div>
            <div>
              <h3 className="mb-0 text-2xl font-bold text-center">
                {profileData.first_name || profileData.last_name ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : profileData.fullName}
              </h3>
              <p className="text-center text-sm text-gray-500 mb-6">{profileData.beltLevel}</p>
              <div className="flex justify-center gap-6 mb-8">
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
              {profileData && user && user.id === profileData.user_id && (
                <div className="flex justify-center mb-6">
                  <button className="border border-white text-white px-4 py-1 rounded hover:bg-white hover:text-black" onClick={() => setEditModalOpen(true)}>
                    Edit Profile
                  </button>
                </div>
              )}
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
        <button className={`px-4 py-2 font-semibold rounded-t-lg focus:outline-none text-white`} onClick={() => setActiveTab('videos')}>
          <RiVideoUploadLine size={22} className="mr-2" />
        </button>
      </div>
      <hr className="border-white" />
      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'videos' && (
          <>
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
          </>
        )}
        {activeTab === 'training' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold">Training</h4>
              <button className="border border-white text-white px-4 py-1 rounded hover:bg-white hover:text-black" onClick={() => navigate('/training/new')}>
                + Log Session
              </button>
            </div>
            <TrainingStats userId={user.id} />
            <TrainingHistory userId={user.id} />
          </div>
        )}
      </div>
      <ProfileImageUploader isOpen={isUploaderOpen} onRequestClose={() => setUploaderOpen(false)} onUploadComplete={handleUploadComplete} />
    </div>
  );
}
