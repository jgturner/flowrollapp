import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, Navigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export default function RegisterForm() {
  const { user, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm();
  const password = watch('password');

  const onSubmit = async (formValues) => {
    setSubmitting(true);
    setError(null);

    // Convert height to meters
    const feet = parseInt(formValues.heightFt, 10);
    const inches = parseInt(formValues.heightIn, 10);
    const heightInMeters = feet * 0.3048 + inches * 0.0254;

    // Convert weight from lbs to kg
    const weightInKg = formValues.weight * 0.453592;

    try {
      await registerUser(formValues.email, formValues.password, {
        data: {
          full_name: `${formValues.firstName} ${formValues.lastName}`,
          belt_level: formValues.bjjBeltLevel,
          height: heightInMeters,
          weight: weightInKg,
          date_of_birth: formValues.dateOfBirth,
        },
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'There was a problem with your registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-20">
        <div className="xl:w-1/3 lg:w-2/3 sm:w-3/4 px-5 mx-auto mt-12">
          <div>
            <img src={logo} alt="logo" width="100" className="mx-auto mb-3" />
          </div>
          <div className="flex justify-center items-center">
            <h3 className="mb-4 text-2xl font-bold text-center">Sign Up</h3>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">Email:</label>
                {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
              </div>

              <input
                id="email"
                className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                type="text"
                {...register('email', {
                  required: 'Please enter your favorite email address.',
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: 'Please enter a valid email.',
                  },
                })}
              />
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">First Name:</label>
                {errors.firstName && <span className="text-red-500 text-xs">{errors.firstName.message}</span>}
              </div>

              <input
                id="firstName"
                className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                type="text"
                {...register('firstName', {
                  required: 'Please enter a first name.',
                  pattern: {
                    value: /^[a-zA-ZÀ-ÿ]+(([',. -][a-zA-ZÀ-ÿ ])?[a-zA-ZÀ-ÿ]*)*$/,
                    message: 'Only alphanumeric characters are allowed.',
                  },
                })}
              />
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">Last Name:</label>
                {errors.lastName && <span className="text-red-500 text-xs">{errors.lastName.message}</span>}
              </div>

              <input
                id="lastName"
                className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                type="text"
                {...register('lastName', {
                  required: 'Please enter a last name.',
                  pattern: {
                    value: /^[a-zA-ZÀ-ÿ]+(([',. -][a-zA-ZÀ-ÿ ])?[a-zA-ZÀ-ÿ]*)*$/,
                    message: 'Only alphanumeric characters are allowed.',
                  },
                })}
              />
            </div>
            <div className="mb-2">
              <label className="mb-1">Belt Level:</label>
              <select
                id="bjjBeltLevel"
                className="bg-black text-white w-full  placeholder:text-white-900  text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow "
                {...register('bjjBeltLevel', {
                  required: 'Please select a belt level.',
                })}
              >
                <option value="White">White</option>
                <option value="Blue">Blue</option>
                <option value="Purple">Purple</option>
                <option value="Brown">Brown</option>
                <option value="Black">Black</option>
              </select>
              {errors.bjjBeltLevel && <span className="text-red-500 text-xs">{errors.bjjBeltLevel.message}</span>}
            </div>
            <div className="mb-2">
              <label className="mb-1">Height:</label>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <div className="flex items-center gap-4 justify-between">
                    <label className="mb-1 text-sm">Feet:</label>
                    {errors.heightFt && <span className="text-red-500 text-xs">{errors.heightFt.message}</span>}
                  </div>
                  <select
                    id="heightFt"
                    className="bg-black text-white w-full placeholder:text-white-900 text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"
                    {...register('heightFt', { required: 'Ft is required' })}
                  >
                    <option value="">--</option>
                    <option value="3">3'</option>
                    <option value="4">4'</option>
                    <option value="5">5'</option>
                    <option value="6">6'</option>
                    <option value="7">7'</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <div className="flex items-center gap-4 justify-between">
                    <label className="mb-1 text-sm">Inches:</label>
                    {errors.heightIn && <span className="text-red-500 text-xs">{errors.heightIn.message}</span>}
                  </div>
                  <select
                    id="heightIn"
                    className="bg-black text-white w-full placeholder:text-white-900 text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow"
                    {...register('heightIn', { required: 'In is required' })}
                  >
                    <option value="">--</option>
                    {[...Array(12).keys()].map((i) => (
                      <option key={i} value={i}>
                        {i}"
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">Weight (lbs):</label>
                {errors.weight && <span className="text-red-500 text-xs">{errors.weight.message}</span>}
              </div>

              <input
                id="weight"
                className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                type="number"
                step="0.01"
                {...register('weight', {
                  required: 'Please enter your weight.',
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">Date of Birth:</label>
                {errors.dateOfBirth && <span className="text-red-500 text-xs">{errors.dateOfBirth.message}</span>}
              </div>

              <Controller
                control={control}
                name="dateOfBirth"
                rules={{ required: 'Please enter your date of birth.' }}
                render={({ field }) => (
                  <DatePicker
                    placeholderText="Select date"
                    onChange={(date) => field.onChange(date)}
                    selected={field.value}
                    className="w-full placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                  />
                )}
              />
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">Password:</label>
                {errors.password && <span className="text-red-500 text-xs">{errors.password.message}</span>}
              </div>

              <input
                id="password"
                className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                type="password"
                {...register('password', {
                  required: 'Please create a password',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-4 justify-between">
                <label className="mb-1">Confirm Password:</label>
                {errors.confirmPassword && <span className="text-red-500 text-xs">{errors.confirmPassword.message}</span>}
              </div>

              <input
                id="confirmPassword"
                className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                type="password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'The passwords do not match.',
                })}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-md  py-1.5 px-4 border bg-white border-white text-center text-sm text-black transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-transparent hover:text-white active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? 'Signing Up...' : 'Sign Up'}
            </button>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }
}
