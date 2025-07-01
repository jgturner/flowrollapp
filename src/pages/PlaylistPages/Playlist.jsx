import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import SearchAndFilter from '../../components/SearchAndFilter.jsx';
import { RiVideoUploadLine } from 'react-icons/ri';
import { FaPhotoVideo } from 'react-icons/fa';

export default function Playlist() {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('playlists')
          .select(
            `
            id,
            technique:techniques (
              id,
              title,
              position,
              description,
              mux_playback_id,
              thumbnail_time
            )
          `
          )
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        if (data) {
          // The result is an array of objects where each object has a 'technique' property.
          // We need to extract the technique from each object.
          const techniques = data.map((item) => item.technique).filter(Boolean);
          setPlaylist(techniques);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [user]);

  if (loading) {
    return <div className="text-center p-8">Loading your playlist...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-600">Error: {error}</div>;
  }

  if (playlist.length === 0) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-white mb-4">My Playlist</h1>
        <p>Your playlist is empty.</p>
        <p>Click the "Playlist" button on a technique to add it here.</p>
      </div>
    );
  }

  const filteredPlaylist = playlist.filter((technique) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesPosition = selectedPosition ? technique.position === selectedPosition : true;
    const matchesSearch = searchTerm ? technique.title.toLowerCase().includes(searchTermLower) || technique.position.toLowerCase().includes(searchTermLower) : true;

    // We can't search by person here without another fetch, so we'll omit it for playlists.

    return matchesPosition && matchesSearch;
  });

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Playlist</h1>
      </div>
      <SearchAndFilter onSearchChange={setSearchTerm} onFilterChange={setSelectedPosition} />
      {filteredPlaylist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredPlaylist.map((technique) => (
            <Link to={`/technique/${technique.id}`} key={technique.id} className="block">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <img
                  src={`https://image.mux.com/${technique.mux_playback_id}/thumbnail.jpg?width=320${
                    technique.thumbnail_time !== undefined && technique.thumbnail_time !== null ? `&time=${technique.thumbnail_time}` : ''
                  }`}
                  alt={technique.title || 'Video thumbnail'}
                  className="absolute top-0 left-0 w-full h-full object-cover rounded"
                />
              </div>
              <div className="mt-2">
                <div className="font-semibold text-sm text-white truncate">{technique.title}</div>
                <div className="text-xs text-gray-500">{technique.position}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center p-8">
          <p className="text-white">No techniques found matching your criteria.</p>
        </div>
      )}
    </>
  );
}
