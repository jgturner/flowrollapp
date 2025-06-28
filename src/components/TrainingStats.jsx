import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

const FORMATS = [
  { key: 'Gi', color: 'bg-blue-500' },
  { key: 'No-Gi', color: 'bg-red-500' },
];

const CATEGORY_OPTIONS = [
  'Standing',
  'Passing',
  'Sparring',
  'Closed Guard',
  'Open Guard',
  'Half Guard',
  'Butterfly Guard',
  'De La Riva Guard',
  'X Guard',
  'Spider Guard',
  'Lasso Guard',
  'Rubber Guard',
  '50/50 Guard',
  'Worm Guard',
  'Z Guard',
  'Knee Shield Guard',
  'Williams Guard',
  'Reverse De La Riva',
  'Full Mount',
  'Side Control',
  'North-South',
  'Back Mount',
  'Turtle',
  'Knee on Belly',
  'Scarf Hold (Kesa Gatame)',
  'Modified Scarf Hold',
  'Crucifix',
  'Truck',
  'Electric Chair',
  'Ashii Garami',
  'Saddle (Inside Sankaku)',
  'Outside Ashii',
  'Single Leg X',
  'Competition/Match',
];

export default function TrainingStats({ userId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('format'); // 'format' or 'category'

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('training_session').select('format_uniform, category').eq('user_id', userId);
      if (error) {
        setError('Failed to load stats');
        setLoading(false);
        return;
      }
      setSessions(data);
      setLoading(false);
    }
    if (userId) fetchSessions();
  }, [userId]);

  if (loading) return <div className="text-center text-gray-400">Loading stats...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (!sessions.length) return <div className="text-center text-gray-400">No training sessions yet.</div>;

  // Format stats
  const total = sessions.length;
  const formatCounts = FORMATS.reduce((acc, f) => {
    acc[f.key] = sessions.filter((s) => s.format_uniform === f.key).length;
    return acc;
  }, {});

  // Category stats
  const categoryCounts = CATEGORY_OPTIONS.reduce((acc, cat) => {
    acc[cat] = sessions.filter((s) => s.category === cat).length;
    return acc;
  }, {});
  const totalCategories = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        <span className="font-semibold">Total Sessions:</span>
        <span>{total}</span>
      </div>
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-1 rounded font-semibold transition ${view === 'format' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setView('format')}
        >
          Format
        </button>
        <button
          className={`px-4 py-1 rounded font-semibold transition ${view === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setView('category')}
        >
          Positions
        </button>
      </div>
      {view === 'format' && (
        <>
          {FORMATS.map((f) => {
            const percent = total ? (formatCounts[f.key] / total) * 100 : 0;
            return (
              <div key={f.key} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{f.key}</span>
                  <span className="text-xs text-gray-500" title={`${f.key}: ${formatCounts[f.key]} sessions`}>
                    {formatCounts[f.key]} session{formatCounts[f.key] !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded h-4 relative" aria-label={`${f.key} progress`}>
                  <div
                    className={`${f.color} h-4 rounded transition-all duration-700`}
                    style={{ width: `${percent}%`, minWidth: formatCounts[f.key] > 0 && percent < 10 ? '10%' : undefined }}
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                    tabIndex={0}
                    title={`${f.key}: ${formatCounts[f.key]} sessions`}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}
      {view === 'category' && (
        <>
          {CATEGORY_OPTIONS.map((cat) => {
            const count = categoryCounts[cat];
            const percent = totalCategories ? (count / totalCategories) * 100 : 0;
            return (
              <div key={cat} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{cat}</span>
                  <span className="text-xs text-gray-500" title={`${cat}: ${count} sessions`}>
                    {count} session{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded h-4 relative" aria-label={`${cat} progress`}>
                  <div
                    className={`bg-green-600 h-4 rounded transition-all duration-700`}
                    style={{ width: `${percent}%`, minWidth: count > 0 && percent < 10 ? '10%' : undefined }}
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                    tabIndex={0}
                    title={`${cat}: ${count} sessions`}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
