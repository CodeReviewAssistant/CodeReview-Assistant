import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import atomOneLight from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light';
import { X } from 'lucide-react'; // For the close button

// Helper function to format text with ReactMarkdown
const formatText = (text) => (
  <div 
    className="chat-bubble-text-content"
    style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </div>
);

const ChatMessage = ({ message, user, darkMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isUserMessage = message.sender === 'user';
  
  const getDefaultAvatar = () => {
    if (!user || (!user.name && !user.email)) {
      return 'https://ui-avatars.com/api/?name=U&background=4F46E5&color=fff&bold=true';
    }
    const initial = user.name?.charAt(0) || user.email?.charAt(0) || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=4F46E5&color=fff&bold=true`;
  };
  
  const bubbleStyles = isUserMessage 
    ? 'bg-blue-600 text-white' 
    : darkMode 
      ? 'bg-gray-700 text-gray-100' 
      : 'bg-slate-100 text-slate-800';

  const avatarSrc = isUserMessage 
    ? (user?.picture || getDefaultAvatar())
    : 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff&bold=true';
  
  const avatarAlt = isUserMessage ? (user?.name || 'User') : 'Assistant';

  const handleAvatarError = (e) => {
    if (isUserMessage) {
      e.target.src = getDefaultAvatar();
    } else {
      e.target.src = 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff&bold=true';
    }
    e.target.onerror = null;
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Modal Component
  const ResponseModal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      onClick={closeModal} // Close modal on backdrop click
    >
      <div 
        className={`relative rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{message.codeSnippet ? "Code Review Details" : "Assistant's Response"}</h3>
          <button 
            onClick={closeModal} 
            className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
            aria-label="Close modal"
          >
            <X size={22} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 md:p-6">
          {message.content && (
            <div className={`markdown-content mb-4 ${darkMode ? 'prose-dark' : 'prose'}`}>
              {formatText(message.content)}
            </div>
          )}
          {message.codeSnippet && (
            <div className="mt-2">
              <SyntaxHighlighter 
                language={message.language || 'plaintext'}
                style={darkMode ? atomOneDark : atomOneLight}
                customStyle={{
                  borderRadius: '0.5rem', // Rounded corners for the code block itself
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem', 
                  overflowX: 'auto',
                }}
                wrapLongLines={true}
                lineNumberStyle={{ opacity: 0.6, fontSize: '0.75rem' }}
                showLineNumbers={String(message.codeSnippet).trim().split('\n').length > 1}
              >
                {String(message.codeSnippet).trim()}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
            <button
                onClick={closeModal}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`flex w-full my-2.5 ${isUserMessage ? 'justify-end pl-6 sm:pl-12 md:pl-16' : 'justify-start pr-6 sm:pr-12 md:pr-16'}`}>
        <div className={`flex items-start max-w-lg ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          <img 
            src={avatarSrc} 
            alt={avatarAlt}
            className={`h-8 w-8 rounded-full flex-shrink-0 ${isUserMessage ? 'ml-2' : 'mr-2'} object-cover shadow-sm`}
            onError={handleAvatarError}
          />
          <div 
            className={`rounded-2xl ${bubbleStyles} shadow-md ${isUserMessage && message.codeSnippet ? 'overflow-hidden' : 'px-3.5 py-2.5'}`}
          >
            {isUserMessage ? (
              <>
                {message.content && (
                  <div className={`${message.codeSnippet ? 'px-3.5 pt-2.5 pb-1.5' : ''}`}>
                    {formatText(message.content)}
                  </div>
                )}
                {message.codeSnippet && (
                  <SyntaxHighlighter 
                    language={message.language || 'plaintext'}
                    style={darkMode ? atomOneDark : atomOneLight}
                    customStyle={{
                      borderRadius: message.content ? '0 0 1rem 1rem' : '1rem',
                      margin: 0,
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem', 
                      overflowX: 'auto',
                    }}
                    wrapLongLines={true}
                    lineNumberStyle={{ opacity: 0.6, fontSize: '0.75rem' }}
                    showLineNumbers={String(message.codeSnippet).trim().split('\n').length > 1}
                  >
                    {String(message.codeSnippet).trim()}
                  </SyntaxHighlighter>
                )}
              </>
            ) : (
              // AI Message: Show a button to open modal
              <button
                onClick={openModal}
                className={`w-full text-left px-3.5 py-2.5 font-medium hover:opacity-80 transition-opacity`}
              >
                View Response
                {message.codeSnippet && <span className="text-xs block opacity-70">(Contains code review)</span>}
              </button>
            )}
          </div>
        </div>
      </div>
      {isModalOpen && <ResponseModal />}
    </>
  );
};

export default ChatMessage;
