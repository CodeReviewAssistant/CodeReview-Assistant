import React from 'react';

const NewFolderModal = ({ darkMode, newFolderName, setNewFolderName, createNewFolder, setShowNewFolderModal }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className={`p-6 rounded-lg shadow-xl w-96 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
      <h2 className="text-lg font-semibold mb-4">Create New Folder</h2>
      <input 
        type="text"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        placeholder="Enter folder name"
        className={`w-full p-2 rounded-md mb-4 ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-slate-100 text-black placeholder-slate-500'}`}
      />
      <div className="flex justify-end space-x-2">
        <button 
          onClick={() => setShowNewFolderModal(false)}
          className={`px-4 py-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-100'}`}
        >
          Cancel
        </button>
        <button 
          onClick={createNewFolder}
          disabled={!newFolderName.trim()}
          className={`px-4 py-2 rounded-md ${newFolderName.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          Create
        </button>
      </div>
    </div>
  </div>
);

export default NewFolderModal;
