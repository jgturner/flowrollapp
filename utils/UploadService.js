// my-app/utils/UploadService.js
// Handles background video uploads and persists pending uploads in localStorage

const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://mrpiclpwihtqzgywfocm.supabase.co';

export function uploadVideoInBackground({ file, accessToken }) {
  // Generate a temporary ID for tracking before upload_id is known
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
  pendingUploads.push({ uploadId: tempId, createdAt: Date.now(), status: 'uploading' });
  localStorage.setItem('pendingUploads', JSON.stringify(pendingUploads));
  console.log('[UploadService] Started background upload. Temp ID:', tempId);

  // Start the upload in the background
  (async () => {
    try {
      console.log('[UploadService] Preparing FormData for upload...');
      const formData = new FormData();
      formData.append('video', file);
      console.log('[UploadService] Sending fetch to mux_upload_video_only...');
      const res = await fetch(`${functionsUrl}/functions/v1/mux_upload_video_only`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      console.log('[UploadService] Fetch response status:', res.status);
      const json = await res.json();
      console.log('[UploadService] Fetch response JSON:', json);
      if (res.ok && json.upload_id) {
        // Replace tempId with real upload_id
        const uploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
        const idx = uploads.findIndex((u) => u.uploadId === tempId);
        if (idx !== -1) {
          uploads[idx].uploadId = json.upload_id;
          uploads[idx].status = 'pending';
          localStorage.setItem('pendingUploads', JSON.stringify(uploads));
          console.log('[UploadService] Updated temp ID to real upload_id:', json.upload_id);
        }
      } else {
        // Remove tempId if upload failed
        const uploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
        localStorage.setItem('pendingUploads', JSON.stringify(uploads.filter((u) => u.uploadId !== tempId)));
        console.error('[UploadService] Upload failed, removed temp ID. Error:', json.error || 'Unknown error');
      }
    } catch (err) {
      // Remove tempId if upload failed
      const uploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
      localStorage.setItem('pendingUploads', JSON.stringify(uploads.filter((u) => u.uploadId !== tempId)));
      console.error('[UploadService] Background upload error:', err);
    }
  })();
}
