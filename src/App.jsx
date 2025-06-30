import './App.css';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient.js';
import { Link, Routes, Route } from 'react-router-dom';
import SearchAndFilter from './components/SearchAndFilter.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VideoReadyPoller from './components/VideoReadyPoller.jsx';
import { MdPlaylistPlay, MdOutlineAddToPhotos } from 'react-icons/md';
import { RiVideoUploadLine } from 'react-icons/ri';

function App() {
  const [techniques, setTechniques] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechniques = async () => {
      setLoading(true);
      let query;

      if (searchTerm) {
        query = supabase.rpc('search_techniques', { search_term: searchTerm });
      } else {
        query = supabase.from('techniques').select('*');
      }

      if (selectedPosition) {
        query = query.eq('position', selectedPosition);
      }

      query = query.order('created_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching techniques:', error);
        setTechniques([]);
      } else {
        setTechniques(data);
      }
      setLoading(false);
    };

    fetchTechniques();
  }, [searchTerm, selectedPosition]);

  return (
    <>
      <VideoReadyPoller />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white ">Videos</h1>
      </div>
      <SearchAndFilter onSearchChange={setSearchTerm} onFilterChange={setSelectedPosition} />
      {loading ? (
        <p className="text-center text-white mt-8">Loading techniques...</p>
      ) : techniques.length === 0 ? (
        <p className="text-center text-white mt-8">No techniques found.</p>
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
    </>
  );
}

export default App;
