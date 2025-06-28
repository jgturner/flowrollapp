import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient.js';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function GymProfileForm({ gym, onSave, user, onDelete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: gym?.name || '',
    address: gym?.address || '',
    photo: gym?.photo_url || '',
    schedule: [],
    hours: [],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [scheduleEntry, setScheduleEntry] = useState({
    class_name: '',
    day_of_week: 0,
    start_time: '',
    end_time: '',
    instructor: '',
    is_private: false,
  });
  const [editingScheduleIdx, setEditingScheduleIdx] = useState(null);
  const [hours, setHours] = useState(daysOfWeek.map((day, idx) => ({ day_of_week: idx, open_time: '', close_time: '' })));
  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersError, setFollowersError] = useState('');
  const navigate = useNavigate();

  // Load existing schedule and hours if editing a gym
  useEffect(() => {
    async function fetchGymData() {
      if (gym && gym.id) {
        // Fetch schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('gym_schedules')
          .select('*')
          .eq('gym_id', gym.id)
          .order('day_of_week', { ascending: true });
        // Fetch hours
        const { data: hoursData, error: hoursError } = await supabase.from('gym_hours').select('*').eq('gym_id', gym.id).order('day_of_week', { ascending: true });
        if (!scheduleError && scheduleData) {
          setFormData((prev) => ({ ...prev, schedule: scheduleData }));
        }
        if (!hoursError && hoursData) {
          // Fill in all 7 days, even if some are missing
          const hoursArr = daysOfWeek.map((_, idx) => {
            const found = hoursData.find((h) => h.day_of_week === idx);
            return found ? { day_of_week: idx, open_time: found.open_time, close_time: found.close_time } : { day_of_week: idx, open_time: '', close_time: '' };
          });
          setHours(hoursArr);
        }
      }
    }
    fetchGymData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym?.id]);

  // Fetch followers when Followers tab is selected
  useEffect(() => {
    async function fetchFollowers() {
      if (gym && step === 4) {
        setFollowersLoading(true);
        setFollowersError('');
        // Get all followers for this gym
        const { data, error } = await supabase
          .from('gym_followers')
          .select('id, user_id, status, active, profiles: user_id (id, first_name, last_name, avatar_url)')
          .eq('gym_id', gym.id);
        if (error) {
          setFollowersError('Failed to load followers');
          setFollowers([]);
        } else {
          // Map avatar_url to public URL if present
          const followersWithAvatars = await Promise.all(
            (data || []).map(async (f) => {
              let avatarUrl = '';
              if (f.profiles?.avatar_url) {
                const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(f.profiles.avatar_url);
                avatarUrl = urlData.publicUrl;
              }
              return {
                ...f,
                profiles: {
                  ...f.profiles,
                  avatar_url: avatarUrl || '/default-avatar.png',
                },
              };
            })
          );
          setFollowers(followersWithAvatars);
        }
        setFollowersLoading(false);
      }
    }
    fetchFollowers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gym?.id, step]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage.from('gym-profile-photos').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      setUploadError('Photo upload failed: ' + error.message);
      setUploading(false);
      console.error('Photo upload failed:', error.message);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('gym-profile-photos').getPublicUrl(fileName);
    console.log('Gym photo public URL:', publicUrlData.publicUrl);
    setFormData({ ...formData, photo: publicUrlData.publicUrl });
    setUploading(false);
  };

  // --- Schedule Handlers ---
  const handleScheduleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setScheduleEntry({
      ...scheduleEntry,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  const addOrUpdateSchedule = () => {
    if (editingScheduleIdx !== null) {
      const updated = [...formData.schedule];
      updated[editingScheduleIdx] = scheduleEntry;
      setFormData({ ...formData, schedule: updated });
      setEditingScheduleIdx(null);
    } else {
      setFormData({ ...formData, schedule: [...formData.schedule, scheduleEntry] });
    }
    setScheduleEntry({ class_name: '', day_of_week: 0, start_time: '', end_time: '', instructor: '', is_private: false });
  };
  const editSchedule = (idx) => {
    setScheduleEntry(formData.schedule[idx]);
    setEditingScheduleIdx(idx);
  };
  const deleteSchedule = (idx) => {
    const updated = formData.schedule.filter((_, i) => i !== idx);
    setFormData({ ...formData, schedule: updated });
    setEditingScheduleIdx(null);
    setScheduleEntry({ class_name: '', day_of_week: 0, start_time: '', end_time: '', instructor: '', is_private: false });
  };

  // --- Hours Handlers ---
  const handleHoursChange = (idx, field, value) => {
    const updated = [...hours];
    updated[idx][field] = value;
    setHours(updated);
  };

  // --- Save Handler ---
  const handleSave = async () => {
    if (saving) return; // Prevent double submission
    setSaving(true);
    // Insert or update gym
    let gymId = gym?.id;
    let result;
    let created = false;
    console.log('Saving gym with photo URL:', formData.photo);
    if (gym) {
      result = await supabase
        .from('gyms')
        .update({
          name: formData.name,
          address: formData.address,
          photo_url: formData.photo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gym.id)
        .select();
      if (!result.error && result.data && result.data[0]) gymId = result.data[0].id;
    } else {
      result = await supabase
        .from('gyms')
        .insert({
          name: formData.name,
          address: formData.address,
          photo_url: formData.photo,
          owner_user_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();
      if (!result.error && result.data && result.data[0]) {
        gymId = result.data[0].id;
        created = true;
      }
    }
    if (result.error) {
      alert('Error saving gym: ' + result.error.message);
      setSaving(false);
      return;
    }
    // Upsert schedule
    if (gymId) {
      // Delete old schedules/hours if editing
      if (gym) {
        await supabase.from('gym_schedules').delete().eq('gym_id', gymId);
        await supabase.from('gym_hours').delete().eq('gym_id', gymId);
      }
      // Insert new schedules
      for (const sched of formData.schedule) {
        await supabase.from('gym_schedules').insert({
          gym_id: gymId,
          class_name: sched.class_name,
          day_of_week: Number(sched.day_of_week),
          start_time: sched.start_time,
          end_time: sched.end_time,
          instructor: sched.instructor,
          is_private: sched.is_private,
        });
      }
      // Insert new hours
      for (const h of hours) {
        if (h.open_time && h.close_time) {
          await supabase.from('gym_hours').insert({
            gym_id: gymId,
            day_of_week: h.day_of_week,
            open_time: h.open_time,
            close_time: h.close_time,
          });
        }
      }
    }
    setSaving(false);
    setSuccessMsg(created ? 'Gym created!' : 'Gym updated!');
    setTimeout(() => {
      setSuccessMsg('');
      navigate(`/gym/${gymId}`);
    }, 1000);
    if (onSave) onSave(formData);
  };

  const handleDeleteGym = async () => {
    if (!gym) return;
    const confirmed = window.confirm('Are you sure you want to delete this gym? This action cannot be undone and will delete all associated data.');
    if (!confirmed) return;
    setSaving(true);
    // Delete schedules
    await supabase.from('gym_schedules').delete().eq('gym_id', gym.id);
    // Delete hours
    await supabase.from('gym_hours').delete().eq('gym_id', gym.id);
    // Delete followers
    await supabase.from('gym_followers').delete().eq('gym_id', gym.id);
    // Delete attendance
    const { data: schedules } = await supabase.from('gym_schedules').select('id').eq('gym_id', gym.id);
    if (schedules && schedules.length > 0) {
      const scheduleIds = schedules.map((s) => s.id);
      await supabase.from('gym_attendance').delete().in('gym_schedule_id', scheduleIds);
    }
    // Delete photo from storage
    if (gym.photo_url) {
      try {
        const urlParts = gym.photo_url.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0];
        await supabase.storage.from('gym-profile-photos').remove([fileName]);
      } catch {
        // ignore errors
      }
    }
    // Delete gym
    await supabase.from('gyms').delete().eq('id', gym.id);
    setSaving(false);
    setSuccessMsg('Gym deleted!');
    setTimeout(() => {
      setSuccessMsg('');
      navigate('/profile');
      if (typeof onDelete === 'function') onDelete();
    }, 1200);
  };

  // Approve follower handler
  async function handleApproveFollower(follower) {
    // 1. Deactivate all other gyms for this user
    await supabase.from('gym_followers').update({ active: false }).eq('user_id', follower.user_id).neq('gym_id', gym.id);
    // 2. Update gym_followers.status to 'approved' and active to true for this gym
    const { error: updateError } = await supabase.from('gym_followers').update({ status: 'approved', active: true }).eq('id', follower.id);
    if (updateError) {
      alert('Failed to approve follower: ' + updateError.message);
      return;
    }
    // 3. Update user's profile.gym_id
    const { error: profileError } = await supabase.from('profiles').update({ gym_id: gym.id }).eq('id', follower.user_id);
    if (profileError) {
      alert('Failed to update user profile: ' + profileError.message);
      console.error('Failed to update gym_id for user', follower.user_id, profileError);
      return;
    } else {
      console.log('Successfully updated gym_id for user', follower.user_id, 'to', gym.id);
    }
    // 4. Refresh followers list
    setFollowers((prev) => prev.map((f) => (f.id === follower.id ? { ...f, status: 'approved', active: true } : f)));
  }

  // Activate/deactivate follower
  async function handleToggleActive(follower, makeActive) {
    const { error } = await supabase.from('gym_followers').update({ active: makeActive }).eq('id', follower.id);
    if (error) {
      alert('Failed to update follower: ' + error.message);
      return;
    }
    setFollowers((prev) => prev.map((f) => (f.id === follower.id ? { ...f, active: makeActive } : f)));
  }

  // Split followers into lists
  const pendingFollowers = followers.filter((f) => f.status === 'pending');
  const activeFollowers = followers.filter((f) => f.status === 'approved' && f.active);
  const inactiveFollowers = followers.filter((f) => f.status === 'approved' && !f.active);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      {successMsg && <div className="bg-green-700 text-white p-3 mb-4 rounded text-center font-bold animate-pulse">{successMsg}</div>}
      {/* Step Navigation */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          className={`px-4 py-1 rounded font-semibold transition ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setStep(1)}
          type="button"
        >
          Gym Info
        </button>
        <button
          className={`px-4 py-1 rounded font-semibold transition ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setStep(2)}
          type="button"
        >
          Schedule
        </button>
        <button
          className={`px-4 py-1 rounded font-semibold transition ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setStep(3)}
          type="button"
        >
          Hours
        </button>
        {gym && (
          <button
            className={`px-4 py-1 rounded font-semibold transition ${step === 4 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}
            onClick={() => setStep(4)}
            type="button"
          >
            Followers
          </button>
        )}
      </div>
      {/* Step Content */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Gym Info</h2>
          <input className="w-full mb-3 p-2 rounded" name="name" placeholder="Gym Name" value={formData.name} onChange={handleChange} />
          <input className="w-full mb-3 p-2 rounded" name="address" placeholder="Gym Address" value={formData.address} onChange={handleChange} />
          <div className="mb-3">
            <label className="block text-white mb-1">Gym Photo</label>
            <input type="file" name="photo" className="w-full" onChange={handlePhotoChange} disabled={uploading} />
            {uploading && <div className="text-blue-400 mt-1">Uploading...</div>}
            {uploadError && <div className="text-red-400 mt-1">{uploadError}</div>}
            {formData.photo && <img src={formData.photo} alt="Gym" className="mt-2 rounded w-40 h-40 object-cover" />}
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">BJJ Class Schedule</h2>
          <div className="mb-4">
            <input className="w-full mb-2 p-2 rounded" name="class_name" placeholder="Class Name" value={scheduleEntry.class_name} onChange={handleScheduleChange} />
            <select className="w-full mb-2 p-2 rounded" name="day_of_week" value={scheduleEntry.day_of_week} onChange={handleScheduleChange}>
              {daysOfWeek.map((d, idx) => (
                <option value={idx} key={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 p-2 rounded" name="start_time" type="time" value={scheduleEntry.start_time} onChange={handleScheduleChange} />
              <input className="flex-1 p-2 rounded" name="end_time" type="time" value={scheduleEntry.end_time} onChange={handleScheduleChange} />
            </div>
            <input className="w-full mb-2 p-2 rounded" name="instructor" placeholder="Instructor" value={scheduleEntry.instructor} onChange={handleScheduleChange} />
            <label className="text-white flex items-center mb-2">
              <input type="checkbox" name="is_private" checked={scheduleEntry.is_private} onChange={handleScheduleChange} className="mr-2" />
              Private Class
            </label>
            <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={addOrUpdateSchedule} type="button">
              {editingScheduleIdx !== null ? 'Update' : 'Add'} Class
            </button>
            {editingScheduleIdx !== null && (
              <button
                className="bg-gray-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setEditingScheduleIdx(null);
                  setScheduleEntry({ class_name: '', day_of_week: 0, start_time: '', end_time: '', instructor: '', is_private: false });
                }}
                type="button"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="mb-4">
            <h3 className="text-white font-semibold mb-2">Current Schedule</h3>
            {formData.schedule.length === 0 && <div className="text-gray-400">No classes added.</div>}
            <ul>
              {formData.schedule.map((sched, idx) => (
                <li key={idx} className="mb-2 bg-gray-700 p-2 rounded flex justify-between items-center">
                  <span>
                    <b>{sched.class_name}</b> - {daysOfWeek[sched.day_of_week]}, {sched.start_time} - {sched.end_time} ({sched.instructor}){' '}
                    {sched.is_private && <span className="text-yellow-400">[Private]</span>}
                  </span>
                  <span>
                    <button className="text-blue-400 mr-2" onClick={() => editSchedule(idx)} type="button">
                      Edit
                    </button>
                    <button className="text-red-400" onClick={() => deleteSchedule(idx)} type="button">
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Hours of Operation</h2>
          <div className="mb-4">
            {daysOfWeek.map((day, idx) => (
              <div key={day} className="flex items-center mb-2">
                <span className="w-24 text-white">{day}</span>
                <input className="p-2 rounded mr-2" type="time" value={hours[idx].open_time} onChange={(e) => handleHoursChange(idx, 'open_time', e.target.value)} />
                <span className="text-white mx-1">-</span>
                <input className="p-2 rounded mr-2" type="time" value={hours[idx].close_time} onChange={(e) => handleHoursChange(idx, 'close_time', e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}
      {step === 4 && gym && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Followers</h2>
          {/* Pending Followers */}
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Pending</h3>
          {followersLoading && <div className="text-gray-400">Loading followers...</div>}
          {followersError && <div className="text-red-400">{followersError}</div>}
          {pendingFollowers.length === 0 && !followersLoading && <div className="text-gray-400 mb-4">No pending followers.</div>}
          <ul className="divide-y divide-gray-700 mb-6">
            {pendingFollowers.map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <img
                  src={f.profiles?.avatar_url || '/default-avatar.png'}
                  alt={f.profiles?.first_name || 'User'}
                  className="w-12 h-12 rounded-full object-cover border border-gray-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">
                    {f.profiles?.first_name} {f.profiles?.last_name}
                  </div>
                </div>
                <button className="bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-700" onClick={() => handleApproveFollower(f)} type="button">
                  Approve
                </button>
              </li>
            ))}
          </ul>
          {/* Active Followers */}
          <h3 className="text-lg font-semibold text-green-400 mb-2">Active</h3>
          {activeFollowers.length === 0 && <div className="text-gray-400 mb-4">No active followers.</div>}
          <ul className="divide-y divide-gray-700 mb-6">
            {activeFollowers.map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <img
                  src={f.profiles?.avatar_url || '/default-avatar.png'}
                  alt={f.profiles?.first_name || 'User'}
                  className="w-12 h-12 rounded-full object-cover border border-gray-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">
                    {f.profiles?.first_name} {f.profiles?.last_name}
                  </div>
                </div>
                <button className="bg-yellow-600 text-white px-3 py-1 rounded font-bold hover:bg-yellow-700" onClick={() => handleToggleActive(f, false)} type="button">
                  Deactivate
                </button>
              </li>
            ))}
          </ul>
          {/* Inactive Followers */}
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Inactive</h3>
          {inactiveFollowers.length === 0 && <div className="text-gray-400 mb-4">No inactive followers.</div>}
          <ul className="divide-y divide-gray-700">
            {inactiveFollowers.map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <img
                  src={f.profiles?.avatar_url || '/default-avatar.png'}
                  alt={f.profiles?.first_name || 'User'}
                  className="w-12 h-12 rounded-full object-cover border border-gray-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-white">
                    {f.profiles?.first_name} {f.profiles?.last_name}
                  </div>
                </div>
                <button className="bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-700" onClick={() => handleToggleActive(f, true)} type="button">
                  Activate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Persistent Save Button */}
      <div className="mt-8 flex flex-col gap-2">
        <button className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition" onClick={handleSave} type="button" disabled={saving}>
          {saving ? 'Saving...' : 'Save Gym Profile'}
        </button>
      </div>
      {/* Delete Gym Button (below all tabs, inside main container) */}
      {gym && (
        <div className="flex flex-col items-center mt-8">
          <button className="w-full bg-red-700 text-white px-4 py-2 rounded font-bold hover:bg-red-800" onClick={handleDeleteGym} type="button" disabled={saving}>
            Delete Gym
          </button>
        </div>
      )}
    </div>
  );
}
