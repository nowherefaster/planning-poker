// This is the room page, where users will be able to vote and see results
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';

// The main component for our planning poker room
export default function Room() {
  const router = useRouter();
  const { room, user } = router.query;
  
  // Use a ref to store the socket instance
  const socketRef = useRef(null);

  // This effect runs once when the component mounts and navigates to this page
  useEffect(() => {
    // We only create the socket connection if it doesn't already exist
    if (!socketRef.current) {
      console.log('Room page: Attempting to connect to socket.io...');
      
      const socket = io({
        path: '/api/socket' // Explicitly set the path to our serverless function
      });
      
      socketRef.current = socket;

      // Log when we successfully connect to the server
      socket.on('connect', () => {
        console.log(`Room page: Successfully connected to the server! Socket ID: ${socket.id}`);
        
        // After connecting, emit the join-room event
        if (room && user) {
          console.log(`Room page: Emitting 'join-room' for room: ${room}, user: ${user}`);
          socket.emit('join-room', { roomid: room, user });
        } else {
          console.error('Room page: Missing room ID or user name in URL query.');
        }
      });
      
      // Log any connection errors
      socket.on('connect_error', (err) => {
        console.error('Room page: Socket connection error:', err.message);
      });
      
      // Log connection timeout
      socket.on('connect_timeout', (timeout) => {
        console.error('Room page: Socket connection timeout:', timeout);
      });

      // Handle the 'update-room' event, which is a personalized welcome message
      socket.on('update-room', (data) => {
        console.log(`Room page: Server message: ${data.message}`);
      });
      
      // Handle the 'user-joined' event, which is a broadcast to all users in the room
      socket.on('user-joined', (data) => {
        console.log(`Room page: Server broadcast: ${data.user} has joined the room!`);
      });

      // Clean up the socket connection when the component unmounts
      return () => {
        if (socket.connected) {
          socket.disconnect();
          console.log('Room page: Disconnected from the server.');
        }
      };
    }
  }, [room, user]); // Depend on room and user to ensure connection if they change

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Welcome to room: {room}
        </h1>
        <p className="text-gray-600">
          Hello, {user}!
        </p>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700">Debugging Logs:</p>
          <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
            Check your browser's console for real-time connection and event logs.
          </pre>
        </div>
      </div>
    </div>
  );
}
