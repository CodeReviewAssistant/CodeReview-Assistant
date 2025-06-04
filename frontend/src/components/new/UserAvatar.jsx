import React from 'react';

const UserAvatar = ({ src, sender, name }) => (
  <img 
    src={src || `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff`}
    alt={`${name}'s avatar`}
    className={`h-8 w-8 rounded-full object-cover object-center ${sender === 'user' ? 'bg-blue-600' : ''}`}
    style={{ 
      imageRendering: 'crisp-edges', 
      width: '2rem', 
      height: '2rem', 
      minWidth: '2rem', 
      minHeight: '2rem',
      maxWidth: '2rem', 
      maxHeight: '2rem'
    }}
  />
);

export default UserAvatar;
