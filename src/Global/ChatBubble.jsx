import React from 'react';

// ChatBubble: renders a single message bubble with left/right alignment
// Props:
// - msg: message object ({ text, timestamp, senderId, senderRole })
// - isSent: boolean, true when message is sent by the current user
// - currentUserPic: URL for the current user avatar (shown on right for sent)
// - chatAvatar: URL for the other user's avatar (shown on left for received)
// - userRole: current user's role ('client'|'provider')

export default function ChatBubble({ msg, isSent, currentUserPic, chatAvatar, userRole }) {
  const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const sentClass = 'bg-blue-500 text-white';
  const receivedClass = 'bg-gray-200 text-gray-800';

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} items-end`}> 
      {!isSent && (
        <img src={chatAvatar} alt="avatar" className="w-8 h-8 rounded-full mr-2 self-end" />
      )}

      <div className={`max-w-[75%] p-3 rounded-xl break-words ${isSent ? sentClass + ' ml-4' : receivedClass}`}>
        <div className="message-text">{msg.text}</div>
        <div className={`text-[10px] opacity-80 mt-1 ${isSent ? 'text-right' : 'text-left'}`}>
          {isSent ? `You • ${timeStr}` : timeStr}
        </div>
      </div>

      {isSent && (
        <img src={currentUserPic} alt="you" className="ml-2 w-8 h-8 rounded-full self-end" />
      )}
    </div>
  );
}
