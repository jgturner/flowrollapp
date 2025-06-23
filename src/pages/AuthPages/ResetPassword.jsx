import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (formValues) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await resetPassword(formValues.email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'There was a problem sending the reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-36">
      <div className="xl:w-1/4 lg:w-1/2 md:w-1/2 sm:w-1/2 w-full px-5 flex mx-auto justify-center my-8">
        <div>
          <img src={logo} alt="logo" width="100" />
        </div>
      </div>
      <div className="lg:w-1/3 md:w-1/2 sm:w-3/4 px-5 mx-auto mt-12">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-4 text-2xl font-bold text-center">Reset Password</h3>
          </div>

          <div className="form-group">
            <label className="mb-1">Email:</label>
            <input
              id="email"
              className="form-control mb-2"
              type="email"
              {...register('email', {
                required: 'Please enter your email address.',
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: 'Please enter a valid email.',
                },
              })}
            />
            {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
          </div>

          <button type="submit" disabled={submitting} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            {submitting ? 'Sending...' : 'Send Reset Email'}
          </button>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2">Reset email sent! Please check your inbox.</div>}
        </form>
      </div>
    </div>
  );
}
