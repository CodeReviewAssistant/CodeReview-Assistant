import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios'; // For fetching chat list and deleting chats

// --- SVG Icon Components (replace with your actual icon library if preferred) ---
const SearchIcon = () => <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const NewChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const FolderIcon = () => <svg className="h-5 w-5 mr-2 flex-shrink-0 text-gray-400 group-hover:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const NewFolderIcon = () => <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
const PinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const LogoutIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const DarkModeIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
const LightModeIcon = () => <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const DeleteIcon = () => <svg className="h-4 w-4 text-red-400 group-hover:text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
// -----------------------------------------------------------------------------

// Define BASE_URL constant
const BASE_URL = 'http://localhost:8000';

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
  createNewChat,
  onSelectChat,
  selectedChatId = null,
  // Folder Props
  folders = [],
  folderLoading = false,
  folderError = null,
  setShowNewFolderModal = () => {}, // Provide default
  // getAllFolders, // Not explicitly used here unless a refresh button is added
}) => {

  // --- State for Chat List within Sidebar ---
  const [chatHistoryItems, setChatHistoryItems] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatError, setChatError] = useState(null); // Use this for displaying chat list errors

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
        console.log("Sidebar: Chat history is empty.");
        setChatHistoryItems([]);
      } else {
        const transformedChats = Object.values(chatsData)
          .map(jsonString => {
            try {
              return JSON.parse(jsonString);
            } catch (parseError) {
              console.error("Sidebar: Failed to parse chat data string:", jsonString, parseError);
              return null;
            }
          })
          .filter(chat => chat && chat.chat_id && chat.name)
          .map(chat => {
            let formattedDate = "Date N/A";
            try {
              const timestampString = chat.chat_id.split('_')[1];
              if (timestampString) {
                const timestamp = Number(timestampString);
                if (!isNaN(timestamp)) {
                  const chatDate = new Date(timestamp);
                  formattedDate = chatDate.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                  });
                }
              }
            } catch (dateError) { /* Ignore date parsing errors */ }

            return {
              id: chat.chat_id,
              title: chat.name,
              date: formattedDate,
              isPinned: chat.pin_status || false,
            };
          })
          .sort((a, b) => {
              try {
                  const timeA = Number(a.id.split('_')[1] || 0);
                  const timeB = Number(b.id.split('_')[1] || 0);
                  return timeB - timeA; // Descending order (most recent first)
              } catch {
                  return 0;
              }
          });

        console.log("Sidebar: Fetched and transformed chats:", transformedChats);
        setChatHistoryItems(transformedChats);
      }
    } catch (err) {
      console.error("Sidebar: Error fetching chats:", err);
      if (err.response && err.response.status === 404) {
          console.log("Sidebar: No chats found on server (404).");
          setChatHistoryItems([]);
      } else {
          setChatError('Failed to fetch chats. ' + (err.response?.data?.detail || err.message));
          setChatHistoryItems([]);
      }
    } finally {
      setIsLoadingChats(false);
    }
  }, [BASE_URL]); // Dependency

  // Fetch chat list on component mount
  useEffect(() => {
    fetchAllChats();
  }, [fetchAllChats]);

  // --- Delete Chat Handler ---
  const handleDeleteChat = async (chatIdToDelete, event) => {
    event.stopPropagation(); // IMPORTANT: Prevent selecting chat when clicking delete

    if (!window.confirm(`Are you sure you want to delete chat "${chatHistoryItems.find(c=>c.id === chatIdToDelete)?.title || chatIdToDelete}"?`)) {
      return;
    }

    console.log(`Attempting to delete chat: ${chatIdToDelete}`);
    // Here you could set a specific loading state for the item being deleted if needed
    // setDeletingId(chatIdToDelete);
    setChatError(null); // Clear previous errors before attempting delete

    try {
      // Call the backend delete endpoint
      await axios.delete(`${BASE_URL}/redis_db/chat/delete/${chatIdToDelete}`);
      console.log(`Chat ${chatIdToDelete} deleted successfully from backend.`);

      // Update local state optimistically to remove the chat
      setChatHistoryItems(prev => prev.filter(chat => chat.id !== chatIdToDelete));

      // If the deleted chat was the currently selected one, inform the parent to deselect
      if (chatIdToDelete === selectedChatId) {
        onSelectChat(null); // Pass null to clear selection in ChatInterface
      }

    } catch (err) {
      console.error(`Error deleting chat ${chatIdToDelete}:`, err);
      // Display error to user
      setChatError(`Failed to delete chat. ${err.response?.data?.detail || err.message}`);
      // Set a timeout to clear the error after a few seconds
      setTimeout(() => setChatError(null), 5000);
    } finally {
      // Clear specific deleting state if used
      // setDeletingId(null);
    }
  };

    // --- useEffect to Fetch Data on Component Mount ---
    useEffect(() => {
      fetchAllChats();
    }, []);
  
  
  
    const createNewChat = async () => {
      console.info("Attempting to create new chat...");
      // Consider adding a specific loading state for the button if needed
  
      // Simple ID generation for the new chat
      const simpleChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const chatData = {
        chat_id: simpleChatId,
        name: `New Chat ${simpleChatId.substring(5, 15)}`, // Basic name
        messages: {}, // Start with empty messages
        folder_id: null,
        pin_status: false,
      };
  
      try {
        const response = await fetch(`${BASE_URL}/redis_db/chat/add`, { // Using your BASE_URL variable
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatData)
        });
  
        if (!response.ok) {
          // Handle API error specifically for creating chat
          let errorMsg = `Failed to create chat. Status: ${response.status}`;
           try {
               const errData = await response.json();
               errorMsg = errData.detail || errorMsg; // Attempt to get detail from backend error
           } catch(e) { /* Ignore if response body isn't JSON */ }
          console.error(errorMsg);
          // Optionally set a specific error state to display to the user
          // setError("Failed to create chat."); // Example using the existing error state
          return; // Stop if creation failed
        }
  
        console.info("New chat created successfully via API!");
  
        // --- KEY STEP: Refresh the chat list after successful creation ---
        // This ensures the UI updates with the new chat
        await fetchAllChats();
        // -----------------------------------------------------------------
  
      } catch (error) {
        // Handle network errors or other issues during the creation fetch
        console.error("Error creating new chat:", error);
        // Optionally set an error state
        // setError("Network error while creating chat.");
      } finally {
        // Turn off specific creation loading state if you added one
      }
    };

  // --- Filtering Logic ---
  const filteredChats = useMemo(() => {
    if (!searchQuery) {
      return chatHistoryItems;
    }
    return chatHistoryItems.filter(chat =>
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, chatHistoryItems]);

  // --- Render ---
  return (
    <div
      className={`flex flex-col h-full text-sm transition-all duration-300 ease-in-out ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-slate-50 text-gray-700'} ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
    >
      {/* Inner container prevents content collapsing when sidebar width is 0 */}
      <div className="min-w-[16rem] flex flex-col h-full">

        {/* Header */}
        <div className={`px-3 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            My Chats
          </h2>
        </div>

        {/* Search */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-md text-sm ${darkMode ? 'bg-gray-700 text-gray-100 placeholder-gray-400 border border-gray-600 focus:ring-blue-500 focus:border-blue-500' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
            />
          </div>
        </div>

        {/* New Chat Button */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <NewChatIcon />
            <span>New Chat</span>
          </button>
        </div>

        {/* Folders Section */}
        <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
            <h3 className={`text-xs font-semibold uppercase mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Folders</h3>
             <button
                onClick={() => setShowNewFolderModal(true)}
                className={`w-full flex items-center text-left py-1 px-1 rounded text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
             >
                <NewFolderIcon />
                <span>New Folder</span>
             </button>
             {folderLoading && <div className="text-xs text-center py-1">Loading folders...</div>}
             {folderError && <div className="text-xs text-center py-1 text-red-500">{folderError}</div>}
             {!folderLoading && !folderError && folders.map(folder => (
                 <div key={folder.id} className={`flex items-center justify-between group py-1 px-1 rounded cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <div className="flex items-center overflow-hidden">
                        <FolderIcon />
                        <span className="truncate text-sm">{folder.name}</span>
                    </div>
                    <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        {folder.chatCount || 0}
                    </span>
                 </div>
             ))}
        </div>


        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto"> {/* This part scrolls */}
          {isLoadingChats && <div className="p-3 text-center text-xs">Loading chats...</div>}
          {chatError && <div className="p-3 text-center text-red-500 text-xs">{chatError}</div>}
          {!isLoadingChats && !chatError && filteredChats.length > 0 && filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`relative group px-3 py-2 cursor-pointer border-b block ${ // group + relative for delete button positioning
                  darkMode
                      ? `border-gray-700 ${selectedChatId === chat.id ? 'bg-gray-750' : 'hover:bg-gray-800'} text-gray-100`
                      : `border-gray-200 ${selectedChatId === chat.id ? 'bg-slate-200' : 'hover:bg-slate-100'} text-gray-900`
              }`}
            >
              {/* Chat Info */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium truncate pr-6"> {/* Add padding-right to prevent overlap with delete button */}
                  {chat.title}
                </span>
                {chat.isPinned && (
                   <PinIcon />
                )}
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {chat.date}
              </div>

              {/* Delete Button */}
              <button
                  onClick={(e) => handleDeleteChat(chat.id, e)} // Pass event to stop propagation
                  title="Delete chat"
                  // Position absolute, center vertically, show on group hover
                  className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 z-10 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300'}`}
              >
                  <DeleteIcon />
              </button>

            </div> // End Chat Item Div
          ))}
          {/* Empty List Message */}
          {!isLoadingChats && !chatError && filteredChats.length === 0 && (
              <div className={`p-3 text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchQuery ? 'No matching chats.' : 'No chats yet.'}
              </div>
          )}
        </div>

        {/* Footer: User Profile / Settings */}
        <div className={`p-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}>
          <div className="flex items-center justify-between">
              <div className="flex items-center overflow-hidden">
                 {user && (
                     <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=random`} alt={user.name || 'User'} className="h-7 w-7 rounded-full mr-2 flex-shrink-0" />
                 )}
                 <span className="text-sm font-medium truncate">{user?.name || 'User'}</span>
              </div>

            <div className="flex space-x-1">
                 <button onClick={toggleDarkMode} title="Toggle Theme" className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                     {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                 </button>
                 <button onClick={handleLogout} title="Logout" className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-red-400 hover:text-red-300' : 'hover:bg-gray-200 text-red-500 hover:text-red-600'}`}>
                     <LogoutIcon />
                 </button>
            </div>
          </div>
        </div>

      </div> {/* End of min-w container */}
    </div> // End of main sidebar div
  );
};

export default Sidebar;