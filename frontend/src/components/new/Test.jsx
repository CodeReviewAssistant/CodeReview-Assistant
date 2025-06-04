import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios'; // For fetching data and performing actions

// --- SVG Icon Components (Assume they are defined as before) ---
const SearchIcon = () => <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const NewChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const FolderIcon = () => <svg className="h-5 w-5 mr-2 flex-shrink-0 text-gray-400 group-hover:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const NewFolderIcon = () => <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const LogoutIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const DarkModeIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const LightModeIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const DeleteIcon = () => <svg className="h-4 w-4 text-red-400 group-hover:text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const EllipsisVerticalIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>;
const PencilIcon = () => <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const TrashIconMini = () => <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PinSolidIcon = () => <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L3.707 10.707a1 1 0 01-1.414-1.414l6-6z" clipRule="evenodd" transform="rotate(-45 10 10)"/><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" /></svg>;
const CheckIcon = () => <svg className="h-4 w-4 text-green-500 hover:text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const XMarkIcon = () => <svg className="h-4 w-4 text-red-500 hover:text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
// --- END SVG Icon Components ---

// Define BASE_URL constant
const BASE_URL = 'http://localhost:8000'; // Ensure this points to your backend

const Sidebar = ({
  // UI Props
  darkMode,
  toggleDarkMode,
  sidebarOpen,
  toggleSidebar, // If sidebar needs internal close button
  // Search Props
  searchQuery,
  setSearchQuery,
  // User & Auth Props
  user,
  handleLogout,
  // Chat Props
  onSelectChat,
  selectedChatId = null,
  // Folder Props (Only need the modal trigger now)
  setShowNewFolderModal = () => {}, // Default function
  // Removed folder state/action props: folders, folderLoading, folderError, handlePinFolder, handleRenameFolder, handleDeleteFolder
}) => {

  // --- State for Chat List within Sidebar ---
  const [chatHistoryItems, setChatHistoryItems] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatError, setChatError] = useState(null);

  // --- State for Folder List within Sidebar ---
  const [folders, setFolders] = useState([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [folderError, setFolderError] = useState(null);

  // --- State for Folder Options Menu ---
  const [openFolderMenuId, setOpenFolderMenuId] = useState(null); // ID of folder whose menu is open
  const folderMenuRef = useRef(null);

  // --- State for Folder Renaming ---
  const [editingId, setEditingId] = useState(null); // Tracks ID of folder being renamed
  const [editName, setEditName] = useState(''); // Tracks the new name during editing
  const renameInputRef = useRef(null); // Ref for the rename input field

  // --- Function to fetch Chat List ---
  const fetchAllChats = useCallback(async () => {
      setIsLoadingChats(true);
      setChatError(null);
      console.log("Sidebar: Fetching all chats...");
      try {
          const response = await axios.get(`${BASE_URL}/redis_db/chat/getall`);
          const chatsData = response.data;
          if (!chatsData || typeof chatsData !== 'object') {
              throw new Error("Received unexpected data format for chats");
          }
          if (Object.keys(chatsData).length === 0) {
              setChatHistoryItems([]);
          } else {
              const transformedChats = Object.values(chatsData)
                  .map(jsonString => { try { return JSON.parse(jsonString); } catch { return null; } })
                  .filter(chat => chat && chat.chat_id && chat.name)
                  .map(chat => {
                      let formattedDate = "Date N/A";
                      try {
                          const timestamp = Number(chat.chat_id.split('_')[1]);
                          if (!isNaN(timestamp)) {
                              formattedDate = new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                          }
                      } catch { /* Ignore date errors */ }
                      return { id: chat.chat_id, title: chat.name, date: formattedDate, isPinned: chat.pin_status || false };
                  })
                  .sort((a, b) => {
                      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                      try {
                          const timeA = Number(a.id.split('_')[1] || 0);
                          const timeB = Number(b.id.split('_')[1] || 0);
                          return timeB - timeA;
                      } catch { return 0; }
                  });
              setChatHistoryItems(transformedChats);
          }
      } catch (err) {
          console.error("Sidebar: Error fetching chats:", err);
          if (err.response?.status === 404) {
              setChatHistoryItems([]);
          } else {
              setChatError('Failed to fetch chats. ' + (err.response?.data?.detail || err.message));
              setChatHistoryItems([]);
          }
      } finally {
          setIsLoadingChats(false);
      }
  }, []); // BASE_URL removed as it's constant now

  // --- Function to fetch Folder List ---
  const fetchAllFolders = useCallback(async () => {
    setIsLoadingFolders(true);
    setFolderError(null);
    console.log("Sidebar: Fetching all folders...");
    try {
        const response = await axios.get(`${BASE_URL}/redis_db/folder/getall`);
        const foldersData = response.data; // Assuming API returns an array of folder objects {id: string, name: string, isPinned?: boolean, chatCount?: number}
        if (!Array.isArray(foldersData)) {
             // Handle case where it might return an empty object {} or non-array
             if (typeof foldersData === 'object' && Object.keys(foldersData).length === 0) {
                 console.log("Sidebar: No folders found on server.");
                 setFolders([]); // Set to empty array if empty object received
             } else {
                 throw new Error("Received unexpected data format for folders");
             }
         } else {
              // Add default isPinned if missing and sort
              const processedFolders = foldersData.map(f => ({ ...f, isPinned: f.isPinned || false }))
                .sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return a.name.localeCompare(b.name); // Sort alphabetically after pinning
                });
              setFolders(processedFolders);
              console.log("Sidebar: Fetched and processed folders:", processedFolders);
         }
    } catch (err) {
        console.error("Sidebar: Error fetching folders:", err);
        if (err.response?.status === 404) {
            console.log("Sidebar: No folders found on server (404).");
            setFolders([]);
        } else {
            setFolderError('Failed to fetch folders. ' + (err.response?.data?.detail || err.message));
            setFolders([]);
        }
    } finally {
        setIsLoadingFolders(false);
    }
}, []); // BASE_URL removed as it's constant now

  // --- useEffect to Fetch Data on Component Mount ---
  useEffect(() => {
    fetchAllChats();
    fetchAllFolders(); // Fetch folders as well
  }, [fetchAllChats, fetchAllFolders]);


  // --- Delete Chat Handler ---
  const handleDeleteChat = async (chatIdToDelete, event) => {
    event.stopPropagation();
    const chatToDelete = chatHistoryItems.find(c => c.id === chatIdToDelete);
    if (!window.confirm(`Are you sure you want to delete chat "${chatToDelete?.title || chatIdToDelete}"?`)) {
      return;
    }
    setChatError(null);
    try {
      await axios.delete(`${BASE_URL}/redis_db/chat/delete/${chatIdToDelete}`);
      setChatHistoryItems(prev => prev.filter(chat => chat.id !== chatIdToDelete));
      if (chatIdToDelete === selectedChatId) {
        onSelectChat(null);
      }
    } catch (err) {
      console.error(`Error deleting chat ${chatIdToDelete}:`, err);
      setChatError(`Failed to delete chat. ${err.response?.data?.detail || err.message}`);
      setTimeout(() => setChatError(null), 5000);
    }
  };

  // --- Create New Chat Handler ---
  const createNewChat = async () => {
    console.info("Attempting to create new chat...");
    const simpleChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const chatData = {
      chat_id: simpleChatId, name: `New Chat ${simpleChatId.substring(5, 15)}`,
      messages: {}, folder_id: null, pin_status: false,
    };
    try {
      const response = await fetch(`${BASE_URL}/redis_db/chat/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chatData)
      });
      if (!response.ok) {
        let errorMsg = `Failed to create chat. Status: ${response.status}`;
        try { const errData = await response.json(); errorMsg = errData.detail || errorMsg; } catch(e) {}
        throw new Error(errorMsg);
      }
      await fetchAllChats();
      onSelectChat(simpleChatId);
    } catch (error) {
      console.error("Error creating new chat:", error);
      setChatError(error.message || "Network error while creating chat.");
      setTimeout(() => setChatError(null), 5000);
    }
  };

  // --- Filtering Logic ---
  const filteredChats = useMemo(() => {
    if (!searchQuery) return chatHistoryItems;
    return chatHistoryItems.filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, chatHistoryItems]);


  // --- Folder Menu Logic ---
  const toggleFolderMenu = (folderId, event) => {
    event.stopPropagation();
    setOpenFolderMenuId(prevId => (prevId === folderId ? null : folderId));
  };

  // --- Close folder menu if clicked outside ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFolderMenuId && folderMenuRef.current && !folderMenuRef.current.contains(event.target)) {
         const isToggleButton = event.target.closest('[data-folder-menu-button]');
         const isRenameInput = event.target.closest('[data-rename-input]'); // Prevent closing when clicking rename input
         if (!isToggleButton && !isRenameInput) {
             setOpenFolderMenuId(null);
         }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFolderMenuId]);

  // --- Focus Rename Input ---
  useEffect(() => {
      if (editingId && renameInputRef.current) {
          renameInputRef.current.focus();
          renameInputRef.current.select(); // Select text for easy replacement
      }
  }, [editingId]);

  // --- Handle Folder Rename Save ---
  const handleSaveFolderName = async (folderId) => {
      const originalFolder = folders.find(f => f.id === folderId);
      if (!originalFolder || originalFolder.name === editName.trim()) {
          setEditingId(null); // Exit editing if name hasn't changed or folder not found
          return;
      }

      const newName = editName.trim();
      // Optimistic UI update
      setFolders(folders.map(f => f.id === folderId ? { ...f, name: newName } : f));
      setEditingId(null); // Exit editing mode immediately

      try {
          // Call backend to update the name
          // Assuming a PUT endpoint like /redis_db/folder/update/{folder_id}
          // which takes { name: newName } in the body
          await axios.put(`${BASE_URL}/redis_db/folder/update/${folderId}`, { name: newName });
          console.log(`Folder ${folderId} renamed to "${newName}" successfully.`);
          // No need to fetchAllFolders again if optimistic update is sufficient
      } catch (error) {
          console.error("Error renaming folder:", error);
          setFolderError(`Failed to rename folder. ${error.response?.data?.detail || error.message}`);
          // Revert optimistic update on error
          setFolders(folders.map(f => f.id === folderId ? originalFolder : f));
          setTimeout(() => setFolderError(null), 5000);
      }
  };

  // --- Handle Folder Rename Cancel ---
   const handleCancelRename = () => {
       setEditingId(null);
       setEditName(''); // Clear edit name state
   };

  // --- Handle folder actions: delete, pin, or rename ---
  const handleFolderAction = async (action, folderId) => { // Made async for await
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return; // Folder not found

    switch (action) {
      case 'delete':
        if (window.confirm(`Are you sure you want to delete folder "${folder.name}"? This might also delete associated chats depending on backend logic.`)) {
            setFolderError(null);
            try {
                // Call the backend DELETE endpoint then update local state
                await axios.delete(`${BASE_URL}/redis_db/folder/delete/${folderId}`);
                console.log(`Folder ${folderId} deleted successfully.`);
                setFolders(folders.filter(f => f.id !== folderId));
                // Potentially refresh chats list if chats were deleted or unlinked
                // await fetchAllChats();
            } catch (error) {
                console.error("Error deleting folder:", error);
                setFolderError(`Failed to delete folder. ${error.response?.data?.detail || error.message}`);
                setTimeout(() => setFolderError(null), 5000);
            }
        }
        break;
      case 'pin':
        const newPinStatus = !folder.isPinned;
        // Optimistic UI Update
        setFolders(folders.map(f => f.id === folderId ? { ...f, isPinned: newPinStatus } : f)
            .sort((a, b) => { // Re-sort after pinning
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
        );
        setFolderError(null);
        try {
            // Call backend to update pin status
            // Assuming a PUT endpoint like /redis_db/folder/update/{folder_id}
            // which takes { pin_status: newPinStatus } in the body
            await axios.put(`${BASE_URL}/redis_db/folder/update/${folderId}`, { pin_status: newPinStatus });
            console.log(`Folder ${folderId} pin status updated to ${newPinStatus}.`);
        } catch (error) {
            console.error("Error updating folder pin status:", error);
            setFolderError(`Failed to update pin status. ${error.response?.data?.detail || error.message}`);
            // Revert optimistic update
            setFolders(folders.map(f => f.id === folderId ? { ...f, isPinned: !newPinStatus } : f)
                .sort((a, b) => { // Re-sort after reverting
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return a.name.localeCompare(b.name);
                })
            );
             setTimeout(() => setFolderError(null), 5000);
        }
        break;
      case 'rename':
        // Simply set the editing state so that the input field appears
        setEditingId(`${folderId}`); // Ensure it's a string if folderId isn't already
        setEditName(folder.name);
        // No backend call here, it happens in handleSaveFolderName
        break;
      default:
        break;
    }
    setOpenFolderMenuId(null); // Close the dropdown menu after action
  };


  // --- Render ---
  return (
    <div
      className={`flex flex-col h-full text-sm transition-all duration-300 ease-in-out ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-gray-700'} ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
    >
      {/* Inner container */}
      <div className="min-w-[16rem] flex flex-col h-full">

        {/* Header */}
        <div className={`px-3 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Chats</h2>
        </div>

        {/* Search */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                <input type="text" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-md text-sm ${darkMode ? 'bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 focus:ring-blue-500 focus:border-blue-500' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                />
            </div>
        </div>

        {/* New Chat Button */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <button onClick={createNewChat} className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <NewChatIcon /><span>New Chat</span>
          </button>
        </div>

        {/* Folders Section */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
            <h3 className={`text-xs font-semibold uppercase mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Folders</h3>
             <button onClick={() => setShowNewFolderModal(true)} className={`w-full flex items-center text-left py-1 px-1 rounded text-sm mb-1 ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <NewFolderIcon /><span>New Folder</span>
             </button>
             {isLoadingFolders && <div className="text-xs text-center py-1">Loading folders...</div>}
             {folderError && <div className="text-xs text-center py-1 text-red-500">{folderError}</div>}
             {!isLoadingFolders && !folderError && folders.map(folder => (
                 <div key={folder.id} className={`relative group flex items-center justify-between py-1 px-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${editingId === folder.id ? (darkMode ? 'bg-gray-750' : 'bg-slate-200') : ''}`}>
                    {/* Folder Info or Rename Input */}
                    <div className="flex items-center overflow-hidden flex-1 min-w-0 pr-2">
                        <FolderIcon />
                        {editingId === folder.id ? (
                            <div className="flex items-center w-full ml-1" data-rename-input> {/* Wrapper for input + buttons */}
                                <input
                                    ref={renameInputRef}
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={() => handleSaveFolderName(folder.id)} // Save on blur
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveFolderName(folder.id);
                                        if (e.key === 'Escape') handleCancelRename();
                                    }}
                                    className={`flex-grow px-1 py-0 text-sm rounded ${darkMode ? 'bg-gray-600 text-white' : 'bg-white text-black border border-gray-300'}`}
                                />
                                <button onClick={() => handleSaveFolderName(folder.id)} className="p-0.5 ml-1 rounded hover:bg-opacity-20 hover:bg-black">
                                     <CheckIcon />
                                </button>
                                <button onClick={handleCancelRename} className="p-0.5 ml-0.5 rounded hover:bg-opacity-20 hover:bg-black">
                                     <XMarkIcon />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="truncate text-sm ml-0">{folder.name}</span>
                                {folder.isPinned && <PinIcon />} {/* Show pin icon next to name if pinned */}
                                <span className={`text-xs ml-2 px-1.5 py-0.5 rounded flex-shrink-0 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                    {folder.chatCount || 0}
                                </span>
                            </>
                        )}
                    </div>

                     {/* Folder Options Button (only show if not editing) */}
                     {editingId !== folder.id && (
                        <div className="flex-shrink-0">
                            <button
                                data-folder-menu-button
                                onClick={(e) => toggleFolderMenu(folder.id, e)}
                                title="Folder options"
                                className={`p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 ${darkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'} ${openFolderMenuId === folder.id ? 'opacity-100' : ''}`}
                            >
                                <EllipsisVerticalIcon />
                            </button>
                        </div>
                     )}


                    {/* Folder Options Menu (Dropdown) */}
                    {openFolderMenuId === folder.id && editingId !== folder.id && ( // Don't show menu while editing
                        <div
                            ref={folderMenuRef}
                            className={`absolute right-0 top-full mt-1 w-36 rounded-md shadow-lg py-1 z-20 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} ring-1 ring-black ring-opacity-5 focus:outline-none`}
                            role="menu" aria-orientation="vertical"
                        >
                            <button onClick={(e) => { e.stopPropagation(); handleFolderAction('pin', folder.id); }} className={`flex items-center w-full text-left px-3 py-1.5 text-sm ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`} role="menuitem">
                                <PinSolidIcon /> {folder.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleFolderAction('rename', folder.id); }} className={`flex items-center w-full text-left px-3 py-1.5 text-sm ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`} role="menuitem">
                                <PencilIcon /> Rename
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleFolderAction('delete', folder.id); }} className={`flex items-center w-full text-left px-3 py-1.5 text-sm ${darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'}`} role="menuitem">
                                <TrashIconMini /> Delete
                            </button>
                        </div>
                    )}
                 </div>
             ))}
             {!isLoadingFolders && !folderError && folders.length === 0 && (
                <div className={`text-xs text-center py-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No folders created.</div>
             )}
        </div>


        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats && <div className="p-3 text-center text-xs">Loading chats...</div>}
          {chatError && <div className="p-3 text-center text-red-500 text-xs">{chatError}</div>}
          {!isLoadingChats && !chatError && filteredChats.length > 0 && filteredChats.map(chat => (
            <div key={chat.id} onClick={() => onSelectChat(chat.id)}
              className={`relative group px-3 py-2 cursor-pointer border-b block ${ darkMode ? `border-gray-700 ${selectedChatId === chat.id ? 'bg-gray-750' : 'hover:bg-gray-800'} text-gray-100` : `border-gray-200 ${selectedChatId === chat.id ? 'bg-slate-200' : 'hover:bg-slate-100'} text-gray-900` }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium truncate pr-6">{chat.title}</span>
                {chat.isPinned && <PinIcon />}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{chat.date}</div>
              <button onClick={(e) => handleDeleteChat(chat.id, e)} title="Delete chat"
                  className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 z-10 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}`} >
                  <DeleteIcon />
              </button>
            </div>
          ))}
          {!isLoadingChats && !chatError && filteredChats.length === 0 && (
              <div className={`p-3 text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchQuery ? 'No matching chats found.' : 'No chats yet.'}
              </div>
          )}
        </div>

        {/* Footer: User Profile / Settings */}
        <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
              <div className="flex items-center overflow-hidden">
                 {user && <img src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`} alt={user.name || 'User'} className="h-7 w-7 rounded-full mr-2 flex-shrink-0" />}
                 <span className="text-sm font-medium truncate">{user?.name || 'User'}</span>
              </div>
            <div className="flex space-x-1">
                 <button onClick={toggleDarkMode} title="Toggle Theme" className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}> {darkMode ? <LightModeIcon /> : <DarkModeIcon />} </button>
                 <button onClick={handleLogout} title="Logout" className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-red-400 hover:text-red-300' : 'hover:bg-gray-200 text-red-500 hover:text-red-600'}`}><LogoutIcon /></button>
            </div>
          </div>
        </div>

      </div> {/* End of min-w container */}
    </div> // End of main sidebar div
  );
};

export default Sidebar;