import { useAuth } from '../../context/AuthContext';
import TrainingStats from '../../components/TrainingStats';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Stats() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="pt-20 text-center">
        <p>Loading stats...</p>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="pt-8 max-w-2xl mx-auto">
      <h4 className="text-xl font-bold mb-4">Stats</h4>
      <TrainingStats userId={user.id} />
    </div>
  );
}
