import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// Icons... (ensure PinIcon and PinSolidIcon are defined correctly)
const SearchIcon = () => <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const NewChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const FolderIcon = () => <svg className="h-5 w-5 mr-1 flex-shrink-0 text-gray-400 group-hover:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const NewFolderIcon = () => <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500 flex-shrink-0 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>; // Icon for Pinned status indicator
const LogoutIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const DarkModeIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const LightModeIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const DeleteIcon = () => <svg className="h-4 w-4 text-red-400 group-hover:text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const EllipsisVerticalIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>;
const PencilIcon = () => <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;
const TrashIconMini = () => <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PinSolidIcon = () => <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L3.707 10.707a1 1 0 01-1.414-1.414l6-6z" clipRule="evenodd" transform="rotate(-45 10 10)"/><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" /></svg>; // Icon for Folder Pin Menu Item
const PinIconButton = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> // Simple pin icon for button
const AddIcon = () => <svg className="h-4 w-4 text-green-500 group-hover:text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" ><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ChevronDownIcon = () => <svg className="h-4 w-4 mr-1 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ChevronRightIcon = () => <svg className="h-4 w-4 mr-1 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;


const Sidebar = ({
  // UI Props
  darkMode, toggleDarkMode, sidebarOpen, toggleSidebar,
  // Search Props
  searchQuery, setSearchQuery,
  // User & Auth Props
  user, handleLogout,
  // Chat List Props
  chatHistoryItems = [], chatLoading = true, chatError = null,
  createNewChat, onSelectChat, selectedChatId = null, handleDeleteChat,
  // Folder Props & Handlers
  folders = [], folderLoading = true, folderError = null,
  setShowNewFolderModal, handlePinFolder, handleRenameFolder, handleDeleteFolder,
  // Assign/Rename/Pin Chat Handlers
  onOpenAssignModal,
  onOpenRenameModal,
  handlePinChat, // <-- Prop for pinning chat
}) => {

  const [expandedFolderIds, setExpandedFolderIds] = useState(new Set());
  const [openFolderMenuId, setOpenFolderMenuId] = useState(null);
  const folderMenuRef = useRef(null);

  const toggleFolderExpansion = (folderId) => {
      setExpandedFolderIds(prev => {
          const newSet = new Set(prev);
          newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId);
          return newSet;
      });
  };

  const filteredUnassignedChats = useMemo(() => {
      const unassigned = chatHistoryItems.filter(chat => !chat.folderId);
      if (!searchQuery) return unassigned;
      return unassigned.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, chatHistoryItems]);

  const getChatsInFolder = useCallback((folderId) => {
      const inFolder = chatHistoryItems.filter(chat => chat.folderId === folderId);
       if (!searchQuery) return inFolder;
       return inFolder.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [chatHistoryItems, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => { if (openFolderMenuId && folderMenuRef.current && !folderMenuRef.current.contains(event.target) && !event.target.closest('[data-folder-menu-button]')) setOpenFolderMenuId(null); };
    document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFolderMenuId]);

  const onFolderPin = (folderId, event) => { event.stopPropagation(); handlePinFolder(folderId); setOpenFolderMenuId(null); };
  const onFolderRenameStart = (folderId, event) => { event.stopPropagation(); handleRenameFolder(folderId); setOpenFolderMenuId(null); };
  const onFolderDelete = (folderId, event) => { event.stopPropagation(); handleDeleteFolder(folderId); setOpenFolderMenuId(null); };

  // --- Helper to render chat item actions ---
  const renderChatActions = (chat) => (
     <div className="absolute top-1/2 right-1 transform -translate-y-1/2 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 z-10">
          {/* Pin Chat Button */}
          <button
              onClick={(e) => { e.stopPropagation(); handlePinChat(chat.id); }}
              title={chat.isPinned ? "Unpin chat" : "Pin chat"}
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-yellow-400' : 'hover:bg-gray-300 text-yellow-500'} ${chat.isPinned ? 'opacity-100' : 'opacity-70'}`} // Make more visible if pinned
          > <PinIconButton /> </button> {/* Simple pin icon */}

          {/* Rename Chat Button */}
          <button
              onClick={(e) => { e.stopPropagation(); onOpenRenameModal(chat); }}
              title="Rename chat"
              className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-300 text-gray-500'}`}
          > <PencilIcon /> </button>

          {/* Assign/Move to Folder Button */}
          {folders.length > 0 && (
               <button
                   onClick={(e) => { e.stopPropagation(); onOpenAssignModal(chat); }}
                   title={chat.folderId ? "Move folder" : "Assign folder"}
                   className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}`}
               > <AddIcon /> </button>
          )}
         {/* Chat Delete Button */}
         <button
             onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
             title="Delete chat"
             className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}`}
         > <DeleteIcon /> </button>
     </div>
  );


  return (
    <div className={`flex flex-col h-full text-sm transition-all duration-300 ease-in-out ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-gray-700'} ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="min-w-[16rem] flex flex-col h-full">
        {/* Header */}
        <div className={`px-3 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}> <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Chats</h2> </div>
        {/* Search */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}> <div className="relative"> <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <SearchIcon /> </div> <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-10 pr-4 py-2 rounded-md text-sm ${darkMode ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'} placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500`} /> </div> </div>
        {/* New Chat Button */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}> <button onClick={createNewChat} className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"> <NewChatIcon /> <span>New Chat</span> </button> </div>

        {/* Folders Section */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0 max-h-[35vh] overflow-y-auto`}>
             <div className="flex justify-between items-center mb-1 sticky top-0 bg-inherit z-10 py-1">
                <h3 className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Folders</h3>
                <button onClick={() => setShowNewFolderModal(true)} title="New Folder" className={`p-1 rounded text-xs ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}> <NewFolderIcon /> </button>
             </div>
             {folderLoading && <div className="text-xs text-center py-1">Loading...</div>}
             {folderError && <div className="text-xs text-center py-1 text-red-500">{folderError}</div>}
             {!folderLoading && !folderError && folders.length === 0 && <div className={`text-xs text-center py-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No folders.</div> }
             {!folderLoading && !folderError && folders.map(folder => {
                 const isExpanded = expandedFolderIds.has(folder.id);
                 const chatsInThisFolder = getChatsInFolder(folder.id);
                 return (
                     <div key={folder.id} className="mb-1 last:mb-0">
                        <div onClick={() => toggleFolderExpansion(folder.id)} className={`relative group flex items-center justify-between py-1 px-1 rounded cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${isExpanded ? (darkMode ? 'bg-gray-750' : 'bg-slate-100') : ''}`} >
                            <div className="flex items-center overflow-hidden flex-1 min-w-0 pr-2"> {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />} {folder.isPinned && <PinIcon />} <FolderIcon /> <span className="truncate text-sm ml-1">{folder.name}</span> <span className={`text-xs ml-auto px-1.5 py-0.5 rounded flex-shrink-0 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>{folder.chatCount || 0}</span> </div>
                            <div className="flex-shrink-0"> <button data-folder-menu-button onClick={(e) => { e.stopPropagation(); setOpenFolderMenuId(prev => prev === folder.id ? null : folder.id); }} title="Folder options" className={`p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ${darkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'} ${openFolderMenuId === folder.id ? 'opacity-100' : ''}`}> <EllipsisVerticalIcon /> </button> </div>
                            {openFolderMenuId === folder.id && ( <div ref={folderMenuRef} className={`absolute right-0 top-full mt-1 w-36 rounded-md shadow-lg py-1 z-20 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} ring-1 ring-black ring-opacity-5`}> <button onClick={(e) => onFolderPin(folder.id, e)} className={`flex items-center w-full text-left px-3 py-1.5 text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}> <PinSolidIcon /> {folder.isPinned ? 'Unpin' : 'Pin'} </button> <button onClick={(e) => onFolderRenameStart(folder.id, e)} className={`flex items-center w-full text-left px-3 py-1.5 text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}> <PencilIcon className='mr-2'/> Rename </button> <button onClick={(e) => onFolderDelete(folder.id, e)} className={`flex items-center w-full text-left px-3 py-1.5 text-sm ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'}`}> <TrashIconMini /> Delete </button> </div> )}
                        </div>
                        {isExpanded && (
                             <div className={`ml-4 pl-3 border-l ${darkMode ? 'border-gray-700' : 'border-gray-300'} py-1 max-h-40 overflow-y-auto`}>
                                {chatsInThisFolder.length === 0 && <div className={`p-1 text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}> No chats {searchQuery ? 'matching search' : ''}. </div> }
                                {chatsInThisFolder.map(chatInFolder => (
                                    <div key={chatInFolder.id} onClick={() => onSelectChat(chatInFolder.id)} title={chatInFolder.title} className={`relative group flex justify-between items-center text-xs px-2 py-1 my-0.5 rounded cursor-pointer truncate ${ darkMode ? `${selectedChatId === chatInFolder.id ? 'bg-gray-650 font-medium' : 'hover:bg-gray-700'}` : `${selectedChatId === chatInFolder.id ? 'bg-slate-200 font-medium' : 'hover:bg-slate-100'}` }`} >
                                         <span className="truncate flex-1 pr-20">{/* Increased padding */}
                                             {chatInFolder.isPinned && <PinIcon/>} {/* Show pin indicator inside folder too */}
                                             {chatInFolder.title}
                                         </span>
                                         {renderChatActions(chatInFolder)} {/* Render actions */}
                                    </div>
                                ))}
                             </div>
                         )}
                     </div>
                 );
             })}
        </div>

        {/* Unassigned Chat History List */}
        <div className="flex-1 overflow-y-auto pt-2">
          <h4 className={`px-3 text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chats</h4>
          {chatLoading && <div className="p-3 text-center text-xs">Loading...</div>}
          {chatError && <div className="p-3 text-center text-red-500 text-xs">{chatError}</div>}
          {!chatLoading && !chatError && filteredUnassignedChats.length === 0 && folders.length === 0 && <div className={`px-3 pt-2 text-center text-xs ${darkMode?'text-gray-400':'text-gray-500'}`}>No chats or folders.</div> }
          {!chatLoading && !chatError && filteredUnassignedChats.length === 0 && folders.length > 0 && !searchQuery && <div className={`px-3 pt-2 text-center text-xs ${darkMode?'text-gray-400':'text-gray-500'}`}>All chats are in folders.</div> }
          {!chatLoading && !chatError && filteredUnassignedChats.length === 0 && folders.length > 0 && searchQuery && <div className={`px-3 pt-2 text-center text-xs ${darkMode?'text-gray-400':'text-gray-500'}`}>No matching unassigned chats.</div> }

          {!chatLoading && !chatError && filteredUnassignedChats.map(chat => (
            <div key={chat.id} onClick={() => onSelectChat(chat.id)} className={`relative group px-3 py-2 cursor-pointer border-b block ${ darkMode ? `border-gray-700 ${selectedChatId === chat.id ? 'bg-gray-750' : 'hover:bg-gray-800'}` : `border-gray-200 ${selectedChatId === chat.id ? 'bg-slate-200' : 'hover:bg-slate-100'}` }`} >
              <div className="flex justify-between items-center mb-1">
                <span className={`flex items-center text-sm font-medium truncate pr-20 ${darkMode?'text-gray-100':'text-gray-900'}`}> {/* Increased padding */}
                     {chat.isPinned && <PinIcon/>} {/* Show pin indicator */}
                     {chat.title}
                 </span>
                 {/* Pinned icon was here, moved next to title */}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}> {chat.date} </div>
              {renderChatActions(chat)} {/* Render actions */}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
              <div className="flex items-center overflow-hidden"> {user && (<img src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`} alt={user.name || 'User'} className="h-7 w-7 rounded-full mr-2 shrink-0" />)} <span className="text-sm font-medium truncate">{user?.name || 'User'}</span> </div>
              <div className="flex space-x-1"> <button onClick={toggleDarkMode} title="Toggle Theme" className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}> {darkMode ? <LightModeIcon /> : <DarkModeIcon />} </button> <button onClick={handleLogout} title="Logout" className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-red-400 hover:text-red-300' : 'hover:bg-gray-200 text-red-500 hover:text-red-600'}`}> <LogoutIcon /> </button> </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;