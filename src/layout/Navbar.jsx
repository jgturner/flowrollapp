import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import LogOut from './Logout';
import Avatar from '../components/Avatar';

export default function Navbar() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth > 1024) {
        setIsOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  function linkClicked() {
    setIsOpen(false);
  }

  return (
    <header className="flex flex-col lg:flex-row justify-between pt-3 lg:mb-6">
      <div className="flex justify-between items-center">
        <Link to="/">
          <img src={logo} alt="logo" width="50" />
        </Link>
        {/* Mobile menu trigger: Avatar if logged in, hamburger if not */}
        {user ? (
          <div className="block lg:hidden cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <Avatar url={user.user_metadata?.avatar_url} name={user.user_metadata?.full_name || user.email} size={60} />
          </div>
        ) : (
          <button className="block lg:hidden cursor-pointer p-2" aria-label="Open menu" onClick={() => setIsOpen(!isOpen)} type="button">
            {/* Simple hamburger icon */}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* DESKTOP NAVIGATION */}

      <nav className={`font-bold lg:flex lg:flex-row hidden items-center gap-4`}>
        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/">Videos</Link>
            <Link to="/playlist">Playlist</Link>
            <Link to="/gyms">Gyms</Link>
            <Link to="/training">Training</Link>
            <Link to="/stats">Stats</Link>
            <Link to="/profile">
              <Avatar url={user.user_metadata?.avatar_url} name={user.user_metadata?.full_name || user.email} size={60} />
            </Link>
          </>
        )}
      </nav>

      {/* MOBILE FULL-PAGE OVERLAY NAVIGATION */}
      <div
        className={`fixed top-0 right-0 h-full w-full bg-black text-white z-50 transition-transform duration-300 ease-in-out lg:hidden flex flex-col items-center pt-20 gap-8 font-bold text-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ boxShadow: isOpen ? '-2px 0 8px rgba(0,0,0,0.1)' : 'none' }}
      >
        <button className="absolute top-6 right-6 text-3xl p-2 text-white" aria-label="Close menu" onClick={() => setIsOpen(false)} type="button">
          &times;
        </button>
        {!user ? (
          <div className="flex flex-col gap-8 items-center w-full">
            <Link to="/login" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Login
            </Link>
            <Link to="/register" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Register
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8 items-center w-full">
            <Link to="/" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Videos
            </Link>
            <Link to="/playlist" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Playlist
            </Link>
            <Link to="/gyms" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Gyms
            </Link>
            <Link to="/training" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Training
            </Link>
            <Link to="/stats" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Stats
            </Link>
            <Link to="/profile" onClick={linkClicked} className="w-full text-center py-2 hover:bg-gray-800 text-white">
              Profile
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
