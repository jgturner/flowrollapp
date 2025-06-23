import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import logo from '../../assets/logo.png';

export default function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  //React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const handleLogin = async (formValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(formValues.email, formValues.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'There was an issue logging you in');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div>
        <div className="pt-36">
          <div className="w-3/4 md:w-1/2 lg:w-1/4 mx-auto px-5 md:px-0">
            <div>
              <img src={logo} alt="logo" width="100" className="mx-auto mb-3" />
            </div>

            <h3 className="mb-4 text-2xl font-bold text-center">Sign In</h3>

            <form className="w-full" onSubmit={handleSubmit(handleLogin)}>
              <div>
                <div className="flex items-center gap-4 justify-between">
                  <label className="mb-1">Email:</label>
                  {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                </div>

                <input
                  id="email"
                  type="text"
                  className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent autofill:bg-transparent focus:autofill:bg-transparent"
                  placeholder="E-mail"
                  {...register('email', {
                    required: 'Please enter your email address.',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Please enter a valid email.',
                    },
                  })}
                />
              </div>
              <div className="my-2 mb-4">
                <div className="flex items-center gap-4 justify-between">
                  <label className="mb-1">Password:</label>
                  {errors.password && <span className="text-red-500 text-xs">{errors.password.message}</span>}
                </div>
                <input
                  id="password"
                  type="password"
                  className="w-full  placeholder:text-white-900 text-white text-sm border border-slate-200 rounded px-3 py-1.5 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow bg-transparent"
                  placeholder="Password"
                  {...register('password', {
                    required: 'Please create a password',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md  py-1.5 px-4 border bg-white border-white text-center text-sm text-black transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-transparent hover:text-white active:shadow-none cursor-pointer disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
              {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            </form>
          </div>

          <Link to="/reset-password" className="block text-center mt-12">
            Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }
}
