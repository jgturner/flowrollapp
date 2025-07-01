import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../../utils/supabaseClient.js';
import GymProfileForm from '../../components/GymProfileForm';

export default function ManageGymPage() {
  const { user } = useAuth();
  const [userGym, setUserGym] = useState(null);

  useEffect(() => {
    async function fetchUserGym() {
      if (user) {
        const { data, error } = await supabase.from('gyms').select('*').eq('owner_user_id', user.id).single();
        if (!error && data) setUserGym(data);
        else setUserGym(null);
      }
    }
    fetchUserGym();
  }, [user]);

  return (
    <div className="mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6 text-left">Manage Gym</h2>
      <div className="bg-black  rounded-lg">
        <GymProfileForm
          gym={userGym}
          user={user}
          onSave={async () => {
            if (user) {
              const { data, error } = await supabase.from('gyms').select('*').eq('owner_user_id', user.id).single();
              if (!error && data) setUserGym(data);
            }
          }}
          onDelete={() => {
            setUserGym(null);
          }}
        />
      </div>
    </div>
  );
}
