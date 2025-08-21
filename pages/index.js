import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

const adjectives = ["Dancing", "Smiling", "Happy", "Jumping", "Singing", "Clever", "Brave", "Kind", "Witty", "Joyful"];
const animals = ["Penguin", "Dolphin", "Koala", "Tiger", "Fox", "Panda", "Elephant", "Giraffe", "Lion", "Rabbit"];

const getRandomName = () => {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  return `${randomAdjective} ${randomAnimal}`;
};

const HomePage = () => {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');

  const handleCreateRoom = () => {
    // Generate a unique room ID (a simple timestamp is good for this use case)
    const newRoomId = Date.now().toString();
    // Use the user-entered name or a random one
    const user = userName || getRandomName();
    router.push(`/room/${newRoomId}?user=${encodeURIComponent(user)}`);
  };

  const handleJoinRoom = () => {
    if (roomName) {
      // Use the user-entered name or a random one
      const user = userName || getRandomName();
      router.push(`/room/${roomName}?user=${encodeURIComponent(user)}`);
    } else {
      alert('Please enter a room ID to join.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans">
      <Head>
        <title>Planning Poker App</title>
      </Head>

      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <Image 
          src="https://placehold.co/128x128/087C7C/ffffff?text=Slalom" 
          alt="Slalom Logo" 
          width={128} 
          height={128} 
          className="mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold mb-2 text-slalom-blue-dark">Welcome to Planning Poker</h1>
        <p className="text-gray-600 mb-6">Create or join a session to start estimating!</p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name (e.g., Jane Doe)"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slalom-blue-light"
          />

          <button
            onClick={handleCreateRoom}
            className="w-full bg-slalom-green-light hover:bg-slalom-green-dark text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Create New Room
          </button>
          
          <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-400"></div>
          </div>
          
          <input
            type="text"
            placeholder="Enter Room ID to Join"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slalom-blue-light"
          />

          <button
            onClick={handleJoinRoom}
            className="w-full bg-slalom-blue-light hover:bg-slalom-blue-dark text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Join Existing Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
