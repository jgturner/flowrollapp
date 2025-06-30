import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
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
import TechniqueDetailsForm from './components/TechniqueDetailsForm.jsx';
import TrainingForm from './pages/TrainingPage/TrainingForm.jsx';
import SingleSession from './pages/TrainingPage/SingleSession.jsx';
import GymsPage from './pages/GymsPage.jsx';
import SingleGymPage from './pages/SingleGymPage.jsx';
import Training from './pages/TrainingPage/Training.jsx';
import Stats from './pages/TrainingPage/Stats.jsx';
import ManageGymPage from './pages/ProfilePages/ManageGymPage.jsx';
import MyVideos from './pages/ProfilePages/MyVideos.jsx';
import PublicProfile from './pages/ProfilePages/PublicProfile.jsx';
import EditProfile from './pages/ProfilePages/EditProfile.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a loading spinner
  return user ? children : <Navigate to="/login" replace />;
}

function TechniqueDetailsFormWrapper() {
  const { uploadId } = useParams();
  const location = useLocation();
  const { playbackId, videoDuration } = location.state || {};
  return <TechniqueDetailsForm uploadId={uploadId} playbackId={playbackId} videoDuration={videoDuration} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route path="gyms" element={<GymsPage />} />
              <Route path="training" element={<Training />} />
              <Route path="stats" element={<Stats />} />
              <Route path="gym/:id" element={<SingleGymPage />} />
              <Route index element={<App />} />
              <Route path="technique/:id" element={<Technique />} />
              <Route path="playlist" element={<Playlist />} />
              <Route path="addTechnique" element={<AddTechnique />} />
              <Route path="profile" element={<Profile />} />
              <Route path="manage-gym" element={<ManageGymPage />} />
              <Route path="my-videos" element={<MyVideos />} />
              <Route path="public-profile/:userId" element={<PublicProfile />} />
              <Route path="edit-profile" element={<EditProfile />} />
              <Route path="addTechnique/details/:uploadId" element={<TechniqueDetailsFormWrapper />} />
              <Route path="training/new" element={<TrainingForm />} />
              <Route path="training/:id" element={<SingleSession />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);

export default AddTechnique;
