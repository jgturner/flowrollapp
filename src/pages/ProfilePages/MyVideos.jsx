import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../../utils/supabaseClient.js';
import { RiVideoUploadLine } from 'react-icons/ri';
import SearchAndFilter from '../../components/SearchAndFilter.jsx';

export default function MyVideos({ userId: propUserId }) {
  const { user } = useAuth();
  const [techniques, setTechniques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const userId = propUserId || user?.id;

  useEffect(() => {
    async function fetchTechniques() {
      setLoading(true);
      let query = supabase.from('techniques').select('*').eq('user_id', userId);
      if (searchTerm) {
        // If you have a search_techniques RPC for user-specific, use it. Otherwise, filter client-side.
        // query = supabase.rpc('search_techniques', { search_term: searchTerm }).eq('user_id', userId);
        // For now, fetch all and filter client-side.
      }
      if (selectedPosition) {
        query = query.eq('position', selectedPosition);
      }
      const { data, error } = await query;
      let filtered = data || [];
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = filtered.filter((t) => (t.title && t.title.toLowerCase().includes(lower)) || (t.position && t.position.toLowerCase().includes(lower)));
      }
      if (error) {
        setTechniques([]);
      } else {
        setTechniques(filtered);
      }
      setLoading(false);
    }
    if (userId) fetchTechniques();
  }, [userId, searchTerm, selectedPosition]);

  if (loading) {
    return (
      <div className="pt-20 text-center">
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="pt-8 px-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Videos</h2>
        {!propUserId && (
          <div className="flex items-center gap-6">
            <Link to="/addTechnique" className="bg-white text-black hover:bg-neutral-200 font-semibold px-4 py-2 rounded-md border border-white flex items-center">
              <RiVideoUploadLine size={22} className="mr-2" /> Add Video
            </Link>
          </div>
        )}
      </div>
      <SearchAndFilter onSearchChange={setSearchTerm} onFilterChange={setSelectedPosition} />
      {loading ? (
        <p className="text-center text-white mt-8">Loading videos...</p>
      ) : techniques.length === 0 ? (
        <p className="text-center mt-4">No techniques found.</p>
      ) : (
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
      )}
    </div>
  );
}
