import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const POLL_INTERVAL = 20000; // 20 seconds

export default function VideoReadyPoller() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Session:', session);
    if (!session?.access_token) return;
    const interval = setInterval(async () => {
      console.log('Polling for pending uploads...');
      const pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
      console.log('Pending uploads:', pendingUploads);
      // Only poll for real upload IDs (not temp_)
      const realUploads = pendingUploads.filter((u) => u.uploadId && !u.uploadId.startsWith('temp_'));
      if (!realUploads.length) return;
      const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://mrpiclpwihtqzgywfocm.supabase.co';
      for (const { uploadId } of realUploads) {
        console.log('Checking uploadId:', uploadId);
        try {
          const res = await fetch(`${functionsUrl}/functions/v1/mux_poll_asset_info`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ upload_id: uploadId }),
          });
          const json = await res.json();
          console.log('Poll response for', uploadId, ':', json);
          if (json.ready && json.playback_id) {
            toast.success(
              <div>
                Your video is ready!
                <br />
                <button
                  onClick={() => {
                    toast.dismiss();
                    navigate(`/addTechnique/details/${uploadId}`, { state: { playbackId: json.playback_id, videoDuration: json.duration } });
                  }}
                  style={{ marginTop: 8, padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  Add Details
                </button>
              </div>,
              {
                position: 'top-center',
                autoClose: false,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: 'colored',
              }
            );
            const updated = pendingUploads.filter((u) => u.uploadId !== uploadId);
            localStorage.setItem('pendingUploads', JSON.stringify(updated));
          }
        } catch {
          // Ignore errors, try again next poll
        }
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [session, navigate]);
  return null;
}
