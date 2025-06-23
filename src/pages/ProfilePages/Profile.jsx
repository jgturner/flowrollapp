import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import ProfileImageUploader from '../../components/ProfileImageUploader';
import { supabase } from '../../../utils/supabaseClient.js';

export default function Profile() {
  const { user, loading } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isUploaderOpen, setUploaderOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [techniques, setTechniques] = useState([]);

  useEffect(() => {
    if (user && user.user_metadata) {
      const { full_name, belt_level, height, weight, date_of_birth, avatar_url } = user.user_metadata;

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
        fullName: full_name,
        email: user.email,
        beltLevel: belt_level,
        height: heightFormatted,
        weight: `${weightInLbs} lbs`,
        dateOfBirth: dobFormatted,
      });
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
    <div className="pt-20">
      <div className="xl:w-1/3 lg:w-2/3 sm:w-3/4 px-5 mx-auto mt-12">
        <div className="flex justify-center">
          {profileData && <Avatar url={avatarUrl} name={profileData.fullName} onUpload={() => setUploaderOpen(true)} size={100} />}
        </div>

        {profileData ? (
          <div>
            <div>
              <h3 className="mb-0 text-2xl font-bold text-center">{profileData.fullName}</h3>
              <p className="text-center text-sm text-gray-500">{profileData.beltLevel}</p>
            </div>
          </div>
        ) : (
          <p className="text-center">Could not load profile information.</p>
        )}
      </div>
      <div className="mt-12">
        <h4 className="text-xl font-bold text-center">My Videos</h4>
        {techniques.length > 0 ? (
          <div className="grid md:grid-cols-3 grid-cols-2 gap-4 mt-8">
            {techniques.map((tech) => (
              <Link to={`/technique/${tech.id}`} key={tech.id} className="block">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <img
                    src={`https://image.mux.com/${tech.mux_playback_id}/thumbnail.jpg?width=320`}
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
      </div>
      <ProfileImageUploader isOpen={isUploaderOpen} onRequestClose={() => setUploaderOpen(false)} onUploadComplete={handleUploadComplete} />
    </div>
  );
}
