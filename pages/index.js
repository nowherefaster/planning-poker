// This is our main page, where users enter their details to join a room
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';

// The main component for our planning poker app
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [room, setRoom] = useState('');

  // Use a ref to store the socket instance
  const socketRef = useRef(null);

  // This effect runs once when the component mounts
  useEffect(() => {
    // We only create the socket connection if it doesn't already exist
    if (!socketRef.current) {
      // Connect to the server's Socket.IO endpoint using a relative path
      const socket = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'], // Prioritize websockets
        reconnectionAttempts: 5 // Add more attempts to reconnect on failure
      });
      
      // Store the socket instance in the ref
      socketRef.current = socket;

      // Handle server-side events
      socket.on('connect', () => {
        console.log('Successfully connected to the server!');
      });
      
      // Handle connection errors
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      // Handle the 'update-room' event, which is a personalized message for a new user
      socket.on('update-room', (data) => {
        console.log(data.message);
      });

      // Handle the 'user-joined' event, which is a broadcast to all users in the room
      socket.on('user-joined', (data) => {
        console.log(`${data.user} has joined the room!`);
      });

      // Clean up the socket connection when the component unmounts
      return () => {
        if (socket.connected) {
          socket.disconnect();
          console.log('Disconnected from the server.');
        }
      };
    }
  }, []);

  // Handle the form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (user && room) {
      // Emit the 'join-room' event with the user and room data
      socketRef.current.emit('join-room', { roomid: room, user });
      
      // Navigate to the dynamic room URL
      router.push(`/room/${room}?user=${user}`);
    } else {
      alert('Please enter your name and a room ID!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Join a Poker Room</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
            <input
              type="text"
              id="name"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label htmlFor="room" className="block text-sm font-medium text-gray-700">Room ID</label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter a room ID"
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
