import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react'; // Import the Github icon

// SettingsIcon is no longer needed as we'll use the Github icon directly

const ChatHeader = ({ darkMode, toggleSidebar, sidebarOpen, chatName = "Code Review Assistant" }) => {
  const navigate = useNavigate();

  return (
    <header className={`h-14 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-slate-200 bg-white'} flex items-center justify-center p-4 relative flex-shrink-0`}>
      {/* Sidebar Toggle Button (Left) */}
      <div className="absolute left-4">
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          className={`p-1 rounded-md ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Chat Title (Center) */}
      <div className="flex-1 text-center px-12 truncate">
           <h1 className={`text-lg font-semibold truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`} title={chatName}>
               {chatName}
           </h1>
      </div>

      {/* GitHub Integrations Button (Right) */}
      <div className="absolute right-4">
         <button
  onClick={() => {
    console.log('GitHub Integrations button clicked. User state in App.jsx should be checked. Cookie for Integrations page also matters.');
    console.log('Current browser URL before navigate:', window.location.href);
    navigate('/integrations');
  }}
  title="GitHub Integrations"
  className={`p-1.5 rounded-md ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
>
  <Github size={22} />
</button>
      </div>
    </header>
  );
};

export default ChatHeader;
