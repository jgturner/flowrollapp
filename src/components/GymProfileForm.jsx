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
    days_of_week: [],
    start_time: '',
    end_time: '',
    instructor: '',
    is_private: false,
    is_open_mat: false,
  });
  const [editingScheduleIdx, setEditingScheduleIdx] = useState(null);
  const [hours, setHours] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersError, setFollowersError] = useState('');
  const [followerSearch, setFollowerSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAllGymData() {
      if (gym && gym.id) {
        setFormData({
          name: gym.name || '',
          address: gym.address || '',
          photo: gym.photo_url || '',
          schedule: [],
          hours: [],
        });
        // Fetch schedule
        const { data: scheduleData, error: scheduleError } = await supabase.from('gym_schedules').select('*').eq('gym_id', gym.id);
        // Fetch hours
        const { data: hoursData, error: hoursError } = await supabase.from('gym_hours').select('*').eq('gym_id', gym.id).order('day_of_week', { ascending: true });
        if (!scheduleError && scheduleData) {
          setFormData((prev) => ({ ...prev, schedule: scheduleData }));
        }
        if (!hoursError && hoursData) {
          const hoursArr = daysOfWeek.map((_, idx) => {
            const found = hoursData.find((h) => h.day_of_week === idx);
            return found
              ? {
                  day_of_week: idx,
                  open_time: found.closed && (found.closed === true || found.closed === 'true' || found.closed === 1) ? '' : found.open_time,
                  close_time: found.closed && (found.closed === true || found.closed === 'true' || found.closed === 1) ? '' : found.close_time,
                  closed: Boolean(found && (found.closed === true || found.closed === 'true' || found.closed === 1)),
                }
              : { day_of_week: idx, open_time: '', close_time: '', closed: false };
          });
          setHours(hoursArr);
        }
      }
    }
    fetchAllGymData();
  }, [gym]);

  // Fetch followers when Followers tab is selected
  useEffect(() => {
    async function fetchFollowers() {
      if (gym && step === 4) {
        setFollowersLoading(true);
        setFollowersError('');
        // Get all followers for this gym
        const { data, error } = await supabase
          .from('gym_followers')
          .select('id, user_id, status, active, profiles: user_id (id, first_name, last_name, avatar_url, belt_verified, belt_verified_by)')
          .eq('gym_id', gym.id);
        if (error) {
          setFollowersError('Failed to load followers');
          setFollowers([]);
        } else {
          // Fetch belt_level for each user_id
          const userIds = (data || []).map((f) => f.user_id);
          let beltLevels = {};
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase.from('profiles').select('id, belt_level').in('id', userIds);
            if (profilesData) {
              profilesData.forEach((p) => {
                beltLevels[p.id] = p.belt_level;
              });
            }
          }
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
                  belt_level: beltLevels[f.user_id] || null,
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
    if (name === 'days_of_week') {
      const day = parseInt(value, 10);
      setScheduleEntry((prev) => ({
        ...prev,
        days_of_week: checked ? [...prev.days_of_week, day] : prev.days_of_week.filter((d) => d !== day),
      }));
    } else {
      setScheduleEntry({
        ...scheduleEntry,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
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
    setScheduleEntry({ class_name: '', days_of_week: [], start_time: '', end_time: '', instructor: '', is_private: false, is_open_mat: false });
  };
  const editSchedule = (idx) => {
    setScheduleEntry(formData.schedule[idx]);
    setEditingScheduleIdx(idx);
  };
  const deleteSchedule = (idx) => {
    const updated = formData.schedule.filter((_, i) => i !== idx);
    setFormData({ ...formData, schedule: updated });
    setEditingScheduleIdx(null);
    setScheduleEntry({ class_name: '', days_of_week: [], start_time: '', end_time: '', instructor: '', is_private: false, is_open_mat: false });
  };

  // --- Hours Handlers ---
  const handleHoursChange = (idx, field, value) => {
    const updated = [...hours];
    if (field === 'closed') {
      updated[idx].closed = value;
      if (value) {
        updated[idx].open_time = '';
        updated[idx].close_time = '';
      }
    } else {
      updated[idx][field] = value;
    }
    setHours(updated);
  };

  // --- Save Handler ---
  const handleSave = async () => {
    if (saving) return; // Prevent double submission
    setSaving(true);

    // 1. Save or update gym
    let gymId = gym?.id;
    let result;
    let created = false;

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

    if (result.error || !gymId) {
      alert('Error saving gym: ' + (result.error?.message || 'Unknown error'));
      setSaving(false);
      return;
    }

    // 2. Delete old schedules/hours if editing
    if (gym) {
      await supabase.from('gym_schedules').delete().eq('gym_id', gymId);
      await supabase.from('gym_hours').delete().eq('gym_id', gymId);
    }

    // 3. Insert new schedules
    for (const sched of formData.schedule) {
      try {
        if (!sched.class_name || !sched.start_time || !sched.end_time || !sched.instructor) {
          alert('Please fill out all required fields for each class.');
          setSaving(false);
          return;
        }
        const daysArr = Array.isArray(sched.days_of_week) ? sched.days_of_week.map((d) => parseInt(d, 10)).filter((d) => !isNaN(d)) : [];
        if (daysArr.length === 0) {
          alert('Please select at least one day of the week for each class.');
          setSaving(false);
          return;
        }
        const schedulePayload = {
          gym_id: gymId,
          class_name: sched.class_name,
          days_of_week: daysArr,
          start_time: sched.start_time,
          end_time: sched.end_time,
          instructor: sched.instructor,
          is_private: !!sched.is_private,
          is_open_mat: !!sched.is_open_mat,
        };
        const { error: scheduleInsertError } = await supabase.from('gym_schedules').insert(schedulePayload);
        if (scheduleInsertError) {
          alert('Error saving schedule: ' + scheduleInsertError.message);
          setSaving(false);
          return;
        }
      } catch (err) {
        alert('Unexpected error saving schedule: ' + err.message);
        setSaving(false);
        return;
      }
    }

    // 4. Insert new hours (save all 7 days, even if closed or empty)
    // Always delete all previous hours for this gym before inserting new ones
    await supabase.from('gym_hours').delete().eq('gym_id', gymId);
    for (let idx = 0; idx < 7; idx++) {
      const h = hours[idx] || { day_of_week: idx, open_time: '', close_time: '', closed: false };
      let hoursPayload;
      if (h.closed) {
        hoursPayload = {
          gym_id: gymId,
          day_of_week: idx,
          closed: true,
          open_time: null,
          close_time: null,
        };
      } else if (h.open_time && h.close_time) {
        hoursPayload = {
          gym_id: gymId,
          day_of_week: idx,
          open_time: h.open_time,
          close_time: h.close_time,
          closed: false,
        };
      } else {
        // Save as open but with empty times
        hoursPayload = {
          gym_id: gymId,
          day_of_week: idx,
          open_time: null,
          close_time: null,
          closed: false,
        };
      }
      const { error: hoursInsertError } = await supabase.from('gym_hours').insert(hoursPayload);
      if (hoursInsertError) {
        alert('Error saving hours: ' + hoursInsertError.message);
        setSaving(false);
        return;
      }
    }

    // 5. Success
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

  // Add handler for toggling belt verification
  async function handleToggleBeltVerified(follower, checked) {
    console.log('Checkbox toggled', follower, checked);
    console.log('Updating user_id:', follower.user_id);
    console.log('Current user (belt_verified_by):', user?.id);

    const updateObj = checked ? { belt_verified: true, belt_verified_by: user?.id } : { belt_verified: false, belt_verified_by: null };
    console.log('Update object:', updateObj);

    const { data, error } = await supabase.from('profiles').update(updateObj).eq('id', follower.user_id);
    console.log('Supabase update result:', { data, error });

    if (error) {
      alert('Failed to update belt verification: ' + error.message);
      console.error('Database update error:', error);
      return;
    }

    console.log('Database update successful');

    // Update state immediately
    setFollowers((prev) =>
      prev.map((f) =>
        f.id === follower.id
          ? {
              ...f,
              profiles: {
                ...f.profiles,
                belt_verified: checked,
                belt_verified_by: checked ? user?.id : null,
              },
            }
          : f
      )
    );
  }

  // Split followers into lists
  const pendingFollowers = followers.filter((f) => f.status === 'pending');
  const activeFollowers = followers.filter((f) => f.status === 'approved' && f.active);
  const inactiveFollowers = followers.filter((f) => f.status === 'approved' && !f.active);

  // Filter followers by search query (case-insensitive, matches first or last name)
  const filterFollowers = (list) =>
    list.filter((f) => {
      const name = `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.toLowerCase();
      return name.includes(followerSearch.toLowerCase());
    });

  return (
    <div className="bg-black  rounded-lg">
      {successMsg && <div className="bg-green-700 text-white p-3 mb-4 rounded text-center font-bold animate-pulse">{successMsg}</div>}
      {/* Step Navigation */}
      <div className="flex justify-center gap-2 mb-6 border-b border-gray-700">
        <button
          className={`px-4 py-1 font-semibold transition border-b-2 ${step === 1 ? 'border-white text-white' : 'border-transparent text-white'}`}
          onClick={() => setStep(1)}
          type="button"
        >
          Gym Info
        </button>
        <button
          className={`px-4 py-1 font-semibold transition border-b-2 ${step === 2 ? 'border-white text-white' : 'border-transparent text-white'}`}
          onClick={() => setStep(2)}
          type="button"
        >
          Schedule
        </button>
        <button
          className={`px-4 py-1 font-semibold transition border-b-2 ${step === 3 ? 'border-white text-white' : 'border-transparent text-white'}`}
          onClick={() => setStep(3)}
          type="button"
        >
          Hours
        </button>
        {gym && (
          <button
            className={`px-4 py-1 font-semibold transition border-b-2 ${step === 4 ? 'border-white text-white' : 'border-transparent text-white'}`}
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
          <label className="block text-white font-bold mb-1">Gym Name</label>
          <input className="w-full mb-3 p-2 rounded border border-white" name="name" placeholder="Gym Name" value={formData.name} onChange={handleChange} />
          <label className="block text-white font-bold mb-1">Gym Address</label>
          <input className="w-full mb-3 p-2 rounded border border-white" name="address" placeholder="Gym Address" value={formData.address} onChange={handleChange} />
          <div className="mb-3">
            <label className="block text-white font-bold mb-1">Gym Photo</label>
            <input type="file" name="photo" className="w-full border border-white mb-3 p-2 rounded" onChange={handlePhotoChange} disabled={uploading} />
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
            <label className="block text-white font-bold mb-1">Class Name</label>
            <input
              className="w-full mb-3 p-2 rounded border border-white"
              name="class_name"
              placeholder="Class Name"
              value={scheduleEntry.class_name}
              onChange={handleScheduleChange}
            />
            <label className="block text-white font-bold mb-1">Days of Week</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {daysOfWeek.map((d, idx) => (
                <label key={d} className="text-white flex items-center font-normal">
                  <input
                    type="checkbox"
                    name="days_of_week"
                    value={idx}
                    checked={scheduleEntry.days_of_week.includes(idx)}
                    onChange={handleScheduleChange}
                    className="mr-1"
                  />
                  {d}
                </label>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="block text-white font-bold mb-1">Start Time</label>
                <input
                  className="w-full mb-3 p-2 rounded border border-white"
                  name="start_time"
                  type="time"
                  value={scheduleEntry.start_time}
                  onChange={handleScheduleChange}
                />
              </div>
              <div className="flex-1">
                <label className="block text-white font-bold mb-1">End Time</label>
                <input
                  className="w-full mb-3 p-2 rounded border border-white"
                  name="end_time"
                  type="time"
                  value={scheduleEntry.end_time}
                  onChange={handleScheduleChange}
                />
              </div>
            </div>
            <label className="block text-white font-bold mb-1">Instructor</label>
            <input
              className="w-full mb-3 p-2 rounded border border-white"
              name="instructor"
              placeholder="Instructor"
              value={scheduleEntry.instructor}
              onChange={handleScheduleChange}
            />
            <label className="block text-white font-bold mb-1">Options</label>
            <div className="flex gap-4 mb-3">
              <label className="text-white flex items-center font-normal">
                <input type="checkbox" name="is_private" checked={scheduleEntry.is_private} onChange={handleScheduleChange} className="mr-2" />
                Private Class
              </label>
              <label className="text-white flex items-center font-normal">
                <input type="checkbox" name="is_open_mat" checked={scheduleEntry.is_open_mat} onChange={handleScheduleChange} className="mr-2" />
                Open Mat
              </label>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={addOrUpdateSchedule} type="button">
              {editingScheduleIdx !== null ? 'Update' : 'Add'} Class
            </button>
            {editingScheduleIdx !== null && (
              <button
                className="bg-gray-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setEditingScheduleIdx(null);
                  setScheduleEntry({ class_name: '', days_of_week: [], start_time: '', end_time: '', instructor: '', is_private: false, is_open_mat: false });
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
                    <b>{sched.class_name}</b> - {sched.days_of_week.map((d) => daysOfWeek[d]).join(', ')}, {sched.start_time} - {sched.end_time} ({sched.instructor}){' '}
                    {sched.is_private && <span className="text-yellow-400">[Private]</span>}
                    {sched.is_open_mat && <span className="text-green-400 ml-2">[Open Mat]</span>}
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
              <div key={day} className="flex items-center mb-3">
                <span className="w-24 text-white font-bold">{day}</span>
                {hours[idx].closed ? (
                  <div className="flex-1 mr-2">
                    <span className="font-bold text-white">Closed</span>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 mr-2">
                      <label className="block text-white font-bold mb-1">Open Time</label>
                      <input
                        className="w-full mb-3 p-2 rounded border border-white"
                        type="time"
                        value={hours[idx].open_time}
                        onChange={(e) => handleHoursChange(idx, 'open_time', e.target.value)}
                      />
                    </div>
                    <span className="text-white mx-1 font-bold">-</span>
                    <div className="flex-1 mr-2">
                      <label className="block text-white font-bold mb-1">Close Time</label>
                      <input
                        className="w-full mb-3 p-2 rounded border border-white"
                        type="time"
                        value={hours[idx].close_time}
                        onChange={(e) => handleHoursChange(idx, 'close_time', e.target.value)}
                      />
                    </div>
                  </>
                )}
                <label className="flex items-center ml-2">
                  <input type="checkbox" checked={hours[idx].closed} onChange={(e) => handleHoursChange(idx, 'closed', e.target.checked)} className="mr-1" />
                  <span className="text-white font-bold">Closed</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      {step === 4 && gym && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">Followers</h2>
          {/* Search Bar */}
          <input
            className="w-full mb-4 p-2 rounded border border-white text-gray-200 placeholder:text-gray-300"
            type="text"
            placeholder="Search followers by name..."
            value={followerSearch}
            onChange={(e) => setFollowerSearch(e.target.value)}
          />
          {/* Pending Followers */}
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">Pending</h3>
          {followersLoading && <div className="text-gray-400">Loading followers...</div>}
          {followersError && <div className="text-red-400">{followersError}</div>}
          {filterFollowers(pendingFollowers).length === 0 && !followersLoading && <div className="text-gray-500 mb-4">No pending followers.</div>}
          <ul className="divide-y divide-gray-700 mb-6">
            {filterFollowers(pendingFollowers).map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <a href={`/public-profile/${f.user_id}`} className="hover:underline" title="View Public Profile">
                  <img
                    src={f.profiles?.avatar_url || '/default-avatar.png'}
                    alt={f.profiles?.first_name || 'User'}
                    className="w-12 h-12 rounded-full object-cover border border-gray-500"
                  />
                </a>
                <div className="flex-1 flex flex-row items-center gap-4">
                  <a href={`/public-profile/${f.user_id}`} className="font-semibold text-white hover:underline" title="View Public Profile">
                    {f.profiles?.first_name} {f.profiles?.last_name}
                  </a>
                  {f.profiles?.belt_level && <span className="text-sm text-blue-300">[{f.profiles.belt_level} Belt]</span>}
                  <label className="text-sm text-white flex items-center gap-1">
                    <input type="checkbox" checked={!!f.profiles?.belt_verified} onChange={(e) => handleToggleBeltVerified(f, e.target.checked)} />
                    Verified
                  </label>
                </div>
                <button className="bg-green-600 text-white px-3 py-1 rounded font-bold hover:bg-green-700" onClick={() => handleApproveFollower(f)} type="button">
                  Approve
                </button>
              </li>
            ))}
          </ul>
          {/* Active Followers */}
          <h3 className="text-lg font-semibold text-green-400 mb-2">Active</h3>
          {filterFollowers(activeFollowers).length === 0 && <div className="text-gray-400 mb-4">No active followers.</div>}
          <ul className="divide-y divide-gray-700 mb-6">
            {filterFollowers(activeFollowers).map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <a href={`/public-profile/${f.user_id}`} className="hover:underline" title="View Public Profile">
                  <img
                    src={f.profiles?.avatar_url || '/default-avatar.png'}
                    alt={f.profiles?.first_name || 'User'}
                    className="w-12 h-12 rounded-full object-cover border border-gray-500"
                  />
                </a>
                <div className="flex-1 flex flex-row items-center gap-4">
                  <a href={`/public-profile/${f.user_id}`} className="font-semibold text-white hover:underline" title="View Public Profile">
                    {f.profiles?.first_name} {f.profiles?.last_name}
                  </a>
                  {f.profiles?.belt_level && <span className="text-sm ">{f.profiles.belt_level} Belt</span>}
                  <label className="text-sm text-white flex items-center gap-1">
                    <input type="checkbox" checked={!!f.profiles?.belt_verified} onChange={(e) => handleToggleBeltVerified(f, e.target.checked)} />
                    Verified
                  </label>
                </div>
                <button className="bg-yellow-600 text-white px-3 py-1 rounded font-bold hover:bg-yellow-700" onClick={() => handleToggleActive(f, false)} type="button">
                  Deactivate
                </button>
              </li>
            ))}
          </ul>
          {/* Inactive Followers */}
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Inactive</h3>
          {filterFollowers(inactiveFollowers).length === 0 && <div className="text-gray-400 mb-4">No inactive followers.</div>}
          <ul className="divide-y divide-gray-700">
            {filterFollowers(inactiveFollowers).map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-3">
                <a href={`/public-profile/${f.user_id}`} className="hover:underline" title="View Public Profile">
                  <img
                    src={f.profiles?.avatar_url || '/default-avatar.png'}
                    alt={f.profiles?.first_name || 'User'}
                    className="w-12 h-12 rounded-full object-cover border border-gray-500"
                  />
                </a>
                <div className="flex-1 flex flex-row items-center gap-4">
                  <a href={`/public-profile/${f.user_id}`} className="font-semibold text-white hover:underline" title="View Public Profile">
                    {f.profiles?.first_name} {f.profiles?.last_name}
                  </a>
                  {f.profiles?.belt_level && <span className="text-sm ">{f.profiles.belt_level} Belt</span>}
                  <label className="text-sm text-white flex items-center gap-1">
                    <input type="checkbox" checked={!!f.profiles?.belt_verified} onChange={(e) => handleToggleBeltVerified(f, e.target.checked)} />
                    Verified
                  </label>
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
        <button className="bg-black text-white border border-white px-4 py-2 rounded font-bold transition" onClick={handleSave} type="button" disabled={saving}>
          {saving ? 'Saving...' : 'Save Gym Profile'}
        </button>
      </div>
      {/* Delete Gym Button (below all tabs, inside main container) */}
      {gym && (
        <div className="flex flex-col items-center mt-3">
          <button className="w-full bg-black text-white border border-white px-4 py-2 rounded font-bold" onClick={handleDeleteGym} type="button" disabled={saving}>
            Delete Gym
          </button>
        </div>
      )}
    </div>
  );
}
