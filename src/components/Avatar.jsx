import React from 'react';

const Avatar = ({ url, name, onUpload, size = 32 }) => {
  const getInitials = (name) => {
    if (!name) return '';
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const style = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const fontSize = size / 2.5;

  return (
    <div
      className={`relative rounded-full flex items-center justify-center bg-gray-600 text-white font-bold ${onUpload ? 'cursor-pointer' : ''}`}
      style={style}
      onClick={onUpload}
    >
      {url ? <img src={url} alt={name} className="w-full h-full rounded-full object-cover" /> : <span style={{ fontSize: `${fontSize}px` }}>{getInitials(name)}</span>}
      {onUpload && (
        <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <span className="text-white text-sm">Change</span>
        </div>
      )}
    </div>
  );
};

export default Avatar;
