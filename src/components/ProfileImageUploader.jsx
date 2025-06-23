import React, { useState, useCallback } from 'react';
import Modal from 'react-modal';
import Cropper from 'react-easy-crop';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../utils/supabaseClient';

Modal.setAppElement('#root');

// Helper function to create a cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      blob.name = 'newFile.jpeg';
      resolve(new File([blob], 'profile.jpeg', { type: 'image/jpeg' }));
    }, 'image/jpeg');
  });
}

const ProfileImageUploader = ({ isOpen, onRequestClose, onUploadComplete }) => {
  const { user } = useAuth();
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImageSrc(reader.result);
      };
    }
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;

    setLoading(true);
    try {
      const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      const filePath = `${user.id}/profile.jpeg`;

      // Upload the file to storage, upserting if it already exists
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, croppedImageFile, {
        cacheControl: '3600',
        upsert: true,
      });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

      // Update the user's metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl },
      });

      if (updateError) {
        throw updateError;
      }

      onUploadComplete(newAvatarUrl);
      onRequestClose();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setLoading(false);
      setImageSrc(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Upload Profile Image"
      className="bg-gray-800 p-4 rounded-lg max-w-lg w-full mx-auto mt-20 text-white"
      overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start"
    >
      <h2 className="text-xl font-bold mb-4">Update Profile Picture</h2>
      <div className="mb-4">
        <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
      </div>
      {imageSrc && (
        <div className="relative h-64 w-full bg-gray-700 mb-4">
          <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
        </div>
      )}
      <div className="flex justify-end gap-4">
        <button onClick={onRequestClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-sm">
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading || !imageSrc} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm disabled:opacity-50">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
};

export default ProfileImageUploader;
