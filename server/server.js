const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Track online users
let onlineUsers = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins chat with username
  socket.on('join_chat', (username) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    socket.broadcast.emit('user_joined', username);
    io.emit('online_users', Object.values(onlineUsers));
  });

  // Join a room (public or private)
  socket.on('join_room', (room) => {
    socket.join(room);
    // Optionally notify room members
    // io.to(room).emit('room_joined', { user: socket.username, room });
  });

  // Handle sending messages to a room
  socket.on('send_message', (msgObj) => {
    io.to(msgObj.room || 'general').emit('receive_message', {
      ...msgObj,
      sender: socket.username,
      timestamp: msgObj.timestamp || new Date().toISOString(),
    });
  });

  // Handle private messages
  socket.on('private_message', (msgObj) => {
    io.to(msgObj.room).emit('receive_private_message', {
      ...msgObj,
      sender: socket.username,
      timestamp: msgObj.timestamp || new Date().toISOString(),
    });
  });

  // Handle reactions
  socket.on('reaction', ({ messageId, reaction, user, room }) => {
    // Just broadcast the reaction event to the room
    io.to(room).emit('reaction', { messageId, reaction, user, room });
  });

  // Typing indicator
  socket.on('typing', () => {
    socket.broadcast.emit('user_typing', socket.username);
  });

  socket.on('stop_typing', () => {
    socket.broadcast.emit('user_stop_typing', socket.username);
  });

  // Handle sending files to a room
  socket.on('send_file', (fileMsg) => {
    io.to(fileMsg.room || 'general').emit('receive_file', {
      sender: socket.username,
      file: fileMsg.file,
      timestamp: new Date().toISOString(),
      room: fileMsg.room || 'general'
    });
  });

  // Handle private file sharing
  socket.on('private_file', (fileMsg) => {
    io.to(fileMsg.room).emit('receive_file', {
      sender: socket.username,
      file: fileMsg.file,
      timestamp: new Date().toISOString(),
      room: fileMsg.room
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.username) {
      socket.broadcast.emit('user_left', socket.username);
      delete onlineUsers[socket.id];
      io.emit('online_users', Object.values(onlineUsers));
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});