import React, { useState, useEffect, useCallback } from 'react';
import { googleLogout } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChatHeader from './new/ChatHeader';
import ChatWindow from './new/ChatWindow';
import ChatInput from './new/ChatInput';
import Sidebar from './new/Sidebar';
import NewFolderModal from './new/NewFolderModal';
import AssignFolderModal from './new/AssignFolderModal';
import RenameFolderModal from './new/RenameFolderModal';
import RenameChatModal from './new/RenameChatModal';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:8000';

const ChatInterface = ({ user, onLogout }) => {
  // --- State Definitions ---
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // AI response loading
  const [isChatLoading, setIsChatLoading] = useState(false); // Chat message loading
  const [error, setError] = useState(null); // General ChatWindow error
  const [messages, setMessages] = useState([]); // Start empty, handle initial state in useEffect or handleSelectChat
  const [input, setInput] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChatName, setSelectedChatName] = useState("Code Review Assistant"); // Default title
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folders, setFolders] = useState([]);
  const [folderLoading, setFolderLoading] = useState(true);
  const [folderError, setFolderError] = useState(null);
  const [chatHistoryItems, setChatHistoryItems] = useState([]);
  const [chatListLoading, setChatListLoading] = useState(true);
  const [chatListError, setChatListError] = useState(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false); // Folder rename
  const [folderToRename, setFolderToRename] = useState(null);
  const [showAssignFolderModal, setShowAssignFolderModal] = useState(false);
  const [chatToAssign, setChatToAssign] = useState(null);
  const [showRenameChatModal, setShowRenameChatModal] = useState(false);
  const [chatToRename, setChatToRename] = useState(null);

  // --- Navigation & Logout ---
  const navigate = useNavigate();
  const handleLogout = () => { googleLogout(); onLogout(); navigate('/login'); };

  // --- Toggles ---
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // --- Initial Message & Reset ---
   const resetChatWindow = useCallback(() => {
    setMessages([{
        id: 'initial-reset',
        content: `Hello, ${user?.name || 'there'}! Select a chat or start a new one.`,
        sender: "assistant"
    }]);
    setSelectedChatName("Code Review Assistant"); // Reset title
    setIsChatLoading(false);
    setError(null);
  }, [user?.name]); // Depend on user name

  // Set initial message when component mounts and user is available
  useEffect(() => {
    if (!selectedChatId) {
       resetChatWindow();
    }
  }, [selectedChatId, resetChatWindow]);


  // --- Chat List Management ---
  const fetchAllChats = useCallback(async () => {
      setChatListLoading(true); setChatListError(null);
      console.log("Fetching all chats...");
      try {
          const response = await axios.get(`${BASE_URL}/redis_db/chat/getall`);
          const chatsData = response.data || {};
          const transformedChats = Object.values(chatsData)
              .map(jsonString => { try { return JSON.parse(jsonString); } catch { return null; } })
              .filter(chat => chat?.chat_id && chat.name)
              .map(chat => {
                  let formattedDate = "N/A";
                  try { const ts = Number(chat.chat_id.split('_')[1]); if (!isNaN(ts)) formattedDate = new Date(ts).toLocaleDateString('en-US', {y:'numeric',m:'short',d:'numeric'});} catch {}
                  return { id: chat.chat_id, title: chat.name, date: formattedDate, isPinned: chat.pin_status || false, folderId: chat.folder_id || null };
              })
              .sort((a, b) => { // Sort by pinned then time (most recent first)
                  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                  try { const tA=Number(a.id.split('_')[1]||0); const tB=Number(b.id.split('_')[1]||0); return tB - tA; } catch { return 0; } });
          setChatHistoryItems(transformedChats);
      } catch (err) {
          console.error("Error fetching chat list:", err);
          const errorMsg = 'Failed to fetch chat list. ' + (err.response?.data?.detail || err.message);
          setChatListError(errorMsg); setChatHistoryItems([]);
      } finally { setChatListLoading(false); }
  }, []);


  // --- Folder Management ---
  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolderData = { folder_id: `folder_${uuidv4()}`, name: newFolderName.trim(), count: 0, chat_ids: [], pin_status: false };
    setFolderError(null); try {
      await axios.post(`${BASE_URL}/redis_db/folder/add`, newFolderData);
      const displayFolder = { id: newFolderData.folder_id, name: newFolderData.name, chatCount: 0, isPinned: newFolderData.pin_status };
      setFolders(prev => [...prev, displayFolder].sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return a.name.localeCompare(b.name); }));
      setNewFolderName(''); setShowNewFolderModal(false);
    } catch (error) { const eM = "Create folder failed. " + (error.response?.data?.detail || error.message); setFolderError(eM); setTimeout(() => setFolderError(null), 5000); }
  };
  const getAllFolders = useCallback(async () => {
    setFolderLoading(true); setFolderError(null); try {
      const r = await axios.get(`${BASE_URL}/redis_db/folder/getall`); const d = r.data || {};
      const fF = Object.entries(d).map(([id, json]) => { try { const data=JSON.parse(json); const count=chatHistoryItems.filter(c=>c.folderId===id).length; return { id, name: data.name, chatCount: count, isPinned: data.pin_status||false }; } catch { return null; } }).filter(Boolean);
      fF.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return a.name.localeCompare(b.name); }); setFolders(fF);
    } catch (err) { const eM = 'Fetch folders failed. '+(err.response?.data?.detail||err.message); setFolderError(eM); setFolders([]); } finally { setFolderLoading(false); }
  }, [chatHistoryItems]);
  const handlePinFolder = useCallback(async (folderId) => {
        setFolderError(null); const originalFolders = [...folders]; const folder = folders.find(f=>f.id===folderId); if (!folder) return; const newPinStatus = !folder.isPinned;
        setFolders(p => p.map(f => f.id === folderId ? {...f, isPinned: newPinStatus} : f).sort((a,b) => {if (a.isPinned!==b.isPinned) return a.isPinned ? -1 : 1; return a.name.localeCompare(b.name);}));
        try {
            let currentData={}; try { const r=await axios.get(`${BASE_URL}/redis_db/folder/get/${folderId}`); if(r.data&&r.data[folderId]) currentData=JSON.parse(r.data[folderId]); else currentData={...folder}; } catch { currentData={...folder}; }
            const payload = { ...currentData, folder_id: folderId, pin_status: newPinStatus, name:currentData.name||folder.name, count:currentData.count??folder.chatCount??0, chat_ids:currentData.chat_ids||[] };
            await axios.put(`${BASE_URL}/redis_db/folder/update/${folderId}`, payload);
        } catch (error) { const eM=`Pin failed. ${error.response?.data?.detail||error.message}`; setFolderError(eM); setFolders(originalFolders); setTimeout(()=>setFolderError(null), 5000); }
    }, [folders]);
  const handleRenameFolderStart = useCallback((folderId) => { const f = folders.find(f=>f.id===folderId); if (f) { setFolderToRename({ id:f.id, name:f.name }); setIsRenameModalOpen(true); } }, [folders]);
  const handleConfirmRename = useCallback(async (folderId, newName) => { // FOLDER Rename
         if (!newName.trim()) { setFolderError("Name empty."); setTimeout(()=>setFolderError(null),3000); return; } setIsRenameModalOpen(false); setFolderError(null);
         const originalFolders=[...folders]; const folder=folders.find(f=>f.id===folderId); if (!folder || folder.name === newName.trim()) { setFolderToRename(null); return; } const trimmedName=newName.trim();
         setFolders(p => p.map(f => f.id === folderId ? {...f, name: trimmedName} : f)); setFolderToRename(null);
         try {
             let currentData={}; try {const r=await axios.get(`${BASE_URL}/redis_db/folder/get/${folderId}`); if(r.data&&r.data[folderId]) currentData=JSON.parse(r.data[folderId]); else currentData={...folder};} catch {currentData={...folder};}
             const payload = { ...currentData, folder_id: folderId, name: trimmedName, count: currentData.count??folder.chatCount??0, chat_ids: currentData.chat_ids||[], pin_status: currentData.pin_status??folder.isPinned };
             await axios.put(`${BASE_URL}/redis_db/folder/update/${folderId}`, payload);
         } catch (error) { const eM=`Rename failed. ${error.response?.data?.detail||error.message}`; setFolderError(eM); setFolders(originalFolders); setTimeout(()=>setFolderError(null),5000); }
    }, [folders]);
  const handleDeleteFolder = useCallback(async (folderId) => {
        const f=folders.find(f=>f.id===folderId); if (!f || !window.confirm(`Delete folder "${f.name}"?`)) return; setFolderError(null);
        const oF=[...folders]; const oC=[...chatHistoryItems]; setFolders(p=>p.filter(f=>f.id!==folderId)); setChatHistoryItems(p=>p.map(c=>c.folderId===folderId?{...c,folderId:null}:c));
        if(selectedChatId && oC.find(c=>c.id===selectedChatId)?.folderId===folderId) handleSelectChat(null);
        try { await axios.delete(`${BASE_URL}/redis_db/folder/delete/${folderId}`); }
        catch (error) { const eM=`Delete failed. ${error.response?.data?.detail||error.message}`; setFolderError(eM); setFolders(oF); setChatHistoryItems(oC); setTimeout(()=>setFolderError(null),5000); }
    }, [folders, chatHistoryItems, selectedChatId]);


  // --- Chat Assignment ---
  const handleOpenAssignModal = useCallback((chat) => { setChatToAssign({id:chat.id, title:chat.title}); setShowAssignFolderModal(true); }, []);
  const handleAssignChatToFolder = useCallback(async (folderId) => {
        if (!chatToAssign || !folderId) return; const chatId = chatToAssign.id; setShowAssignFolderModal(false); setFolderError(null); setChatListError(null);
        const oC=[...chatHistoryItems]; const oF=[...folders]; const cI=oC.findIndex(c=>c.id===chatId); if(cI===-1){setChatToAssign(null); return;} const oldFolderId=oC[cI].folderId;
        setChatHistoryItems(p=>p.map(c=>c.id===chatId?{...c, folderId:folderId}:c)); setFolders(p=>p.map(f=>{if(f.id===folderId)return{...f,chatCount:(f.chatCount||0)+1}; if(f.id===oldFolderId)return{...f,chatCount:Math.max(0,(f.chatCount||0)-1)}; return f;}));
        try { const r=await axios.get(`${BASE_URL}/redis_db/chat/get/${chatId}`); const cD=r.data; const pL={...cD, folder_id:folderId, chat_id:chatId}; await axios.put(`${BASE_URL}/redis_db/chat/update/${chatId}`, pL); }
        catch (error) { const eM=`Assign failed. ${error.response?.data?.detail||error.message}`; setChatListError(eM); setChatHistoryItems(oC); setFolders(oF); setTimeout(()=>setChatListError(null),5000); } finally { setChatToAssign(null); }
   }, [chatToAssign, chatHistoryItems, folders]);


  // --- Chat Message Fetching ---
  const fetchChatMessages = useCallback(async (chatId) => {
    if (!chatId) { resetChatWindow(); return; } // Use reset helper
    console.log(`Workspaceing messages: ${chatId}`); setIsChatLoading(true); setError(null); setMessages([]);
    try {
      const r=await axios.get(`${BASE_URL}/redis_db/chat/get/${chatId}`); const chatData=r.data;
      const f=chatHistoryItems.find(c => c.id === chatId); setSelectedChatName(f?.title || chatData.name || "Chat");
      let msgs=[]; const msgObj=chatData.messages||{}; if(typeof msgObj==='object'&&msgObj!==null){msgs=Object.entries(msgObj).map(([i,d])=>({id:i,...d})); msgs.sort((a,b)=>{const tA=a.timestamp?new Date(a.timestamp).getTime():0; const tB=b.timestamp?new Date(b.timestamp).getTime():0; if(tA&&tB) return tA-tB; return a.id.localeCompare(b.id);});}
      setMessages(msgs.length>0 ? msgs : [{id:'empty', content:"This chat seems empty. Start the conversation!", sender:'assistant'}]); // Updated empty message
    } catch (error) {
      console.error("Fetch chat details error:", error); let eC="Load failed."; if (error.response?.status===404) eC="Not found.";
      setSelectedChatName("Error"); setMessages([{id:'err', content:eC, sender:'assistant'}]); setError(eC);
    } finally { setIsChatLoading(false); }
  }, [chatHistoryItems, resetChatWindow]); // Added resetChatWindow dependency


  // --- Chat Selection ---
  const handleSelectChat = useCallback((chatId, isNewChat = false) => { // Added isNewChat flag
    if (chatId === selectedChatId && !isNewChat) return; // Don't re-select same unless new
    setSelectedChatId(chatId);

    if (isNewChat) {
      console.log("Handling new chat selection:", chatId);
      const newChat = chatHistoryItems.find(c => c.id === chatId);
      setSelectedChatName(newChat?.title || `New Chat ${chatId.substring(5,10)}`); // Get name from updated list
      setMessages([{ // Set the custom welcome message
          id: `welcome_${chatId}`,
          content: `Hello, ${user?.name || 'there'}! How can I assist you today?`,
          sender: 'assistant'
      }]);
      setIsChatLoading(false);
      setError(null);
    } else {
      // Existing chat: fetch messages as before
      fetchChatMessages(chatId);
    }
  }, [selectedChatId, fetchChatMessages, chatHistoryItems, user?.name]); // Added dependencies


  // --- Sending a Message ---
  const handleSendMessage = async (e) => {
    e.preventDefault(); if (!selectedChatId) { alert("Select chat."); return; } const msg=input.trim(); if (!msg) return;
    console.log(`Sending to ${selectedChatId}:`, msg); const userMsg={id:`user_${Date.now()}_${Math.random().toString(16).slice(2,8)}`,content:msg,sender:"user",timestamp:new Date().toISOString()};
    setMessages(p=>[...p,userMsg]); setInput(""); setIsLoading(true); setError(null); let assistantMsg=null;
    try { /* ... API call, Redis update ... */
      const modelRes=await axios.post(`${BASE_URL}/model`,{code_snippet:msg}); const assistantContent=modelRes.data.review||"[No response]";
      assistantMsg={id:`asst_${Date.now()}_${Math.random().toString(16).slice(2,8)}`,content:assistantContent,sender:"assistant",timestamp:new Date().toISOString()};
      setMessages(p=>[...p,assistantMsg]);
      try { const chatRes=await axios.get(`${BASE_URL}/redis_db/chat/get/${selectedChatId}`); const currentData=chatRes.data; let currentMsgs=currentData.messages||{}; if(typeof currentMsgs!=='object'||currentMsgs===null||Array.isArray(currentMsgs))currentMsgs={}; const updatedMsgs={...currentMsgs,[userMsg.id]:{sender:userMsg.sender,content:userMsg.content,timestamp:userMsg.timestamp},[assistantMsg.id]:{sender:assistantMsg.sender,content:assistantMsg.content,timestamp:assistantMsg.timestamp}}; const payload={...currentData,messages:updatedMsgs,chat_id:selectedChatId}; await axios.put(`${BASE_URL}/redis_db/chat/update/${selectedChatId}`,payload); console.log(`Chat ${selectedChatId} updated.`); }
      catch (updateError) { console.error("Redis update error:",updateError); setMessages(p=>[...p,{id:`err_save_${Date.now()}`,content:"[Save failed.]",sender:"assistant",timestamp:new Date().toISOString()}]); }
    } catch (error) { /* ... Error Handling including saving user message ... */
      console.error("Model API Error:",error); let eC="Error getting response."; assistantMsg={id:`err_model_${Date.now()}`,c:eC,s:"assistant",t:new Date().toISOString()}; setMessages(p=>[...p,assistantMsg]); setError(eC);
      try { const r=await axios.get(`${BASE_URL}/redis_db/chat/get/${selectedChatId}`);const d=r.data; let m=d.messages||{}; if(typeof m!=='object'||m===null||Array.isArray(m))m={}; const uM={...m,[userMsg.id]:{sender:userMsg.sender,content:userMsg.content,timestamp:userMsg.timestamp}}; const p={...d,messages:uM,chat_id:selectedChatId}; await axios.put(`${BASE_URL}/redis_db/chat/update/${selectedChatId}`,p);} catch (saveUserErr) { console.error("Failed save user msg:",saveUserErr);}
    } finally { setIsLoading(false); }
  };


   // --- Chat Creation ---
  const createNewChat = async () => {
    console.info("Creating chat..."); setChatListError(null);
    const chatId=`chat_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
    const chatData={chat_id:chatId,name:`New Chat ${new Date().toLocaleTimeString()}`,messages:{},folder_id:null,pin_status:false};
    try {
      await axios.post(`${BASE_URL}/redis_db/chat/add`,chatData); console.info("Chat created!");
      await fetchAllChats(); // Refresh list *first*
      handleSelectChat(chatId, true); // Select the new chat *and* pass the isNewChat flag
    } catch (error) { console.error("Create chat error:",error); const eM="Create failed. "+(error.response?.data?.detail||error.message); setChatListError(eM); setTimeout(()=>setChatListError(null), 5000); }
  };


  // --- Chat Deletion ---
   const handleDeleteChat = useCallback(async (chatIdToDelete) => {
        const chatToDelete=chatHistoryItems.find(c=>c.id===chatIdToDelete); if (!window.confirm(`Delete chat "${chatToDelete?.title||chatIdToDelete}"?`)) return; setChatListError(null);
        const originalChats=[...chatHistoryItems]; setChatHistoryItems(prev=>prev.filter(chat=>chat.id!==chatIdToDelete)); if(chatIdToDelete===selectedChatId)handleSelectChat(null); // Use handleSelectChat(null) to reset view
        try { await axios.delete(`${BASE_URL}/redis_db/chat/delete/${chatIdToDelete}`); }
        catch (err) { console.error(`Delete chat error ${chatIdToDelete}:`, err); const eM=`Delete failed. ${err.response?.data?.detail||err.message}`; setChatListError(eM); setChatHistoryItems(originalChats); setTimeout(()=>setChatListError(null), 5000); }
   }, [chatHistoryItems, selectedChatId, handleSelectChat]); // Added handleSelectChat


   // --- Chat Rename ---
   const handleRenameChatStart = useCallback((chat) => { setChatToRename({id:chat.id, title:chat.title}); setShowRenameChatModal(true); }, []);
   const handleConfirmChatRename = useCallback(async (newName) => {
        if (!chatToRename||!newName||newName===chatToRename.title){setShowRenameChatModal(false);setChatToRename(null);return;} const chatId=chatToRename.id; const oldName=chatToRename.title; setShowRenameChatModal(false); setChatListError(null);
        const oC=[...chatHistoryItems]; setChatHistoryItems(prev=>prev.map(chat=>chat.id===chatId?{...chat,title:newName}:chat)); if(selectedChatId===chatId)setSelectedChatName(newName);
        try { const chatRes=await axios.get(`${BASE_URL}/redis_db/chat/get/${chatId}`); const currentChatData=chatRes.data; const payload={...currentChatData,chat_id:chatId,name:newName}; if(typeof payload.messages!=='object'||payload.messages===null)payload.messages={}; await axios.put(`${BASE_URL}/redis_db/chat/update/${chatId}`,payload); }
        catch (error) { console.error(`Rename chat error ${chatId}:`,error); const eM=`Rename failed. ${error.response?.data?.detail||error.message}`; setChatListError(eM); setChatHistoryItems(oC); if(selectedChatId===chatId)setSelectedChatName(oldName); setTimeout(()=>setChatListError(null),5000); } finally { setChatToRename(null); }
   }, [chatToRename, chatHistoryItems, selectedChatId]);


   // --- Pin/Unpin Chat ---
   const handlePinChat = useCallback(async (chatId) => {
        console.log("Pin/Unpin chat:", chatId);
        setChatListError(null); // Clear previous errors

        const originalChats = [...chatHistoryItems]; // For rollback
        const chatToUpdate = originalChats.find(c => c.id === chatId);
        if (!chatToUpdate) return;

        const newPinStatus = !chatToUpdate.isPinned;

        // Optimistic UI Update
        setChatHistoryItems(prevChats =>
            prevChats.map(chat =>
                chat.id === chatId ? { ...chat, isPinned: newPinStatus } : chat
            ).sort((a, b) => { // Re-sort
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                try { const tA = Number(a.id.split('_')[1] || 0); const tB = Number(b.id.split('_')[1] || 0); return tB - tA; } catch { return 0; }
            })
        );

        try {
            // Fetch current chat data
            console.log(`Workspaceing current data for chat ${chatId} before pin update...`);
            const chatRes = await axios.get(`${BASE_URL}/redis_db/chat/get/${chatId}`);
            const currentChatData = chatRes.data;

            // Prepare payload
            const updatePayload = {
                ...currentChatData, // Keep existing data
                chat_id: chatId, // Ensure ID is present
                pin_status: newPinStatus, // Set the new pin status
            };
             // Ensure messages is an object
            if (typeof updatePayload.messages !== 'object' || updatePayload.messages === null) {
                updatePayload.messages = {};
            }

            // Send PUT request
            console.log(`Updating chat ${chatId} pin status in Redis...`);
            await axios.put(`${BASE_URL}/redis_db/chat/update/${chatId}`, updatePayload);
            console.log(`Chat ${chatId} pin status updated successfully.`);

        } catch (error) {
            console.error(`Error updating pin status for chat ${chatId}:`, error);
            const errorMsg = `Failed to update pin status. ${error.response?.data?.detail || error.message}`;
            setChatListError(errorMsg); // Show error
            // Rollback UI
            setChatHistoryItems(originalChats); // Revert to original list and order
            setTimeout(() => setChatListError(null), 5000);
        }
   }, [chatHistoryItems]); // Dependency


  // --- Initial Data Fetching ---
  useEffect(() => { fetchAllChats(); }, [fetchAllChats]);
  useEffect(() => { if (!chatListLoading) getAllFolders(); }, [chatListLoading, getAllFolders]); // Removed chatHistoryItems dep from here


  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-black'} transition-colors duration-300`}>
      {/* Sidebar */}
      <Sidebar
        // UI & User Props
        darkMode={darkMode} toggleDarkMode={toggleDarkMode} sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar} user={user} handleLogout={handleLogout}
        // Search Props
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
         // Chat List Props
        chatHistoryItems={chatHistoryItems} chatLoading={chatListLoading} chatError={chatListError}
        createNewChat={createNewChat} onSelectChat={handleSelectChat} selectedChatId={selectedChatId}
        handleDeleteChat={handleDeleteChat}
        // Folder Props & Handlers
        folders={folders} folderLoading={folderLoading} folderError={folderError}
        setShowNewFolderModal={setShowNewFolderModal}
        handlePinFolder={handlePinFolder} handleRenameFolder={handleRenameFolderStart}
        handleDeleteFolder={handleDeleteFolder}
        // Assign/Rename/Pin Chat Handlers
        onOpenAssignModal={handleOpenAssignModal}
        onOpenRenameModal={handleRenameChatStart}
        handlePinChat={handlePinChat} // <-- Pass chat pin handler
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader darkMode={darkMode} toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} chatName={selectedChatName} />
        <div className="flex-1 overflow-y-auto">
            <ChatWindow messages={messages} user={user} darkMode={darkMode} isLoading={isChatLoading || isLoading} />
        </div>
        <ChatInput input={input} setInput={setInput} handleSendMessage={handleSendMessage} isLoading={isLoading} darkMode={darkMode} />
      </div>

      {/* Modals */}
      {showNewFolderModal && ( <NewFolderModal darkMode={darkMode} newFolderName={newFolderName} setNewFolderName={setNewFolderName} createNewFolder={createNewFolder} onClose={() => setShowNewFolderModal(false)} /> )}
      <AssignFolderModal isOpen={showAssignFolderModal} onClose={() => setShowAssignFolderModal(false)} folders={folders} onSelectFolder={handleAssignChatToFolder} chatToAssign={chatToAssign} darkMode={darkMode} />
      {isRenameModalOpen && folderToRename && ( <RenameFolderModal isOpen={isRenameModalOpen} darkMode={darkMode} currentName={folderToRename.name} onClose={() => { setIsRenameModalOpen(false); setFolderToRename(null); }} onSave={(newName) => handleConfirmRename(folderToRename.id, newName)} /> )}
      {showRenameChatModal && chatToRename && ( <RenameChatModal isOpen={showRenameChatModal} darkMode={darkMode} currentName={chatToRename.title} onClose={() => { setShowRenameChatModal(false); setChatToRename(null); }} onSave={handleConfirmChatRename} /> )}
    </div>
  );
};

export default ChatInterface;