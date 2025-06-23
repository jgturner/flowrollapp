import { useAuth } from '../context/AuthContext';

export default function LogOut({ setIsOpen }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    if (setIsOpen) setIsOpen(false);
  }

  if (user) {
    return (
      <span className="cursor-pointer" onClick={handleLogout}>
        Logout
      </span>
    );
  }
  return null;
}
