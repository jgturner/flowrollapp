import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient.js';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SingleGymPage() {
  const { id } = useParams();
  const [gym, setGym] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [hours, setHours] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [goingLoading, setGoingLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [goingUsers, setGoingUsers] = useState([]);
  const [userIsGoing, setUserIsGoing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: gymData } = await supabase.from('gyms').select('*').eq('id', id).single();
      const { data: scheduleData } = await supabase.from('gym_schedules').select('*').eq('gym_id', id);
      const { data: hoursData } = await supabase.from('gym_hours').select('*').eq('gym_id', id);
      setGym(gymData);
      setSchedule(scheduleData || []);
      setHours(hoursData || []);
      setLoading(false);
    }
    fetchData();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, [id]);

  // Fetch follow status
  useEffect(() => {
    async function fetchFollowStatus() {
      if (!user || !gym) return setFollowStatus(null);
      if (user.id === gym.owner_user_id) return setFollowStatus('owner');
      const { data, error } = await supabase.from('gym_followers').select('status, active').eq('gym_id', gym.id).eq('user_id', user.id).single();
      if (!data) return setFollowStatus('none');
      if (data.status === 'pending') setFollowStatus('pending');
      else if (data.status === 'approved' && data.active) setFollowStatus('approved');
      else setFollowStatus('none');
    }
    fetchFollowStatus();
  }, [user, gym]);

  // Handle follow button
  async function handleFollow() {
    if (!user || !gym) return;
    setFollowLoading(true);
    // Upsert (insert or update) the gym_followers row
    await supabase.from('gym_followers').upsert({ gym_id: gym.id, user_id: user.id, status: 'pending', active: false }, { onConflict: ['gym_id', 'user_id'] });
    setFollowStatus('pending');
    setFollowLoading(false);
  }

  // Handle leave gym
  async function handleLeaveGym() {
    if (!user || !gym) return;
    if (!window.confirm('Are you sure you want to leave this gym?')) return;
    setFollowLoading(true);
    // Set active=false in gym_followers
    await supabase.from('gym_followers').update({ active: false }).eq('gym_id', gym.id).eq('user_id', user.id);
    // Set gym_id=null in profiles
    await supabase.from('profiles').update({ gym_id: null }).eq('id', user.id);
    setFollowStatus('none');
    setFollowLoading(false);
  }

  // Find next upcoming class
  const getNextClass = () => {
    if (!schedule.length) return null;
    const now = new Date();
    const nowDay = now.getDay();
    const nowTime = now.toTimeString().slice(0, 5);
    let next = null;
    for (let offset = 0; offset < 7; offset++) {
      const day = (nowDay + offset) % 7;
      const classes = schedule.filter((s) => s.day_of_week === day);
      const sorted = classes.sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (const c of sorted) {
        if (offset > 0 || c.start_time > nowTime) {
          if (!next || offset < next.offset || (offset === next.offset && c.start_time < next.class.start_time)) {
            next = { class: c, offset };
          }
        }
      }
    }
    return next?.class || null;
  };

  const nextClass = getNextClass();

  // Attendance logic
  useEffect(() => {
    async function fetchAttendance() {
      if (!nextClass) return;
      const { data: attendanceData } = await supabase.from('gym_attendance').select('user_id').eq('gym_schedule_id', nextClass.id);
      setAttendance({ [nextClass.id]: attendanceData ? attendanceData.length : 0 });
      // Fetch user profiles for those going
      if (attendanceData && attendanceData.length > 0) {
        const userIds = attendanceData.map((a) => a.user_id);
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
        setGoingUsers(profiles || []);
        if (user && user.id) {
          setUserIsGoing(userIds.includes(user.id));
        } else {
          setUserIsGoing(false);
        }
      } else {
        setGoingUsers([]);
        setUserIsGoing(false);
      }
    }
    fetchAttendance();
  }, [nextClass, user]);

  const handleGoing = async () => {
    if (!user || !nextClass) return;
    setGoingLoading(true);
    if (userIsGoing) {
      // Remove attendance
      await supabase.from('gym_attendance').delete().eq('gym_schedule_id', nextClass.id).eq('user_id', user.id);
    } else {
      // Add attendance
      await supabase.from('gym_attendance').insert({ gym_schedule_id: nextClass.id, user_id: user.id });
    }
    // Refresh attendance
    const { data: attendanceData } = await supabase.from('gym_attendance').select('user_id').eq('gym_schedule_id', nextClass.id);
    setAttendance({ [nextClass.id]: attendanceData ? attendanceData.length : 0 });
    if (attendanceData && attendanceData.length > 0) {
      const userIds = attendanceData.map((a) => a.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
      setGoingUsers(profiles || []);
      setUserIsGoing(userIds.includes(user.id));
    } else {
      setGoingUsers([]);
      setUserIsGoing(false);
    }
    setGoingLoading(false);
  };

  if (loading) return <div className="text-white p-8">Loading...</div>;
  if (!gym) return <div className="text-white p-8">Gym not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {gym.photo_url && <img src={gym.photo_url} alt="Gym" className="w-48 h-48 object-cover rounded" />}
        <div>
          <h1 className="text-3xl font-bold mb-2">{gym.name}</h1>
          <div className="mb-2">{gym.address}</div>
          {/* Follow Button */}
          {user && gym && user.id !== gym.owner_user_id && (
            <div className="mt-2">
              {followStatus === 'none' && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700" onClick={handleFollow} disabled={followLoading}>
                  {followLoading ? 'Requesting...' : 'Follow'}
                </button>
              )}
              {followStatus === 'pending' && (
                <button className="bg-gray-500 text-white px-4 py-2 rounded font-bold cursor-not-allowed" disabled>
                  Pending Approval
                </button>
              )}
              {followStatus === 'approved' && (
                <button className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700" onClick={handleLeaveGym} disabled={followLoading}>
                  {followLoading ? 'Leaving...' : 'Leave Gym'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {nextClass && (
        <div className="bg-blue-900 rounded-lg p-4 mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">Next Class</div>
              <div>
                {nextClass.class_name} - {daysOfWeek[nextClass.day_of_week]}, {nextClass.start_time} - {nextClass.end_time} ({nextClass.instructor})
              </div>
              <div className="text-sm text-gray-300 mt-1">{attendance[nextClass.id] || 0} going</div>
            </div>
            <button className={`px-4 py-2 rounded font-semibold ${userIsGoing ? 'bg-red-600' : 'bg-green-600'} text-white`} onClick={handleGoing} disabled={goingLoading}>
              {goingLoading ? 'Processing...' : userIsGoing ? 'Not Going' : 'Going'}
            </button>
          </div>
          {goingUsers.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold mb-1">People Going:</div>
              <ul className="flex flex-wrap gap-2">
                {goingUsers.map((u) => (
                  <li key={u.id} className="bg-gray-700 px-3 py-1 rounded text-white text-sm">
                    {u.first_name} {u.last_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Full Schedule</h2>
        {schedule.length === 0 && <div className="text-gray-400">No classes scheduled.</div>}
        <ul>
          {schedule.map((sched, idx) => (
            <li key={idx} className="mb-2 bg-gray-700 p-2 rounded">
              <b>{sched.class_name}</b> - {daysOfWeek[sched.day_of_week]}, {sched.start_time} - {sched.end_time} ({sched.instructor}){' '}
              {sched.is_private && <span className="text-yellow-400">[Private]</span>}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Hours of Operation</h2>
        {hours.length === 0 && <div className="text-gray-400">No hours set.</div>}
        <ul>
          {hours.map((h, idx) => (
            <li key={idx} className="mb-1">
              {daysOfWeek[h.day_of_week]}: {h.open_time} - {h.close_time}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
