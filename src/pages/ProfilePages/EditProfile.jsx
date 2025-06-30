import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EditProfileForm from '../../components/EditProfileForm';
import { supabase } from '../../../utils/supabaseClient.js';

export default function EditProfile() {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!error && data) setProfileData(data);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  if (loading) return <div className="pt-20 text-center text-white">Loading...</div>;
  if (!profileData) return <div className="pt-20 text-center text-white">Could not load profile.</div>;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center pt-8 px-2">
      <div className="w-full max-w-lg">
        <EditProfileForm
          initialProfileData={profileData}
          user={user}
          onClose={() => navigate('/profile')}
          onSuccess={async () => {
            await refreshUser();
            navigate('/profile');
          }}
        />
      </div>
    </div>
  );
}
