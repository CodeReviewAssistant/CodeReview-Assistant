import { useState, useEffect } from 'react';
import { sendMessage, getHistory } from '../services/api';

export const useChat = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (chatId) {
      fetchHistory();
    }
  }, [chatId]);

  const fetchHistory = async () => {
    if (!chatId) return;
    
    setLoading(true);
    try {
      const history = await getHistory(chatId);
      setMessages(history);
    } catch (err) {
      setError('Failed to load chat history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendUserMessage = async (content) => {
    if (!content.trim()) return;
    
    // Add user message to state
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      // Send to API
      const botResponse = await sendMessage(content);
      
      // Add bot response to state
      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage: sendUserMessage,
    refreshHistory: fetchHistory
  };
};