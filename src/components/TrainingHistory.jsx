import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

const PAGE_SIZE = 10;

export default function TrainingHistory({ userId, hideDetails }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const observer = useRef();
  const navigate = useNavigate();

  const lastSessionRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new window.IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
  }, [userId]);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('training_session')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) {
        setError('Failed to load sessions');
        setLoading(false);
        return;
      }
      setSessions((prev) => {
        const all = [...prev, ...data];
        const unique = Array.from(new Map(all.map((item) => [item.id, item])).values());
        return unique;
      });
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }
    if (userId && hasMore) fetchSessions();
    // eslint-disable-next-line
  }, [page, userId]);

  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (!loading && sessions.length === 0) return <div className="text-center text-gray-400">No training sessions yet.</div>;

  return (
    <div>
      <ul className="divide-y divide-gray-200">
        {sessions.map((s, i) => {
          const isLast = i === sessions.length - 1;
          return (
            <li
              key={s.id}
              ref={isLast ? lastSessionRef : null}
              className="py-4 cursor-pointer"
              onClick={() => navigate(`/training/${s.id}`)}
              tabIndex={0}
              aria-label={`View session on ${s.date}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/training/${s.id}`);
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">
                  {s.date} • {s.class_time}
                </span>
                <span className="text-xs text-gray-500">{s.format_uniform}</span>
              </div>
              <div className="text-sm text-white mb-1">{s.location}</div>
              {!hideDetails && s.class_summary && <div className="text-xs text-white mb-0">Summary: {s.class_summary}</div>}
              {!hideDetails && s.notes && <div className="text-xs text-white mb-3">Notes: {s.notes}</div>}
              {!hideDetails && (
                <div className="flex flex-wrap gap-2 text-xs mt-1">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Sparring: {s.sparring ? 'Yes' : 'No'}</span>
                  {s.sparring && <span className="bg-neutral-100 text-gray-700 px-2 py-0.5 rounded">Rounds: {s.rounds}</span>}
                  {s.sparring && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Minutes/Round: {s.minutes_per_round}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {loading && <div className="text-center text-gray-400 mt-4">Loading...</div>}
      {!hasMore && sessions.length > 0 && <div className="text-center text-gray-400 mt-4">End of Trianing Logs.</div>}
    </div>
  );
}
