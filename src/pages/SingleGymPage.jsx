import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient.js';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Add a helper function to format 24-hour time to 12-hour time with AM/PM
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

export default function SingleGymPage() {
  const { id } = useParams();
  const [gym, setGym] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [hours, setHours] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [multiAttendance, setMultiAttendance] = useState({});
  const [multiGoingUsers, setMultiGoingUsers] = useState({});
  const [multiUserIsGoing, setMultiUserIsGoing] = useState({});
  const [multiGoingLoading, setMultiGoingLoading] = useState({});
  const [followerCount, setFollowerCount] = useState(0);

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
      // Fetch follower count
      const { count } = await supabase.from('gym_followers').select('*', { count: 'exact', head: true }).eq('gym_id', id).eq('status', 'approved').eq('active', true);
      setFollowerCount(count || 0);
    }
    fetchData();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, [id]);

  // Fetch follow status
  useEffect(() => {
    async function fetchFollowStatus() {
      if (!user || !gym) return setFollowStatus(null);
      if (user.id === gym.owner_user_id) return setFollowStatus('owner');
      const { data } = await supabase.from('gym_followers').select('status, active').eq('gym_id', gym.id).eq('user_id', user.id).single();
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
    let next = null;
    for (let offset = 0; offset < 7; offset++) {
      const day = (nowDay + offset) % 7;
      const classes = schedule.filter((s) => s.day_of_week === day);
      const sorted = classes.sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (const c of sorted) {
        if (offset > 0 || c.start_time > now.toTimeString().slice(0, 5)) {
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
      setMultiAttendance({ [nextClass.id]: attendanceData ? attendanceData.length : 0 });
      // Fetch user profiles for those going
      if (attendanceData && attendanceData.length > 0) {
        const userIds = attendanceData.map((a) => a.user_id);
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
        setMultiGoingUsers(profiles || []);
        if (user && user.id) {
          setMultiUserIsGoing(userIds.includes(user.id));
        } else {
          setMultiUserIsGoing(false);
        }
      } else {
        setMultiGoingUsers([]);
        setMultiUserIsGoing(false);
      }
    }
    fetchAttendance();
  }, [nextClass, user]);

  // 1. Add a function to get all classes in the next 8 hours
  function getUpcomingClasses(schedule, hours = 8) {
    const now = new Date();
    const nowDay = now.getDay();
    const upcoming = [];
    for (let offset = 0; offset < 2; offset++) {
      // check today and tomorrow
      const day = (nowDay + offset) % 7;
      const classes = schedule.filter((s) => s.day_of_week === day);
      for (const c of classes) {
        // Compose class datetime
        const classDate = new Date(now);
        classDate.setDate(now.getDate() + offset);
        const [h, m] = c.start_time.split(':');
        classDate.setHours(Number(h), Number(m), 0, 0);
        const diff = (classDate - now) / (1000 * 60 * 60); // hours
        if (diff >= 0 && diff <= hours) {
          upcoming.push({ ...c, classDate });
        }
      }
    }
    // Sort by soonest
    return upcoming.sort((a, b) => a.classDate - b.classDate);
  }

  // 3. Fetch attendance for all upcoming classes
  useEffect(() => {
    async function fetchMultiAttendance() {
      const upcoming = getUpcomingClasses(schedule, 8);
      const att = {};
      const going = {};
      const isGoing = {};
      for (const c of upcoming) {
        const { data: attendanceData } = await supabase.from('gym_attendance').select('user_id').eq('gym_schedule_id', c.id);
        att[c.id] = attendanceData ? attendanceData.length : 0;
        if (attendanceData && attendanceData.length > 0) {
          const userIds = attendanceData.map((a) => a.user_id);
          const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
          going[c.id] = profiles || [];
          if (user && user.id) {
            isGoing[c.id] = userIds.includes(user.id);
          } else {
            isGoing[c.id] = false;
          }
        } else {
          going[c.id] = [];
          isGoing[c.id] = false;
        }
      }
      setMultiAttendance(att);
      setMultiGoingUsers(going);
      setMultiUserIsGoing(isGoing);
    }
    if (user && schedule.length > 0) fetchMultiAttendance();
  }, [user, schedule]);

  // 4. Handler for going/not going for a specific class
  async function handleMultiGoing(classId, isGoing) {
    setMultiGoingLoading((prev) => ({ ...prev, [classId]: true }));
    if (isGoing) {
      // Remove attendance
      await supabase.from('gym_attendance').delete().eq('gym_schedule_id', classId).eq('user_id', user.id);
    } else {
      // Add attendance
      await supabase.from('gym_attendance').insert({ gym_schedule_id: classId, user_id: user.id });
    }
    // Refresh attendance for this class
    const { data: attendanceData } = await supabase.from('gym_attendance').select('user_id').eq('gym_schedule_id', classId);
    setMultiAttendance((prev) => ({ ...prev, [classId]: attendanceData ? attendanceData.length : 0 }));
    if (attendanceData && attendanceData.length > 0) {
      const userIds = attendanceData.map((a) => a.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
      setMultiGoingUsers((prev) => ({ ...prev, [classId]: profiles || [] }));
      setMultiUserIsGoing((prev) => ({ ...prev, [classId]: userIds.includes(user.id) }));
    } else {
      setMultiGoingUsers((prev) => ({ ...prev, [classId]: [] }));
      setMultiUserIsGoing((prev) => ({ ...prev, [classId]: false }));
    }
    setMultiGoingLoading((prev) => ({ ...prev, [classId]: false }));
  }

  // Add debug logging before rendering upcoming classes
  const upcomingClasses = getUpcomingClasses(schedule, 8);
  console.log('Full schedule:', schedule);
  console.log('Upcoming classes (next 8 hours):', upcomingClasses);

  // Helper to get open mat classes
  const openMatClasses = schedule.filter((sched) => sched.is_open_mat);

  if (loading) return <div className="text-white p-8 bg-black min-h-screen">Loading...</div>;
  if (!gym) return <div className="text-white p-8 bg-black min-h-screen">Gym not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black min-h-screen text-white font-sans">
      <div className="flex flex-col md:flex-row gap-6 mb-6 bg-black rounded-[8px] shadow p-6 items-center">
        {gym.photo_url && <img src={gym.photo_url} alt="Gym" className="w-48 h-48 object-cover  shadow rounded-full border border-neutral-300" />}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2 text-white">{gym.name}</h1>
          <div className="mb-2 text-gray-300">{gym.address}</div>
          <div className="mb-2 text-gray-300">
            {followerCount} follower{followerCount === 1 ? '' : 's'}
          </div>
          {/* Follow Button */}
          {user && gym && user.id !== gym.owner_user_id && (
            <div className="mt-2">
              {followStatus === 'none' && (
                <button
                  className="bg-white text-black px-4 py-2 rounded-[8px] font-bold shadow hover:opacity-80 active:scale-105 transition-all"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? 'Requesting...' : 'Follow'}
                </button>
              )}
              {followStatus === 'pending' && (
                <button className="bg-black text-white px-4 py-2 rounded-[8px] font-bold shadow cursor-not-allowed" disabled>
                  Pending Approval
                </button>
              )}
              {followStatus === 'approved' && (
                <button
                  className="bg-red-600 text-white px-4 py-2 rounded-[8px] font-bold shadow hover:opacity-80 active:scale-105 transition-all"
                  onClick={handleLeaveGym}
                  disabled={followLoading}
                >
                  {followLoading ? 'Leaving...' : 'Leave Gym'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {upcomingClasses.length > 0 && (
        <div className="bg-black rounded-[8px] shadow p-4 mb-6 flex flex-col gap-6">
          <div className="font-bold text-lg text-white mb-2">Upcoming Classes (Next 8 Hours)</div>
          {upcomingClasses.map((c) => (
            <div key={c.id} className="mb-2 p-4 rounded-[8px] shadow bg-black">
              <div className="flex items-center justify-between flex-wrap">
                <div>
                  <div className="text-white font-semibold text-base">{c.class_name}</div>
                  <div className="text-white text-sm">
                    {daysOfWeek[c.day_of_week]}, {formatTime12h(c.start_time)} - {formatTime12h(c.end_time)} <span className="text-white">({c.instructor})</span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">{multiAttendance[c.id] || 0} going</div>
                </div>
                <button
                  className={`mt-2 px-4 py-2 rounded-[8px] font-semibold shadow transition-all ${
                    multiUserIsGoing[c.id] ? 'bg-red-600' : 'bg-white text-black'
                  } hover:opacity-80 active:scale-105`}
                  onClick={() => handleMultiGoing(c.id, multiUserIsGoing[c.id])}
                  disabled={multiGoingLoading[c.id]}
                >
                  {multiGoingLoading[c.id] ? 'Processing...' : multiUserIsGoing[c.id] ? 'Not Going' : 'Going'}
                </button>
              </div>
              {multiGoingUsers[c.id] && multiGoingUsers[c.id].length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold mb-1 text-white">People Going:</div>
                  <ul className="flex flex-wrap gap-2">
                    {multiGoingUsers[c.id].map((u) => (
                      <li key={u.id} className="bg-black px-3 py-1 rounded-[8px] text-white text-sm shadow">
                        {u.first_name} {u.last_name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="mb-6 bg-black rounded-[8px] shadow p-4">
        <h2 className="text-xl font-bold mb-2 text-white">Full Schedule</h2>
        {schedule.length === 0 && <div className="text-gray-400">No classes scheduled.</div>}
        <ul>
          {schedule
            .filter((sched) => !sched.is_open_mat)
            .map((sched, idx) => (
              <li key={idx} className="mb-2   rounded-[8px] shadow text-white">
                <b className="text-white">{sched.class_name}</b> - <span className="font-semibold">{daysOfWeek[sched.day_of_week]}</span>,{' '}
                {formatTime12h(sched.start_time)} - {formatTime12h(sched.end_time)} <span className="text-white">({sched.instructor})</span>{' '}
                {sched.is_private && <span className="text-yellow-400 ml-2">[Private]</span>}
              </li>
            ))}
        </ul>
      </div>
      {openMatClasses.length > 0 && (
        <div className="mb-6 bg-black rounded-[8px] shadow p-4">
          <h2 className="text-xl font-bold mb-2 text-white">Open Mat</h2>
          <ul>
            {openMatClasses.map((sched, idx) => (
              <li key={idx} className="mb-2 rounded-[8px] shadow text-white">
                <b className="text-white">{sched.class_name}</b> - <span className="font-semibold">{daysOfWeek[sched.day_of_week]}</span>,{' '}
                {formatTime12h(sched.start_time)} - {formatTime12h(sched.end_time)} <span className="text-white">({sched.instructor})</span>{' '}
                {sched.is_private && <span className="text-yellow-400 ml-2">[Private]</span>}
                <span className="text-green-400 ml-2">[Open Mat]</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="bg-black rounded-[8px] shadow p-4">
        <h2 className="text-xl font-bold mb-2 text-white">Hours of Operation</h2>
        {hours.length === 0 && <div className="text-gray-400">No hours set.</div>}
        <ul>
          {hours.map((h, idx) => (
            <li key={idx} className="mb-1 text-white">
              <span className="font-semibold text-white">{daysOfWeek[h.day_of_week]}</span>: {formatTime12h(h.open_time)} - {formatTime12h(h.close_time)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
