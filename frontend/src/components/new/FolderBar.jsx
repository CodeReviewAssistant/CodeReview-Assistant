import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import NewFolderModal from './NewFolderModal';

const FolderBar = ({ darkMode, showNewFolderModal, setShowNewFolderModal, newFolderName, setNewFolderName }) => {
  const [folders, setFolders] = useState([]);
  const [folderLoading, setFolderLoading] = useState(true);
  const [folderError, setFolderError] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const BASE_URL = 'http://localhost:8000';

  async function getAllFolders() {
    try {
      const response = await axios.get(`${BASE_URL}/redis_db/folder/getall`);
      
      const fetchedFolders = Object.entries(response.data).map(([folder_id, folderData]) => ({
        id: folder_id,
        name: JSON.parse(folderData).name,
        chatCount: JSON.parse(folderData).count || 0,
        isPinned: JSON.parse(folderData).pin_status || false
      }));
      console.log(fetchedFolders)
      setFolders(fetchedFolders);
      setFolderLoading(false);
    } catch (err) {
      console.error('Error fetching folders:', err);
      setFolderError('Failed to fetch folders');
      setFolderLoading(false);
    }
  }

  useEffect(() => {
    getAllFolders();
  }, []);

  // Toggle dropdown menu for folder actions
  const toggleDropdown = (folderId) => {
    setActiveDropdown(activeDropdown === `${folderId}` ? null : `${folderId}`);
  };

  // Handle folder actions: delete, pin, or rename
  const handleFolderAction = (action, folderId) => {
    switch (action) {
      case 'delete':
        // Call the backend DELETE endpoint then update local state
        axios.delete(`${BASE_URL}/redis_db/folder/delete/${folderId}`)
          .then(() => {
            setFolders(folders.filter(f => f.id !== folderId));
          })
          .catch((error) => {
            console.error("Error deleting folder:", error);
          });
        break;
      case 'pin':
        setFolders(folders.map(f =>
          f.id === folderId
            ? { ...f, isPinned: !f.isPinned }
            : f
        ));
        // Optionally, update the backend for pin status here.
        break;
      case 'rename':
        // Simply set the editing state so that the input field appears
        const folderToRename = folders.find(f => f.id === folderId);
        setEditingId(`${folderId}`);
        setEditName(folderToRename.name);
        break;
      default:
        break;
    }
    setActiveDropdown(null);
  };

  const confirmRename = async () => {
    const folderId = editingId // Extract folder_id from editingId
    const folderToUpdate = folders.find(f => f.id === folderId);
    
    if (!folderToUpdate) {
      console.error(`Folder with id ${folderId} not found.`);
      setEditingId(null);
      return;
    }
  
    try {
      await axios.put(`${BASE_URL}/redis_db/folder/update/${folderId}`, {
        folder_id: folderId,
        name: editName,
        count: folderToUpdate.chatCount,
        chat_ids: [], // Update this if needed
        pin_status: folderToUpdate.isPinned
      });
      setFolders(folders.map(f =>
        editingId === `${f.id}` ? { ...f, name: editName } : f
      ));
    } catch (error) {
      console.error("Error updating folder:", error);
    }
    setEditingId(null);
  };
  
  // Create a new folder and update the state and backend
  const createNewFolder = async () => {
    console.log('New folder create button clicked')
    if (newFolderName.trim()) {
      const newFolder = {
        folder_id: uuidv4(),
        name: newFolderName.trim(),
        count: 0,
        chat_ids: [],
        pin_status: false
      };
      try {
        await axios.post(`${BASE_URL}/redis_db/folder/add`, newFolder);
        setFolders(prev => [
          ...prev,
          {
            id: newFolder.folder_id,
            name: newFolder.name,
            chatCount: 0,
            isPinned: false
          }
        ]);
        setNewFolderName('');
        setShowNewFolderModal(false);
      } catch (error) {
        console.error("Error creating folder:", error);
      }
    }
  };

  if (folderLoading) return <div className="p-3">Loading folders...</div>;

  return (
    <div className="p-3">
      {/* Header with Add Folder button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Folders
        </h3>
        <button 
          onClick={() => setShowNewFolderModal(true)}
          className={`text-xs font-medium px-2 py-1 border rounded ${
            darkMode 
              ? 'text-gray-300 border-gray-500 hover:bg-gray-600'
              : 'text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
        >
          + Add Folder
        </button>
      </div>

      {/* Folder List or Empty State */}
      {folders.length > 0 ? (
        folders.map((folder) => (
          <div 
            key={folder.id} 
            className={`relative flex items-center justify-between p-2 rounded-lg mb-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-100'} group`}
          >
            <div className="flex items-center flex-grow">
              {folder.isPinned && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              {editingId === `${folder.id}` ? (
                <div className="flex items-center">
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`mr-2 px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-slate-100 text-black'}`}
                  />
                  <button 
                    onClick={confirmRename}
                    className="mr-2 text-green-500"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="text-red-500"
                  >
                    ✗
                  </button>
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'} mr-3`} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="text-sm truncate flex-grow">{folder.name}</span>
                </>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => toggleDropdown(folder.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {activeDropdown === `${folder.id}` && (
                <div className={`absolute right-0 top-full z-10 w-48 rounded-md shadow-lg ${darkMode ? 'bg-gray-700 ring-1 ring-black ring-opacity-5' : 'bg-white ring-1 ring-black ring-opacity-5'}`}>
                  <div className="py-1" role="menu">
                    {[
                      { label: `${folder.isPinned ? 'Unpin' : 'Pin'}`, action: 'pin' },
                      { label: 'Rename', action: 'rename' },
                      { label: 'Delete', action: 'delete', className: 'text-red-600' }
                    ].map((menuItem) => (
                      <button
                        key={menuItem.action}
                        onClick={() => handleFolderAction(menuItem.action, folder.id)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-600' : ''} ${menuItem.className || ''}`}
                        role="menuitem"
                      >
                        {menuItem.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          No folders found. Click the "+ Add Folder" button above to create one.
        </div>
      )}

      {showNewFolderModal && (
        <NewFolderModal 
          darkMode={darkMode}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          createNewFolder={createNewFolder}
          setShowNewFolderModal={setShowNewFolderModal}
        />
      )}
    </div>
  );
};

export default FolderBar;
