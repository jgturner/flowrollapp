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
        <div onClick={() => setIsOpen(!isOpen)} className="block lg:hidden">
          <span className={`bg-white block transition-all duration-300 ease-out h-[3px] w-8 ${isOpen ? 'rotate-45 translate-y-[3.5px]' : '-translate-y-0.5'}`}></span>
          <span className={`bg-white block transition-all duration-300 ease-out h-[3px] w-6  my-1 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
          <span
            className={`bg-white block transition-all duration-300 ease-out h-[3px] w-8 ${isOpen ? '-rotate-45 -translate-y-[10.5px] w-8' : 'translate-y-0.5'}`}
          ></span>
        </div>
      </div>

      {/* DESKTOP NAVIGATION */}

      <nav className={`font-bold lg:flex lg:flex-row hidden items-center gap-4`}>
        <Link to="/gyms">Gyms</Link>
        <Link to="/">Videos</Link>

        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link to="/profile">
              <Avatar url={user.user_metadata?.avatar_url} name={user.user_metadata?.full_name || user.email} size={60} />
            </Link>
          </>
        )}
      </nav>

      {/* MOBILE NAVIGATION */}

      <nav
        className={`lg:hidden items-center gap-4 font-bold transition-all duration-300 ease-in-out overflow-hidden  ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }
         flex flex-col lg:pt-6 pt-4`}
      >
        <Link to="/gyms" onClick={linkClicked}>
          Gyms
        </Link>
        <Link to="/" onClick={linkClicked}>
          Videos
        </Link>

        {!user ? (
          <div className="flex flex-col gap-4 items-center">
            <Link to="/login" onClick={linkClicked}>
              Login
            </Link>
            <Link to="/register" onClick={linkClicked}>
              Register
            </Link>
          </div>
        ) : (
          <div className="pb-5 flex flex-col items-center gap-4">
            {/* <Link to="/playlist" onClick={linkClicked}>
              Playlist
            </Link>
            <Link to="/addTechnique" onClick={linkClicked}>
              Add Technique
            </Link> */}
            {/* <LogOut setIsOpen={setIsOpen} /> */}
            <Link to="/profile" onClick={linkClicked}>
              <Avatar url={user.user_metadata?.avatar_url} name={user.user_metadata?.full_name || user.email} size={60} />
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
