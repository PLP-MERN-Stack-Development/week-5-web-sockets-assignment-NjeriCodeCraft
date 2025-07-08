import React, { useState } from 'react';
import Chat from './Chat';

function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setJoined(true);
    }
  };

  return (
    <div className="App" style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Chat App</h1>
      {!joined ? (
        <form onSubmit={handleJoin} style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit">Join Chat</button>
        </form>
      ) : (
        <Chat username={username} />
      )}
    </div>
  );
}

export default App;