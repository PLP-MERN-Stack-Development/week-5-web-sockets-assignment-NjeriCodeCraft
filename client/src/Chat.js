import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const socket = io('http://localhost:5000');
// Use a reliable mp3 sound
const notificationSound = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
notificationSound.preload = 'auto';

function Chat({ username }) {
  const [activeRoom, setActiveRoom] = useState('general');
  const [rooms, setRooms] = useState(['general', 'random']);
  const [privateMessageRecipient, setPrivateMessageRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [file, setFile] = useState(null);
  const [windowFocused, setWindowFocused] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  // Pagination: load 20 messages per page
  const MESSAGES_PER_PAGE = 20;
  const paginatedMessages = messages.slice(-page * MESSAGES_PER_PAGE);

  useEffect(() => {
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    socket.emit('join_chat', username);
    socket.emit('join_room', activeRoom);
  }, [username, activeRoom]);

  useEffect(() => {
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, delivered: true }]);
      setUnreadCount((count) => count + 1);
      if (!windowFocused && showNotifications) {
        new window.Notification('New Message', { body: `${msg.sender}: ${msg.text}` });
      }
      try {
        notificationSound.play();
      } catch (e) {}
    });
    socket.on('receive_private_message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, isPrivate: true, delivered: true }]);
      setUnreadCount((count) => count + 1);
      if (!windowFocused && showNotifications) {
        new window.Notification('Private Message', { body: `${msg.sender}: ${msg.text}` });
      }
      try {
        notificationSound.play();
      } catch (e) {}
    });
    socket.on('receive_file', (msg) => {
      setMessages((prev) => [...prev, { ...msg, delivered: true }]);
      setUnreadCount((count) => count + 1);
      if (!windowFocused && showNotifications) {
        new window.Notification('File Received', { body: `${msg.sender} sent a file.` });
      }
      try {
        notificationSound.play();
      } catch (e) {}
    });
    socket.on('user_joined', (user) => setMessages((prev) => [...prev, { system: true, text: `${user} joined the chat` }]));
    socket.on('user_left', (user) => setMessages((prev) => [...prev, { system: true, text: `${user} left the chat` }]));
    socket.on('user_typing', (user) => setTypingUsers((prev) => prev.includes(user) ? prev : [...prev, user]));
    socket.on('user_stop_typing', (user) => setTypingUsers((prev) => prev.filter((u) => u !== user)));
    socket.on('online_users', (users) => setOnlineUsers(users));
    socket.on('reaction', ({ messageId, reaction, user, room }) => {
      setMessages((prev) => prev.map((msg) => {
        if (msg.id === messageId) {
          const reactions = { ...(msg.reactions || {}) };
          reactions[reaction] = reactions[reaction] || [];
          if (reactions[reaction].includes(user)) {
            // Remove reaction
            reactions[reaction] = reactions[reaction].filter(u => u !== user);
          } else {
            // Add reaction
            reactions[reaction].push(user);
          }
          return { ...msg, reactions };
        }
        return msg;
      }));
    });
    return () => {
      socket.off('receive_message');
      socket.off('receive_private_message');
      socket.off('receive_file');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('online_users');
      socket.off('reaction');
    };
  }, [showNotifications, windowFocused]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setUnreadCount(0);
  }, [messages, activeRoom]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const joinRoom = (room) => {
    setActiveRoom(room);
    setMessages([]);
    socket.emit('join_room', room);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result;
        const fileMsg = {
          id: uuidv4(),
          sender: username,
          file: {
            name: file.name,
            type: file.type,
            data: fileData,
          },
          timestamp: new Date().toISOString(),
          room: activeRoom,
          delivered: true
        };
        if (activeRoom === 'general' || activeRoom === 'random') {
          socket.emit('send_file', fileMsg);
        } else {
          socket.emit('private_file', { ...fileMsg, room: activeRoom });
        }
        setFile(null);
      };
      reader.readAsDataURL(file);
      return;
    }
    if (message.trim()) {
      const msgObj = {
        id: uuidv4(),
        sender: username,
        text: message,
        timestamp: new Date().toISOString(),
        room: activeRoom,
        delivered: true
      };
      if (activeRoom === 'general' || activeRoom === 'random') {
        socket.emit('send_message', msgObj);
      } else {
        socket.emit('private_message', { ...msgObj, room: activeRoom });
      }
      setMessage('');
      socket.emit('stop_typing');
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!typingTimeout.current) {
      socket.emit('typing');
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing');
      typingTimeout.current = null;
    }, 1000);
  };

  const sendPrivateMessage = (recipient) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result;
        const room = [username, recipient].sort().join('-');
        setActiveRoom(room);
        socket.emit('join_room', room);
        const fileMsg = {
          id: uuidv4(),
          sender: username,
          file: {
            name: file.name,
            type: file.type,
            data: fileData,
          },
          timestamp: new Date().toISOString(),
          room,
          delivered: true
        };
        socket.emit('private_file', fileMsg);
        setFile(null);
      };
      reader.readAsDataURL(file);
      return;
    }
    if (message.trim()) {
      const room = [username, recipient].sort().join('-');
      setActiveRoom(room);
      socket.emit('join_room', room);
      const msgObj = {
        id: uuidv4(),
        sender: username,
        text: message,
        timestamp: new Date().toISOString(),
        isPrivate: true,
        recipient,
        room,
        delivered: true
      };
      socket.emit('private_message', msgObj);
      setMessage('');
    }
  };

  // Message reactions
  const addReaction = (msg, reaction) => {
    socket.emit('reaction', {
      messageId: msg.id,
      reaction,
      user: username,
      room: msg.room || activeRoom
    });
  };

  // Message search
  const filteredMessages = paginatedMessages.filter(msg =>
    !search || ((msg.text && msg.text.toLowerCase().includes(search.toLowerCase())) || (msg.file && msg.file.name.toLowerCase().includes(search.toLowerCase())))
  );

  // Responsive styles
  const chatContainerStyle = {
    maxWidth: 600,
    margin: '0 auto',
    padding: 20,
    boxSizing: 'border-box',
    width: '100%'
  };
  const mobileStyle = window.innerWidth < 700 ? { padding: 5, fontSize: 14 } : {};

  return (
    <div style={{ ...chatContainerStyle, ...mobileStyle }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <strong>Online users:</strong> {onlineUsers.join(', ')}
        </div>
        <div style={{ flex: 1, minWidth: 180, textAlign: 'right' }}>
          <button onClick={() => setShowNotifications(!showNotifications)}>
            {showNotifications ? 'Disable' : 'Enable'} Notifications
          </button>
          <span style={{ marginLeft: 10 }}>Unread: {unreadCount}</span>
        </div>
      </div>
      <div style={{ margin: '10px 0' }}>
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <h3>Rooms</h3>
        {rooms.map(room => (
          <button key={room} onClick={() => joinRoom(room)} style={{ marginRight: 5, background: activeRoom === room ? '#007bff' : '#eee', color: activeRoom === room ? '#fff' : '#000', marginBottom: 5 }}>
            {room}
          </button>
        ))}
      </div>
      <div>
        <h3>Send Private Message</h3>
        <select
          value={privateMessageRecipient}
          onChange={(e) => setPrivateMessageRecipient(e.target.value)}
        >
          <option value="">Select user</option>
          {onlineUsers.filter(u => u !== username).map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
        {privateMessageRecipient && (
          <button onClick={() => sendPrivateMessage(privateMessageRecipient)}>
            Start Private Chat
          </button>
        )}
      </div>
      <div style={{ border: '1px solid #ccc', height: 300, overflowY: 'auto', margin: '10px 0', padding: 10, background: '#fafafa' }}>
        {filteredMessages.map((msg, i) =>
          msg.system ? (
            <div key={i} style={{ color: '#888', fontStyle: 'italic' }}>{typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}</div>
          ) : msg.file ? (
            <div key={i} style={{ marginBottom: 8, background: msg.isPrivate ? '#e6f7ff' : '#fff', padding: 5, borderRadius: 4 }}>
              <strong>{msg.sender}</strong>: 
              {msg.file.type.startsWith('image/') ? (
                <img src={msg.file.data} alt={msg.file.name} style={{ maxWidth: 200, maxHeight: 150, display: 'block', margin: '5px 0' }} />
              ) : (
                <a href={msg.file.data} download={msg.file.name}>{msg.file.name}</a>
              )}
              <span style={{ fontSize: 10, color: '#aaa', marginLeft: 8 }}>{msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}</span>
              <span style={{ marginLeft: 10, fontSize: 10, color: '#28a745' }}>{msg.delivered ? 'Delivered' : ''}</span>
            </div>
          ) : (
            <div key={i} style={{ marginBottom: 8, background: msg.isPrivate ? '#e6f7ff' : '#fff', padding: 5, borderRadius: 4 }}>
              <strong>{msg.sender}</strong>: {typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)} <span style={{ fontSize: 10, color: '#aaa' }}>{msg.timestamp && new Date(msg.timestamp).toLocaleTimeString()}</span>
              {msg.reactions && (
                <span style={{ marginLeft: 10 }}>
                  {Object.entries(msg.reactions).map(([r, users]) => (
                    <span key={r} style={{ marginRight: 5 }}>
                      {r} {users.length}
                    </span>
                  ))}
                </span>
              )}
              <span style={{ marginLeft: 10 }}>
                <button
                  onClick={() => addReaction(msg, '👍')}
                  style={{ fontWeight: msg.reactions && msg.reactions['👍'] && msg.reactions['👍'].includes(username) ? 'bold' : 'normal' }}
                >👍</button>
                <button
                  onClick={() => addReaction(msg, '❤️')}
                  style={{ fontWeight: msg.reactions && msg.reactions['❤️'] && msg.reactions['❤️'].includes(username) ? 'bold' : 'normal' }}
                >❤️</button>
                <button
                  onClick={() => addReaction(msg, '😂')}
                  style={{ fontWeight: msg.reactions && msg.reactions['😂'] && msg.reactions['😂'].includes(username) ? 'bold' : 'normal' }}
                >😂</button>
              </span>
              <span style={{ marginLeft: 10, fontSize: 10, color: '#28a745' }}>{msg.delivered ? 'Delivered' : ''}</span>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>
      {typingUsers.length > 0 && (
        <div style={{ color: '#888', marginBottom: 10 }}>
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleTyping}
          onBlur={() => socket.emit('stop_typing')}
          style={{ flex: 2, minWidth: 120 }}
        />
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          style={{ flex: 1, minWidth: 120 }}
        />
        <button type="submit" disabled={!message.trim() && !file} style={{ flex: 1, minWidth: 80 }}>Send</button>
      </form>
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        {messages.length > page * MESSAGES_PER_PAGE && (
          <button onClick={() => setPage(page + 1)}>Load older messages</button>
        )}
      </div>
    </div>
  );
}

export default Chat;