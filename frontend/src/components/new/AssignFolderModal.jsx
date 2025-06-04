// src/components/new/AssignFolderModal.jsx
import React from 'react';

const AssignFolderModal = ({
  isOpen,
  onClose,
  folders = [], // Receive the list of folders
  onSelectFolder, // Function to call when a folder is clicked
  chatToAssign, // Info about the chat being assigned (optional, for display)
  darkMode
}) => {
  if (!isOpen) return null;

  return (
    // Modal Backdrop
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose} // Close if clicking outside the modal content
    >
      {/* Modal Content */}
      <div
        className={`p-6 rounded-lg shadow-xl w-full max-w-xs ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h3 className="text-lg font-semibold mb-4">Assign Chat to Folder</h3>
        {chatToAssign && (
            <p className="text-sm mb-4 truncate italic ${darkMode ? 'text-gray-400' : 'text-gray-600'}">
                Chat: "{chatToAssign.title || chatToAssign.id}"
            </p>
        )}

        {/* Folder List */}
        <div className="max-h-60 overflow-y-auto">
            {folders.length === 0 && (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No folders available.</p>
            )}
            {folders.map(folder => (
            <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)} // Call handler with folder ID
                className={`w-full text-left px-3 py-2 mb-1 rounded text-sm transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
                {folder.name} ({folder.chatCount || 0})
            </button>
            ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`mt-4 w-full py-2 px-4 rounded transition-colors ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AssignFolderModal;