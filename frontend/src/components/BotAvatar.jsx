import React from 'react';

const BotAvatar = () => {
  return (
    <div style={{ 
      width: '30px', 
      height: '30px', 
      borderRadius: '50%', 
      backgroundColor: '#10a37f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '16px',
      fontWeight: 'bold'
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

export default BotAvatar;