import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import io from 'socket.io-client';

let socket;

const PokerRoom = () => {
  const router = useRouter();
  const { roomid, user } = router.query;

  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');

  // Use useEffect to set up the Socket.IO connection
  useEffect(() => {
    // We only want to connect once
    const socketInitializer = async () => {
      // Connect to the Socket.IO server at the same URL as the app
      await fetch('/api/socket');
      socket = io();

      // Listen for a "connect" event and set the message
      socket.on('connect', () => {
        setMessage('Connected to the server!');
        console.log('socket connected');
        // Announce to the server that a new user has joined
        if (roomid && user) {
          socket.emit('join-room', { roomid, user });
        }
      });
      
      // Listen for updates from the server
      socket.on('update-room', (data) => {
        console.log(data.message);
        // You'll handle more complex updates here later, like user lists and votes
      });

      // Listen for a "user-joined" event and update the message
      socket.on('user-joined', (data) => {
        setMessage(`${data.user} has joined the room!`);
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
  }, [roomid, user]);
  
  // Get user name from the URL
  useEffect(() => {
    if (user) {
      setUserName(decodeURIComponent(user));
    }
  }, [user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans">
      <Head>
        <title>Poker Room: {roomid}</title>
      </Head>

      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2 text-slalom-blue-dark">Hello, {userName}</h1>
        <p className="text-gray-600 mb-6">Welcome to Poker Room: <span className="font-mono bg-gray-200 px-2 py-1 rounded-md">{roomid}</span></p>
        <p className="text-gray-600 mb-6">Status: {message}</p>
      </div>
    </div>
  );
};

export default PokerRoom;
