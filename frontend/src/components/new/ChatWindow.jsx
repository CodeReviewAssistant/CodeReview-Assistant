import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage'; // Assuming ChatMessage component exists and is correctly implemented

// Receive messages and isLoading as props
const ChatWindow = ({ messages, user, darkMode, isLoading }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom whenever messages array changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    // Use darkMode prop for styling
    <div className={`flex-1 overflow-y-auto p-4 ${darkMode ? 'bg-gray-800' : 'bg-slate-50'}`}> {/* Adjusted background colors */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Map over the messages prop */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} user={user} darkMode={darkMode} />
        ))}
        {/* Show loading indicator based on the isLoading prop */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center">
              <img
                src="https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff" // Consider making this configurable or using a different placeholder
                alt="Assistant avatar"
                className="h-8 w-8 rounded-full"
              />
              {/* Use darkMode prop for styling */}
              <div className={`rounded-2xl mx-2 px-4 py-2 ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-slate-100 text-slate-800'}`}>
                {/* You can add a more sophisticated loading animation here */}
                <div className="typing-indicator">
                  <span>Processing...</span> {/* Generic message */}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;