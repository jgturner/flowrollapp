import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';

export default function SingleSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('training_session').select('*').eq('id', id).single();
      if (error) {
        setError('Failed to load session');
        setLoading(false);
        return;
      }
      setSession(data);
      setLoading(false);
    }
    if (id) fetchSession();
  }, [id]);

  const handleEdit = () => {
    navigate('/training/new', { state: { session } });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('training_session').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      setError('Failed to delete session');
    } else {
      navigate('/profile', { state: { tab: 'training' } });
    }
  };

  if (loading) return <div className="text-center text-gray-400 mt-20">Loading session...</div>;
  if (error) return <div className="text-center text-red-500 mt-20">{error}</div>;
  if (!session) return null;

  return (
    <div className="max-w-lg mx-auto mt-20 p-6 bg-black rounded shadow text-white">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">Training Session Details</h2>
      <div className="mb-4">
        <span className="font-semibold text-white">Date:</span> {session.date}
      </div>
      <div className="mb-4">
        <span className="font-semibold text-white">Class Time:</span> {session.class_time}
      </div>
      <div className="mb-4">
        <span className="font-semibold text-white">Location:</span> {session.location}
      </div>
      <div className="mb-4">
        <span className="font-semibold text-white">Format/Uniform:</span> {session.format_uniform}
      </div>
      {session.category && (
        <div className="mb-4">
          <span className="font-semibold text-white">Category:</span> {session.category}
        </div>
      )}
      {session.class_summary && (
        <div className="mb-4">
          <span className="font-semibold text-white">Class Summary:</span> {session.class_summary}
        </div>
      )}
      {session.notes && (
        <div className="mb-4">
          <span className="font-semibold text-white">Notes:</span> {session.notes}
        </div>
      )}
      <div className="mb-4">
        <span className="font-semibold text-white">Sparring:</span> {session.sparring ? 'Yes' : 'No'}
      </div>
      {session.sparring && (
        <>
          <div className="mb-4">
            <span className="font-semibold text-white">Rounds:</span> {session.rounds}
          </div>
          <div className="mb-4">
            <span className="font-semibold text-white">Minutes per Round:</span> {session.minutes_per_round}
          </div>
        </>
      )}
      <div className="flex flex-col gap-4 mt-8">
        <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={handleEdit}>
          Edit
        </button>
        <button className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" onClick={() => setShowConfirm(true)} disabled={deleting}>
          Delete
        </button>
        <button className="w-full bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800" onClick={() => navigate('/profile', { state: { tab: 'training' } })}>
          Cancel
        </button>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-black p-6 rounded shadow max-w-sm w-full text-white border border-gray-700">
            <div className="mb-4 text-center font-semibold">Are you sure you want to delete this session?</div>
            <div className="flex justify-center gap-4">
              <button className="bg-gray-800 text-white px-4 py-2 rounded border border-gray-500" onClick={() => setShowConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
