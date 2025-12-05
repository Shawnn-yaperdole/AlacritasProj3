// src/Global/Messages.jsx - Full Updated with Gemini Chatbot Integration
import React, { useState, useEffect, useRef } from "react";
import { MOCK_CHATS, CHAT_MESSAGES, ACCEPTED_OFFER, MOCK_CLIENT, MOCK_PROVIDER } from "../Sample/MockData";
import { sendMessage, subscribeToChatMessages, subscribeToChats } from "../lib/firebase";
import { sendGeminiMessage } from "../lib/gemini"; // Your gemini.js helper

const MessagesPage = ({ userRole = 'client', onViewRequestDetails, onViewOfferDetails }) => {
  const [chats, setChats] = useState(MOCK_CHATS);
  const [selectedChatId, setSelectedChatId] = useState(chats[0]?.id || null);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const messagesRef = useRef(null);
  const [localUserId, setLocalUserId] = useState(null);

  // Gemini chatbot state
  const [geminiMessages, setGeminiMessages] = useState([]);
  const [geminiInput, setGeminiInput] = useState('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const geminiRef = useRef(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const currentUserPic = userRole === 'client' ? MOCK_CLIENT.profilePic : MOCK_PROVIDER.profilePic;

  useEffect(() => {
    const key = 'alacritas_user_id';
    let id = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      id = window.localStorage.getItem(key);
      if (!id) {
        id = 'user-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        window.localStorage.setItem(key, id);
      }
    } else {
      id = 'user-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    }
    setLocalUserId(id);
  }, []);

  useEffect(() => {
    const unsub = subscribeToChats(list => {
      if (!list || !list.length) return;
      setChats(list);
      if (!selectedChatId) setSelectedChatId(list[0].id);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    if (selectedChatId !== 'gemini') {
      const unsubscribe = subscribeToChatMessages(selectedChatId, (msgs) => {
        setMessages(msgs || []);
        setTimeout(() => {
          if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }, 50);
      });
      return () => unsubscribe && unsubscribe();
    }
  }, [selectedChatId]);

  // Normal chat send
  const handleSend = async () => {
    if (!inputValue.trim() || !selectedChatId) return;
    const msg = {
      text: inputValue.trim(),
      sender: 'Self',
      senderRole: userRole,
      senderId: localUserId,
      timestamp: Date.now()
    };
    try {
      await sendMessage(selectedChatId, msg);
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages(prev => [...prev, { id: 'local-' + Date.now(), ...msg }]);
    } finally {
      setInputValue('');
    }
  };

  // Gemini chatbot send
  const sendToGemini = async () => {
    if (!geminiInput.trim()) return;
    const userMessage = { role: 'user', content: geminiInput, timestamp: Date.now() };
    setGeminiMessages(prev => [...prev, userMessage]);
    setGeminiInput('');
    setIsGeminiLoading(true);

    const botMessage = { role: 'bot', content: 'Typing...', timestamp: Date.now() + 1 };
    setGeminiMessages(prev => [...prev, botMessage]);

    const result = await sendGeminiMessage(geminiInput, "home service estimation");

    setGeminiMessages(prev =>
      prev.map(msg =>
        msg.timestamp === botMessage.timestamp
          ? { ...msg, content: result.text }
          : msg
      )
    );
    setIsGeminiLoading(false);

    setTimeout(() => {
      if (geminiRef.current) {
        geminiRef.current.scrollTop = geminiRef.current.scrollHeight;
      }
    }, 100);
  };

  return (
    <div className="messages-fullscreen flex w-screen h-screen">
      {/* Chat List */}
      <div className="chat-list flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="chat-header p-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(chat => (
            <div
              key={chat.id}
              className={`chat-item flex items-center gap-3 p-3 cursor-pointer transition-colors rounded ${selectedChatId === chat.id ? "bg-gray-100" : "hover:bg-gray-50"}`}
              onClick={() => setSelectedChatId(chat.id)}
            >
              <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 truncate">{chat.name}</p>
                  <span className="text-xs text-gray-400 ml-2">{chat.lastMsgTime}</span>
                </div>
                <p className="text-gray-500 text-sm truncate">{chat.lastMsg}</p>
              </div>
            </div>
          ))}

          {/* Gemini Chatbot at bottom */}
          <div className="gemini-chatbot border-t border-gray-200 p-3 bg-gradient-to-r from-purple-50 to-blue-50 cursor-pointer"
            onClick={() => setSelectedChatId('gemini')}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">🤖</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">Gemini Assistant</p>
                <p className="text-xs text-gray-500">Get help with estimations, descriptions</p>
              </div>
            </div>
            <div className="text-xs text-gray-600 truncate select-none">
              {geminiMessages.length === 0
                ? "Ask me about service costs, timelines, or descriptions..."
                : geminiMessages[geminiMessages.length - 1].content.slice(0, 80) + "..."}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="chat-window flex-1 flex flex-col bg-gray-50 min-h-0">
        {selectedChat ? (
          <>
            <div className="chat-window-header flex items-center gap-2 p-3 border-b border-gray-200">
              <button onClick={() => setSelectedChatId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>&larr;</button>
              <span className="font-bold">{selectedChat.name}</span>
            </div>

            <div className="accepted-offer-card flex items-start gap-4 p-4 bg-white border-b border-gray-200">
              <img src={ACCEPTED_OFFER.image} alt="Issue thumbnail" className="w-20 h-20 object-cover rounded" />
              <div className="flex-1 flex flex-col min-w-0">
                <h3 className="font-bold text-lg">{ACCEPTED_OFFER.title}</h3>
                <p className="text-gray-500 text-sm">{ACCEPTED_OFFER.location} • {ACCEPTED_OFFER.date}</p>
                <p className="text-green-600 font-semibold mt-1">Accepted Price: {ACCEPTED_OFFER.price}</p>

                <button
                  className="text-blue-500 text-sm mt-2 hover:underline text-left"
                  onClick={() => {
                    if (userRole === 'client' && onViewOfferDetails) {
                      onViewOfferDetails(ACCEPTED_OFFER.requestId);
                    } else if (userRole === 'provider' && onViewRequestDetails) {
                      onViewRequestDetails(ACCEPTED_OFFER.requestId);
                    }
                  }}
                >
                  View full description
                </button>
              </div>
            </div>

            <div className="chat-content flex-1 flex flex-col p-4 overflow-y-auto gap-2 min-h-0" ref={messagesRef}>
              {(messages.length ? messages : CHAT_MESSAGES).map(msg => {
                const isSent = msg.senderId === localUserId;
                const avatarSrc = isSent ? currentUserPic : selectedChat.avatar;

                return (
                  <div
                    key={msg.id || msg.timestamp}
                    className={`flex items-end gap-2 w-full ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isSent && <img src={avatarSrc} alt="Avatar" className="w-8 h-8 rounded-full" />}
                    <div
                      className={`px-3 py-2 rounded-xl mb-2 max-w-[60%] ${isSent ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}
                    >
                      {msg.text}
                    </div>
                    {isSent && <img src={avatarSrc} alt="Avatar" className="w-8 h-8 rounded-full" />}
                  </div>
                );
              })}
            </div>

            <div className="chat-input-area flex p-3 gap-2 border-t border-gray-200">
              <input
                type="text"
                placeholder="Type a message..."
                className="chat-input flex-1 px-3 py-2 rounded border"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              />
              <button className="action-btn post px-4 py-2" onClick={handleSend}>Send</button>
            </div>
          </>
        ) : selectedChatId === 'gemini' ? (
          // Gemini chatbot window
          <>
            <div className="chat-window-header flex items-center gap-2 p-3 border-b border-gray-200">
              <button onClick={() => setSelectedChatId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>&larr;</button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🤖</span>
                </div>
                <span className="font-bold">Gemini Assistant</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-gradient-to-b from-purple-50 to-blue-50">
              <div className="flex-1 overflow-y-auto gap-2 mb-4 p-4 bg-white rounded-xl shadow-lg" ref={geminiRef}>
                {geminiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-end gap-2 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'bot' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">🤖</span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[70%] ${msg.role === 'user' ?
                        'bg-blue-500 text-white' :
                        'bg-gray-100 text-gray-800 border'}`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">👤</span>
                      </div>
                    )}
                  </div>
                ))}
                {isGeminiLoading && (
                  <div className="flex justify-start gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">🤖</span>
                    </div>
                    <div className="px-4 py-2 bg-gray-100 rounded-2xl border animate-pulse">Typing...</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 p-2 bg-white rounded-xl shadow-lg border">
                <input
                  type="text"
                  placeholder="Ask about cost estimates, descriptions, timelines..."
                  className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={geminiInput}
                  onChange={e => setGeminiInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isGeminiLoading) {
                      e.preventDefault();
                      sendToGemini();
                    }
                  }}
                  disabled={isGeminiLoading}
                />
                <button
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all font-semibold disabled:opacity-50"
                  onClick={sendToGemini}
                  disabled={isGeminiLoading || !geminiInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a chat</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
