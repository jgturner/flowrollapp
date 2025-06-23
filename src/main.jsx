import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Technique from './Technique.jsx';
import Layout from './layout/Layout.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/AuthPages/Login.jsx';
import Register from './pages/AuthPages/Register.jsx';
import ResetPassword from './pages/AuthPages/ResetPassword.jsx';
import AddTechnique from './pages/TechniquePage/AddTechnique.jsx';
import Profile from './pages/ProfilePages/Profile.jsx';
import Playlist from './pages/PlaylistPages/Playlist.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a loading spinner
  return user ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<App />} />
            <Route path="technique/:id" element={<Technique />} />
            <Route path="/playlist" element={<Playlist />} />
            <Route path="/addTechnique" element={<AddTechnique />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
