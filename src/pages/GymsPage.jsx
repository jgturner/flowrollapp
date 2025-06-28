import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient.js';

export default function GymsPage() {
  const [gyms, setGyms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGyms() {
      setLoading(true);
      const { data } = await supabase.from('gyms').select('*');
      setGyms(data || []);
      setLoading(false);
    }
    fetchGyms();
  }, []);

  const filteredGyms = gyms.filter((gym) => gym.name.toLowerCase().includes(search.toLowerCase()) || gym.address.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Gyms</h1>
      <div className="mb-6">
        <input
          className="w-full p-2 rounded text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search gyms by name or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : filteredGyms.length === 0 ? (
        <div className="text-gray-400">No gyms found.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredGyms.map((gym) => (
            <Link to={`/gym/${gym.id}`} key={gym.id} className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition">
              {gym.photo_url && <img src={gym.photo_url} alt="Gym" className="w-full h-40 object-cover rounded mb-3" />}
              <div className="font-bold text-xl mb-1">{gym.name}</div>
              <div className="text-gray-300">{gym.address}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
