// src/Global/Messages.jsx - FIXED: Auto-create chats when offers are accepted/countered
import React, { useState, useEffect, useRef } from "react";
import { sendMessage, subscribeToChatMessages, subscribeToChats } from "../lib/firebase";
import { sendGeminiMessage } from "../lib/gemini";
import ChatBubble from "./ChatBubble";
import { realtimeDb } from "../lib/firebase";
import { ref, onValue, set, get } from 'firebase/database';

const MessagesPage = ({ 
  userRole = 'client', 
  currentUser,
  onViewRequestDetails, 
  onViewOfferDetails
}) => {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
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

  // Data state
  const [offers, setOffers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState({});

  const selectedChat = chats.find(c => c.id === selectedChatId);
  
  // Get current user profile pic
  const currentUserProfile = profiles[currentUser];
  const currentUserPic = currentUserProfile?.profilePic || 
    `https://ui-avatars.com/api/?name=${currentUser}&size=200`;

  // Set local user ID
  useEffect(() => {
    setLocalUserId(currentUser);
  }, [currentUser]);

  // Load offers from Firebase
  useEffect(() => {
    if (!realtimeDb) return;
    const offersRef = ref(realtimeDb, 'offers');
    const unsubscribe = onValue(offersRef, (snapshot) => {
      const val = snapshot.val() || {};
      const list = Object.entries(val).map(([key, value]) => ({
        id: Number(key),
        ...value
      }));
      setOffers(list);
    });
    return () => unsubscribe();
  }, []);

  // Load requests from Firebase
  useEffect(() => {
    if (!realtimeDb) return;
    const requestsRef = ref(realtimeDb, 'requests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const val = snapshot.val() || {};
      const list = Object.entries(val).map(([key, value]) => ({
        id: Number(key),
        ...value
      }));
      setRequests(list);
    });
    return () => unsubscribe();
  }, []);

  // Load profiles from Firebase
  useEffect(() => {
    if (!realtimeDb) return;
    const profilesRef = ref(realtimeDb, 'profiles');
    const unsubscribe = onValue(profilesRef, (snapshot) => {
      const val = snapshot.val() || {};
      setProfiles(val);
    });
    return () => unsubscribe();
  }, []);

  // ✅ FIXED: Auto-create chats for accepted offers and counter offers
  useEffect(() => {
    if (!realtimeDb || !offers.length || !requests.length || Object.keys(profiles).length === 0) {
      console.log('⏳ Waiting for data:', { 
        hasDb: !!realtimeDb, 
        offers: offers.length, 
        requests: requests.length, 
        profiles: Object.keys(profiles).length 
      });
      return;
    }

    console.log('🔍 Checking offers for chat creation...');

    const createChatsForOffers = async () => {
      for (const offer of offers) {
        // Only process accepted or counter offers
        if (offer.status !== 'accepted' && offer.status !== 'counter') continue;

        const request = requests.find(r => r.id === offer.requestId);
        if (!request) {
          console.log('⚠️ Request not found for offer:', offer.id);
          continue;
        }

        const clientId = request.clientId;
        const providerId = offer.providerId;
        
        if (!clientId || !providerId) {
          console.log('⚠️ Missing IDs:', { clientId, providerId, offerId: offer.id });
          continue;
        }

        // Create consistent chat ID
        const chatId = `offer-${offer.id}`;

        // ✅ Check if chat already exists in Firebase (not just local state)
        try {
          const chatRef = ref(realtimeDb, `chats/${chatId}`);
          const chatSnapshot = await get(chatRef);
          
          if (chatSnapshot.exists()) {
            console.log('✅ Chat already exists:', chatId);
            continue;
          }

          // Get profiles
          const clientProfile = profiles[clientId];
          const providerProfile = profiles[providerId];

          if (!clientProfile || !providerProfile) {
            console.log('⚠️ Profiles not found:', { 
              clientId, 
              hasClient: !!clientProfile, 
              providerId, 
              hasProvider: !!providerProfile 
            });
            continue;
          }

          // Create chat in Firebase with full metadata
          const isAccepted = offer.status === 'accepted';
          
          const chatData = {
            meta: {
              chatId,
              offerId: offer.id,
              requestId: request.id,
              clientId,
              providerId,
              offerStatus: offer.status,
              isAccepted,
              // Full details for accepted offers
              ...(isAccepted && {
                requestTitle: request.title,
                requestLocation: request.location,
                requestDate: request.date,
                requestThumbnail: request.thumbnail,
                offerAmount: offer.amount,
              }),
              // Limited details for counter offers
              ...(!isAccepted && {
                clientFirstName: clientProfile.fullName?.split(' ')[0] || 'Client',
                providerFirstName: providerProfile.fullName?.split(' ')[0] || 'Provider',
                providerSkills: providerProfile.skills?.map(s => s.name).join(', ') || '',
              }),
              clientAvatar: clientProfile.profilePic || `https://ui-avatars.com/api/?name=${clientProfile.fullName}`,
              providerAvatar: providerProfile.profilePic || `https://ui-avatars.com/api/?name=${providerProfile.fullName}`,
              clientName: clientProfile.fullName || 'Client',
              providerName: providerProfile.fullName || 'Provider',
              lastMsg: isAccepted ? 'Offer accepted! Start your conversation.' : 'Counter offer sent',
              lastMsgTime: Date.now()
            },
            messages: {}
          };
          
          await set(chatRef, chatData);
          console.log('✅ Chat created successfully:', chatId, { isAccepted, offerStatus: offer.status });
        } catch (error) {
          console.error('❌ Failed to create chat:', chatId, error);
        }
      }
    };

    createChatsForOffers();
  }, [offers, requests, profiles]); // ✅ Removed 'chats' dependency to avoid circular updates

  // Subscribe to chats
  useEffect(() => {
    if (!currentUser) return;

    console.log('🔌 Subscribing to chats for user:', currentUser);

    const unsub = subscribeToChats(list => {
      console.log('📨 Received chats update:', list?.length || 0);
      
      if (!list || !list.length) {
        setChats([]);
        return;
      }
      
      // Filter chats for current user
      const userChats = list.filter(chat => {
        const meta = chat.meta || {};
        return meta.clientId === currentUser || meta.providerId === currentUser;
      });

      console.log('✅ User chats:', userChats.length, userChats.map(c => c.id));
      setChats(userChats);
      
      // Auto-select first chat if none selected
      if (!selectedChatId && userChats.length > 0) {
        setSelectedChatId(userChats[0].id);
        console.log('🎯 Auto-selected chat:', userChats[0].id);
      }
    });
    
    return () => {
      console.log('🔌 Unsubscribing from chats');
      unsub && unsub();
    };
  }, [currentUser]);

  // Subscribe to messages for selected chat
  useEffect(() => {
    if (!selectedChatId || selectedChatId === 'gemini') {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToChatMessages(selectedChatId, (msgs) => {
      setMessages(msgs || []);
      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 50);
    });

    return () => unsubscribe && unsubscribe();
  }, [selectedChatId]);

  // Handle sending messages
  const handleSend = async () => {
    if (!inputValue.trim() || !selectedChatId) return;
    
    const msg = {
      text: inputValue.trim(),
      sender: currentUser,
      senderRole: userRole,
      senderId: currentUser,
      timestamp: Date.now()
    };

    try {
      await sendMessage(selectedChatId, msg);
      setInputValue('');
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message: ' + err.message);
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

  // Get chat display name
  const getChatDisplayName = (chat) => {
    if (!chat?.meta) return 'Unknown Chat';
    const meta = chat.meta;
    
    if (meta.isAccepted) {
      return userRole === 'client' ? meta.providerName : meta.clientName;
    } else {
      return userRole === 'client' ? meta.providerFirstName : meta.clientFirstName;
    }
  };

  // Get chat avatar
  const getChatAvatar = (chat) => {
    if (!chat?.meta) return '';
    const meta = chat.meta;
    return userRole === 'client' ? meta.providerAvatar : meta.clientAvatar;
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
          {chats
            .filter(c => getChatDisplayName(c).toLowerCase().includes(search.toLowerCase()))
            .map(chat => (
              <div
                key={chat.id}
                className={`chat-item flex items-center gap-3 p-3 cursor-pointer transition-colors rounded ${
                  selectedChatId === chat.id ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <img 
                  src={getChatAvatar(chat)} 
                  alt={getChatDisplayName(chat)} 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0" 
                />
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-gray-800 truncate">
                      {getChatDisplayName(chat)}
                    </p>
                    {chat.meta?.isAccepted && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Accepted
                      </span>
                    )}
                    {chat.meta?.offerStatus === 'counter' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Counter
                      </span>
                    )}
                  </div>
                  {chat.meta?.isAccepted && (
                    <p className="text-xs text-gray-500 truncate">
                      {chat.meta.requestTitle}
                    </p>
                  )}
                  {!chat.meta?.isAccepted && chat.meta?.providerSkills && (
                    <p className="text-xs text-gray-500 truncate">
                      {chat.meta.providerSkills}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm truncate mt-1">
                    {chat.meta?.lastMsg || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))}

          {chats.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <p className="text-sm mt-2">
                Chats will appear when offers are accepted or counter offers are made
              </p>
            </div>
          )}

          {/* Gemini Chatbot */}
          <div 
            className="gemini-chatbot border-t border-gray-200 p-3 bg-gradient-to-r from-purple-50 to-blue-50 cursor-pointer"
            onClick={() => setSelectedChatId('gemini')}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">🤖</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">Gemini Assistant</p>
                <p className="text-xs text-gray-500">Get help with estimations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="chat-window flex-1 flex flex-col bg-gray-50 min-h-0">
        {selectedChat && selectedChatId !== 'gemini' ? (
          <>
            {/* Chat Header */}
            <div className="chat-window-header flex items-center gap-2 p-3 border-b border-gray-200">
              <button 
                onClick={() => setSelectedChatId(null)} 
                className="text-xl mr-2 hover:bg-gray-100 px-2 py-1 rounded"
              >
                ←
              </button>
              <img 
                src={getChatAvatar(selectedChat)} 
                alt={getChatDisplayName(selectedChat)}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-bold">{getChatDisplayName(selectedChat)}</p>
                {selectedChat.meta?.isAccepted && (
                  <p className="text-xs text-gray-500">{selectedChat.meta.requestTitle}</p>
                )}
              </div>
            </div>

            {/* Offer Card - Only show for accepted offers */}
            {selectedChat.meta?.isAccepted && (
              <div className="accepted-offer-card flex items-start gap-4 p-4 bg-white border-b border-gray-200">
                <img 
                  src={selectedChat.meta.requestThumbnail || 'https://via.placeholder.com/80'} 
                  alt="Request" 
                  className="w-20 h-20 object-cover rounded" 
                />
                <div className="flex-1 flex flex-col min-w-0">
                  <h3 className="font-bold text-lg">{selectedChat.meta.requestTitle}</h3>
                  <p className="text-gray-500 text-sm">
                    {selectedChat.meta.requestLocation} • {selectedChat.meta.requestDate}
                  </p>
                  <p className="text-green-600 font-semibold mt-1">
                    Accepted Price: ₱{parseFloat(selectedChat.meta.offerAmount || 0).toLocaleString()}
                  </p>
                  <button
                    className="text-blue-500 text-sm mt-2 hover:underline text-left"
                    onClick={() => {
                      if (onViewOfferDetails) {
                        onViewOfferDetails(selectedChat.meta.offerId);
                      }
                    }}
                  >
                    View full details
                  </button>
                </div>
              </div>
            )}

            {/* Counter Offer Info */}
            {selectedChat.meta?.offerStatus === 'counter' && userRole === 'client' && (
              <div className="bg-blue-50 border-b-2 border-blue-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-800">Counter Offer Pending</p>
                    <p className="text-sm text-gray-600">
                      {selectedChat.meta.providerFirstName} has responded to your counter offer
                    </p>
                  </div>
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    onClick={() => onViewOfferDetails && onViewOfferDetails(selectedChat.meta.offerId)}
                  >
                    Review & Accept
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div 
              className="chat-content flex-1 flex flex-col p-4 overflow-y-auto gap-3 min-h-0" 
              ref={messagesRef}
            >
              {messages.map(msg => (
                <ChatBubble
                  key={msg.id || msg.timestamp}
                  msg={msg}
                  isSent={msg.senderId === currentUser}
                  currentUserPic={currentUserPic}
                  chatAvatar={getChatAvatar(selectedChat)}
                  userRole={userRole}
                />
              ))}
            </div>

            {/* Input Area */}
            <div className="chat-input-area flex p-3 gap-2 border-t border-gray-200 bg-white">
              <input
                type="text"
                placeholder="Type a message..."
                className="chat-input flex-1 px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    handleSend(); 
                  } 
                }}
              />
              <button 
                className="action-btn client-post-btn px-6 py-2 rounded" 
                onClick={handleSend}
                disabled={!inputValue.trim()}
              >
                Send
              </button>
            </div>
          </>
        ) : selectedChatId === 'gemini' ? (
          // Gemini chatbot window
          <>
            <div className="chat-window-header flex items-center gap-2 p-3 border-b border-gray-200">
              <button 
                onClick={() => setSelectedChatId(null)} 
                className="text-xl mr-2 hover:bg-gray-100 px-2 py-1 rounded"
              >
                ←
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🤖</span>
                </div>
                <span className="font-bold">Gemini Assistant</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-gradient-to-b from-purple-50 to-blue-50">
              <div className="flex-1 overflow-y-auto gap-3 mb-4 p-4 bg-white rounded-xl shadow-lg" ref={geminiRef}>
                {geminiMessages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg font-semibold mb-2">Hello! I'm your AI assistant</p>
                    <p className="text-sm">Ask me about service costs, timelines, or descriptions</p>
                  </div>
                )}
                {geminiMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-end gap-2 w-full mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'bot' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">🤖</span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[70%] ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800 border'
                      }`}
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
                    <div className="px-4 py-2 bg-gray-100 rounded-2xl border animate-pulse">
                      Typing...
                    </div>
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
            <div className="text-center">
              <p className="text-lg">Select a conversation to start messaging</p>
              <p className="text-sm mt-2">or chat with the AI Assistant</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;