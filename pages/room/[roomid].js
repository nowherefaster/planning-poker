import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

let socket;

const PokerRoom = () => {
  const router = useRouter();
  const { roomid } = router.query;

  const [message, setMessage] = useState('');

  // Use useEffect to set up the Socket.IO connection
  useEffect(() => {
    // We only want to connect once
    const socketInitializer = async () => {
      // Connect to the Socket.IO server at the same URL as the app
      await fetch('/api/socket'); // Call API to initialize the socket
      socket = io();

      // Listen for a "connect" event and set the message
      socket.on('connect', () => {
        setMessage('Connected to the server!');
        console.log('socket connected');
      });

      // Listen for a "new-message" event and set the message state
      socket.on('new-message', (msg) => {
        setMessage(msg);
      });
    };

    if (roomid) {
      socketInitializer();
    }

    // Clean up the socket connection when the component unmounts
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomid]);

  return (
    <div>
      <h1>Poker Room: {roomid}</h1>
      <p>{message}</p>
    </div>
  );
};

export default PokerRoom;
