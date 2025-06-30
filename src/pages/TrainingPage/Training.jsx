import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import TrainingHistory from '../../components/TrainingHistory';
import { useEffect } from 'react';

export default function Training() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="pt-20 text-center">
        <p>Loading training...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="pt-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-bold">Training</h4>
        <button className="border border-white text-white px-4 py-1 rounded hover:bg-white hover:text-black" onClick={() => navigate('/training/new')}>
          + Log Session
        </button>
      </div>
      <TrainingHistory userId={user.id} />
    </div>
  );
}
