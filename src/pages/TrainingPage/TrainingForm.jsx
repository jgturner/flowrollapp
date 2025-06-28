import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';

const HOURS = [...Array.from({ length: 12 }, (_, i) => i + 1)];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const FORMATS = [
  { value: 'Gi', label: 'Gi' },
  { value: 'No-Gi', label: 'No-Gi' },
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
].map((opt) => ({ value: opt, label: opt }));

export default function TrainingForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editingSession = location.state?.session || null;

  // Default values
  const today = new Date();
  const [date, setDate] = useState(editingSession ? new Date(editingSession.date) : today);
  const [hour, setHour] = useState(editingSession ? editingSession.class_time?.split(':')[0] : '7');
  const [minute, setMinute] = useState(editingSession ? editingSession.class_time?.split(':')[1]?.slice(0, 2) : '00');
  const [ampm, setAmpm] = useState(editingSession ? (editingSession.class_time?.toLowerCase().includes('pm') ? 'PM' : 'AM') : 'PM');
  const [locationName, setLocationName] = useState(editingSession ? editingSession.location : '');
  const [format, setFormat] = useState(editingSession ? FORMATS.find((f) => f.value === editingSession.format_uniform) : null);
  const [category, setCategory] = useState(editingSession ? CATEGORY_OPTIONS.find((c) => c.value === editingSession.category) : null);
  const [classSummary, setClassSummary] = useState(editingSession ? editingSession.class_summary || '' : '');
  const [notes, setNotes] = useState(editingSession ? editingSession.notes || '' : '');
  const [sparring, setSparring] = useState(editingSession ? editingSession.sparring : false);
  const [rounds, setRounds] = useState(editingSession ? editingSession.rounds || '' : '');
  const [minutesPerRound, setMinutesPerRound] = useState(editingSession ? editingSession.minutes_per_round || '' : '');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!date) newErrors.date = 'Date is required.';
    if (!hour || !minute || !ampm) newErrors.class_time = 'Class time is required.';
    if (!locationName) newErrors.location = 'Location is required.';
    if (!format) newErrors.format = 'Please select a Format/Uniform.';
    if (!category) newErrors.category = 'Please select a Category.';
    if (classSummary.length > 500) newErrors.classSummary = 'Class summary must be 500 characters or less.';
    if (notes.length > 500) newErrors.notes = 'Notes must be 500 characters or less.';
    if (sparring) {
      if (!rounds) newErrors.rounds = 'Rounds is required when sparring is enabled.';
      if (!minutesPerRound) newErrors.minutesPerRound = 'Minutes per round is required when sparring is enabled.';
      if (rounds && (rounds < 1 || rounds > 10)) newErrors.rounds = 'Rounds must be between 1 and 10.';
      if (minutesPerRound && (minutesPerRound < 1 || minutesPerRound > 10)) newErrors.minutesPerRound = 'Minutes per round must be between 1 and 10.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const class_time = `${hour}:${minute} ${ampm}`;
    const sessionData = {
      user_id: user.id,
      date: date instanceof Date ? date.toISOString().split('T')[0] : date,
      class_time,
      location: locationName,
      format_uniform: format ? format.value : '',
      category: category ? category.value : '',
      class_summary: classSummary,
      notes,
      sparring,
      rounds: sparring ? Number(rounds) : null,
      minutes_per_round: sparring ? Number(minutesPerRound) : null,
    };
    let result;
    if (editingSession) {
      result = await supabase.from('training_session').update(sessionData).eq('id', editingSession.id).select();
    } else {
      result = await supabase.from('training_session').insert([sessionData]).select();
    }
    setLoading(false);
    if (result.error) {
      setErrors({ submit: result.error.message });
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate('/profile', { state: { tab: 'training' } });
      }, 1200);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-20 p-6 bg-black rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">{editingSession ? 'Edit Training Session' : 'Log Training Session'}</h2>
      <form onSubmit={handleSubmit} aria-label="Training session form">
        {/* Date */}
        <label className="block mb-2 font-semibold text-white" htmlFor="date">
          Date<span className="text-red-500">*</span>
        </label>
        <DatePicker
          id="date"
          selected={date}
          onChange={(date) => setDate(date)}
          dateFormat="yyyy-MM-dd"
          className="w-full mb-4 p-2 border rounded bg-black text-white"
          wrapperClassName="w-full"
          required
        />
        {errors.date && <div className="text-red-500 text-sm mb-2">{errors.date}</div>}

        {/* Class Time */}
        <label className="block mb-2 font-semibold text-white">
          Class Time<span className="text-red-500">*</span>
        </label>
        <div className="flex mb-4 gap-2">
          <select aria-label="Hour" className="p-2 border rounded bg-black text-white" value={hour} onChange={(e) => setHour(e.target.value)} required>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="self-center text-white">:</span>
          <select aria-label="Minute" className="p-2 border rounded bg-black text-white" value={minute} onChange={(e) => setMinute(e.target.value)} required>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select aria-label="AM/PM" className="p-2 border rounded bg-black text-white" value={ampm} onChange={(e) => setAmpm(e.target.value)} required>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
        {errors.class_time && <div className="text-red-500 text-sm mb-2">{errors.class_time}</div>}

        {/* Location */}
        <label className="block mb-2 font-semibold text-white" htmlFor="location">
          Location<span className="text-red-500">*</span>
        </label>
        <input id="location" type="text" className="w-full mb-4 p-2 border rounded" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
        {errors.location && <div className="text-red-500 text-sm mb-2">{errors.location}</div>}

        {/* Format/Uniform */}
        <label className="block mb-2 font-semibold text-white" htmlFor="format">
          Format/Uniform<span className="text-red-500">*</span>
        </label>
        <Select
          id="format"
          options={FORMATS}
          value={format}
          onChange={setFormat}
          className="mb-4"
          classNamePrefix="react-select-dark"
          styles={{
            control: (base, state) => ({
              ...base,
              backgroundColor: '#000',
              color: '#fff',
              borderColor: state.isFocused ? '#fff' : '#444',
              boxShadow: 'none',
              minHeight: '2.5rem',
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: '#000',
              color: '#fff',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? '#222' : '#000',
              color: '#fff',
            }),
            singleValue: (base) => ({ ...base, color: '#fff' }),
            input: (base) => ({ ...base, color: '#fff' }),
            placeholder: (base) => ({ ...base, color: '#aaa' }),
          }}
          placeholder="Select..."
          isSearchable={false}
        />
        {errors.format && <div className="text-red-500 text-sm mb-2">{errors.format}</div>}

        {/* Category */}
        <label className="block mb-2 font-semibold text-white" htmlFor="category">
          Category<span className="text-red-500">*</span>
        </label>
        <Select
          id="category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
          className="mb-4"
          classNamePrefix="react-select-dark"
          styles={{
            control: (base, state) => ({
              ...base,
              backgroundColor: '#000',
              color: '#fff',
              borderColor: state.isFocused ? '#fff' : '#444',
              boxShadow: 'none',
              minHeight: '2.5rem',
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: '#000',
              color: '#fff',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? '#222' : '#000',
              color: '#fff',
            }),
            singleValue: (base) => ({ ...base, color: '#fff' }),
            input: (base) => ({ ...base, color: '#fff' }),
            placeholder: (base) => ({ ...base, color: '#aaa' }),
          }}
          placeholder="Select..."
          isSearchable={true}
        />
        {errors.category && <div className="text-red-500 text-sm mb-2">{errors.category}</div>}

        {/* Class Summary */}
        <label className="block mb-2 font-semibold text-white" htmlFor="classSummary">
          Class Summary
        </label>
        <textarea
          id="classSummary"
          className="w-full mb-4 p-2 border rounded"
          value={classSummary}
          onChange={(e) => setClassSummary(e.target.value)}
          maxLength={500}
          rows={2}
        />
        <div className="text-xs text-gray-400 mb-2">{classSummary.length}/500</div>
        {errors.classSummary && <div className="text-red-500 text-sm mb-2">{errors.classSummary}</div>}

        {/* Notes */}
        <label className="block mb-2 font-semibold text-white" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" className="w-full mb-4 p-2 border rounded" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
        <div className="text-xs text-gray-400 mb-2">{notes.length}/500</div>
        {errors.notes && <div className="text-red-500 text-sm mb-2">{errors.notes}</div>}

        {/* Sparring */}
        <div className="flex items-center mb-4">
          <input id="sparring" type="checkbox" checked={sparring} onChange={(e) => setSparring(e.target.checked)} className="mr-2" />
          <label htmlFor="sparring" className="font-semibold text-white">
            Sparring
          </label>
        </div>

        {/* Rounds and Minutes per Round (conditional) */}
        {sparring && (
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block mb-2 font-semibold text-white" htmlFor="rounds">
                Rounds<span className="text-red-500">*</span>
              </label>
              <input
                id="rounds"
                type="number"
                min={1}
                max={10}
                className="w-full p-2 border rounded"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                required={sparring}
              />
              {errors.rounds && <div className="text-red-500 text-sm mb-2">{errors.rounds}</div>}
            </div>
            <div className="flex-1">
              <label className="block mb-2 font-semibold text-white" htmlFor="minutesPerRound">
                Minutes per Round<span className="text-red-500">*</span>
              </label>
              <input
                id="minutesPerRound"
                type="number"
                min={1}
                max={10}
                className="w-full p-2 border rounded"
                value={minutesPerRound}
                onChange={(e) => setMinutesPerRound(e.target.value)}
                required={sparring}
              />
              {errors.minutesPerRound && <div className="text-red-500 text-sm mb-2">{errors.minutesPerRound}</div>}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full border border-white text-white bg-black py-2 rounded hover:bg-white hover:text-black transition disabled:opacity-50 mt-2"
          disabled={loading}
        >
          {editingSession ? 'Update Session' : 'Log Session'}
        </button>
        <button
          type="button"
          className="w-full border border-gray-400 text-white bg-black py-2 rounded hover:bg-gray-800 transition mt-3"
          onClick={() => navigate('/profile', { state: { tab: 'training' } })}
        >
          Cancel
        </button>
        {errors.submit && <div className="text-red-500 text-sm mt-2">{errors.submit}</div>}
        {success && <div className="text-green-600 text-center mt-4">Training session logged successfully!</div>}
      </form>
    </div>
  );
}
