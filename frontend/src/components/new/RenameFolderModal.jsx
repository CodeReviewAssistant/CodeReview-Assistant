import React, { useState, useEffect, useRef } from 'react';

const RenameFolderModal = ({ isOpen, darkMode, currentName, onClose, onSave }) => {
    const [newName, setNewName] = useState('');
    const inputRef = useRef(null);

    // Reset input field when modal opens or currentName changes
    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            // Focus the input field shortly after the modal opens
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select(); // Optional: select text on focus
            }, 100); // Small delay ensures the element is focusable
        }
    }, [isOpen, currentName]);

    // Handle Escape key press to close modal
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        // Cleanup listener on component unmount or when modal closes
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]); // Dependency array includes isOpen and onClose

    const handleSaveClick = () => {
        const trimmedName = newName.trim();
        if (trimmedName && trimmedName !== currentName) {
            onSave(trimmedName);
            // onClose(); // Let the parent decide when to close after save logic
        } else if (trimmedName === currentName) {
             // If the name is unchanged, just close the modal
             onClose();
        }
        // If trimmedName is empty, do nothing (button should ideally be disabled)
    };

    const handleOverlayClick = (e) => {
        // Close if clicking directly on the overlay, not the modal content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const isSaveDisabled = newName.trim() === '' || newName.trim() === currentName;

    if (!isOpen) {
        return null; // Don't render anything if modal is not open
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out"
            onClick={handleOverlayClick} // Close on overlay click
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-folder-title"
        >
            <div
                className={`rounded-lg shadow-xl overflow-hidden max-w-md w-full p-6 ${
                    darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
                }`}
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
            >
                {/* Modal Header */}
                <h2
                    id="rename-folder-title"
                    className="text-lg font-semibold mb-4"
                >
                    Rename Folder
                </h2>

                {/* Input Field */}
                <div className="mb-4">
                    <label htmlFor="folderName" className="block text-sm font-medium mb-1">
                        New folder name
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        id="folderName"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isSaveDisabled) {
                                handleSaveClick();
                            }
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            darkMode
                                ? 'bg-gray-700 border-gray-600 placeholder-gray-400'
                                : 'bg-white border-gray-300 placeholder-gray-500'
                        }`}
                        placeholder="Enter new folder name"
                    />
                     {newName.trim() === '' && (
                        <p className="text-xs text-red-500 mt-1">Folder name cannot be empty.</p>
                     )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                            darkMode
                                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-black'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveClick}
                        disabled={isSaveDisabled}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                            isSaveDisabled
                                ? darkMode ? 'bg-blue-800 text-gray-400 cursor-not-allowed' : 'bg-blue-300 text-gray-500 cursor-not-allowed'
                                : darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameFolderModal;