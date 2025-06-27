import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Layout() {
  return (
    <div className="container mx-auto max-w-5xl p-5">
      <Navbar />
      <ToastContainer position="top-center" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      <Outlet />
    </div>
  );
}
