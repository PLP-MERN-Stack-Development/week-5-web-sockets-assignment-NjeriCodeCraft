# Real-Time Chat App

## Project Overview
This is a real-time chat application built with React (client) and Node.js/Express/Socket.io (server). It supports public and private messaging, file/image sharing, reactions, notifications, and more. The app demonstrates bidirectional communication and real-time features suitable for modern chat platforms.

---

## Setup Instructions

### 1. **Clone Your Repository**
```
git clone <your-github-classroom-repo-url>
cd <repo-folder>
```

### 2. **Install Server Dependencies**
```
cd server
npm install
```

### 3. **Install Client Dependencies**
```
cd ../client
npm install
```

### 4. **Run the Application Locally**
- **Start the server:**
  ```
  cd server
  npm run dev
  ```
- **Start the client:**
  ```
  cd ../client
  npm start
  ```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features Implemented
- **User authentication** (username-based)
- **Global chat rooms** (general, random)
- **Private messaging** between users
- **Display messages** with sender and timestamp
- **Typing indicators**
- **Online/offline user status**
- **Multiple chat rooms/channels**
- **File/image sharing** (inline images, downloadable files)
- **Message reactions** (👍, ❤️, 😂, toggleable)
- **Read receipts (delivered status)**
- **Real-time notifications** (browser and sound)
- **Unread message count**
- **Message search**
- **Message pagination** (load older messages)
- **Responsive design** (desktop/mobile)
- **Error handling and reconnection logic**

---

## Screenshots / GIFs

> _Chat-app.png
_

---

## Deployment (Optional)

- **Server deployed at:** [Add your server URL here]
- **Client deployed at:** [Add your client URL here]

---

## Submission Notes
- Commit and push your code regularly to show progress.
- Ensure both client and server code are included in your repository.
- The instructor will review your submission after autograding is complete.

---

## Credits
- Built with [React](https://reactjs.org/), [Express](https://expressjs.com/), and [Socket.io](https://socket.io/). 