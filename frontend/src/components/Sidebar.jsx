import React from 'react';
import SunIcon from './SunIcon';
import MoonIcon from './MoonIcon';
import MenuIcon from './MenuIcon';

const Sidebar = ({ 
  chats, 
  onNewChat, 
  onSelectChat, 
  currentChat, 
  darkMode,
  toggleTheme,
  sidebarCollapsed,
  toggleSidebar,
  folders
}) => {
  return (
    <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="my-chats">
          <svg className="chat-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <span>My Chats</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn theme-toggle" onClick={toggleTheme}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="icon-btn sidebar-toggle desktop-only" onClick={toggleSidebar}>
            <MenuIcon />
          </button>
        </div>
      </div>
      
      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#999">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input type="text" placeholder="Search" />
      </div>
      
      <div className="section-header">
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#999">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
          <span>Folders</span>
        </div>
        <div className="section-actions">
          <button className="icon-btn">+</button>
          <button className="icon-btn">✓</button>
        </div>
      </div>
      
      <div className="folders-list">
        {folders.map(folder => (
          <div key={folder.id} className="folder-item">
            <div className="folder-content">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#999">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <span className="folder-name">{folder.name}</span>
            </div>
            <button className="icon-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#999">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
      
      <div className="section-header">
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#999">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"/>
          </svg>
          <span>Chats</span>
        </div>
        <div className="section-actions">
          <button className="icon-btn">✓</button>
        </div>
      </div>
      
      <div className="chats-list">
        {chats.map((chat) => (
          <div 
            key={chat.id} 
            className={`chat-item ${currentChat && currentChat.id === chat.id ? 'selected' : ''}`}
            onClick={() => onSelectChat(chat)}
          >
            <div className="chat-content">
              <svg className="chat-icon" width="18" height="18" viewBox="0 0 24 24" fill="#999">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-desc">{chat.preview || chat.description}</div>
              </div>
            </div>
            <button className="icon-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#999">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="new-chat-btn" onClick={onNewChat}>
        <span>New chat</span>
        <button className="icon-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;