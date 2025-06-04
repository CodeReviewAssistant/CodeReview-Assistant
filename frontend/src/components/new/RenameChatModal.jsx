// src/components/new/RenameChatModal.jsx
import React, { useState, useEffect } from 'react';

const RenameChatModal = ({
  isOpen,
  onClose,
  darkMode,
  currentName,
  onSave, // Function to call with the new name
}) => {
  const [newName, setNewName] = useState('');

  // Reset input when modal opens or currentName changes
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName || '');
    }
  }, [isOpen, currentName]);

  const handleSave = (e) => {
    e.preventDefault(); // Prevent form submission if wrapped in form
    if (newName.trim() && newName.trim() !== currentName) {
      onSave(newName.trim());
    } else if (!newName.trim()) {
      alert("Chat name cannot be empty."); // Or handle inline validation
    } else {
      onClose(); // Close if name hasn't changed
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className={`p-6 rounded-lg shadow-xl w-full max-w-sm ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">Rename Chat</h3>
        <form onSubmit={handleSave}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter new chat name"
            className={`w-full px-3 py-2 rounded border text-sm mb-4 ${
              darkMode
                ? 'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                : 'bg-white border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
            }`}
            autoFocus
            maxLength={100} // Optional: Limit length
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button" // Prevent default form submission
              onClick={onClose}
              className={`py-2 px-4 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit" // Submit the form
              className={`py-2 px-4 rounded text-sm transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={!newName.trim() || newName.trim() === currentName} // Disable if empty or unchanged
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameChatModal;