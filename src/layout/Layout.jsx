import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="container mx-auto max-w-5xl p-5">
      <Navbar />

      <Outlet />
    </div>
  );
}
