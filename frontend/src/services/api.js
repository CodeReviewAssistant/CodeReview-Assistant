// services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  }
});

export const sendMessage = async (message) => {
  try {
    const response = await api.post('/chat', {
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      model: 'gpt-5.8', // replace with your actual model name
      max_tokens: 1000
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getHistory = async (chatId) => {
  try {
    const response = await api.get(`/chat/${chatId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};

export const createNewChat = async () => {
  try {
    const response = await api.post('/chat/new');
    return response.data.chatId;
  } catch (error) {
    console.error('Error creating new chat:', error);
    throw error;
  }
};

export default api;