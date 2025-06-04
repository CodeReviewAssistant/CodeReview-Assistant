import React from 'react';

const ChatInput = ({
  input,
  setInput,
  handleSendMessage,
  isLoading,
  darkMode
}) => {
  return (
    <div className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-slate-200 bg-white'} p-4`}>
      <div className="max-w-3xl mx-auto flex items-center space-x-2">

        {/* Removed Action Dropdown */}

        {/* Input Form - Takes full width now potentially */}
        <form onSubmit={handleSendMessage} className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            // Updated placeholder
            placeholder="Enter your message or code here..."
            className={`w-full p-3 pr-12 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-slate-300 text-black placeholder-slate-500'
            }`}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!input.trim() || isLoading}
          >
            {/* Send Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" transform="rotate(90)">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;