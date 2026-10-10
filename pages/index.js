// This is our main page, where users enter their details to join a room
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import Firebase and Firestore modules
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Random Adjective Animal name generator
const generateRandomName = () => {
  const adjectives = [
    'Agile', 'Brave', 'Clever', 'Daring', 'Eager', 'Fearless', 'Gentle',
    'Happy', 'Ingenious', 'Jolly', 'Keen', 'Lively', 'Mighty', 'Nimble',
    'Optimistic', 'Playful', 'Quick', 'Radiant', 'Swift', 'Tenacious',
    'Upbeat', 'Vibrant', 'Wise', 'Zealous'
  ];
  const animals = [
    'Badger', 'Bear', 'Cheetah', 'Dolphin', 'Eagle', 'Falcon', 'Fox',
    'Giraffe', 'Hawk', 'Koala', 'Leopard', 'Lion', 'Otter', 'Owl',
    'Panda', 'Panther', 'Penguin', 'Rabbit', 'Tiger', 'Wolf', 'Zebra'
  ];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  return `${randomAdj} ${randomAnimal}`;
};

// The main component for our planning poker app
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);
  const [firestoreDb, setFirestoreDb] = useState(null);

  // Pre-generate a fun random name on initial mount
  useEffect(() => {
    setUser(generateRandomName());
  }, []);

  // This effect runs once to initialize Firebase and authenticate the user
  useEffect(() => {
    let unsubscribe;
    async function initializeFirebase() {
      try {
        console.log('Initializing Firebase...');

        // Use environment variables provided by Vercel
        const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);

        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        setFirestoreDb(db);

        // Sign in anonymously if not already signed in
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            setCurrentUid(currentUser.uid);
            console.log('User authenticated with ID:', currentUser.uid);
          } else {
            console.log('No user authenticated.');
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('Failed to initialize Firebase or authenticate user:', error);
        setLoading(false);
      }
    }

    initializeFirebase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalUser = user.trim() || generateRandomName();
    const finalRoom = room.trim();

    if (finalRoom && !loading && firestoreDb && currentUid) {
      // Construct the document path for the shared poker room
      const roomRef = doc(firestoreDb, 'poker-rooms', finalRoom);
      
      try {
        // Set a document with a simple message to initialize it if it doesn't exist
        await setDoc(roomRef, { 
          initialized: true,
          createdAt: new Date().toISOString(),
          estimationType: 'fibonacci'
        }, { merge: true });

        // Log the successful creation/update
        console.log(`Room document for ${finalRoom} created/updated in Firestore.`);

        // Navigate to the dynamic room URL
        router.push(`/room/${finalRoom}?user=${encodeURIComponent(finalUser)}`);
      } catch (error) {
        console.error('Error creating/joining room:', error);
        alert(`Failed to join room: ${error.message || error}`);
      }
    } else {
      alert('Please wait for the app to load and make sure to enter a Room ID!');
    }
  };

  // Render a loading state or the main content based on state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans antialiased">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Join a Poker Room</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
              <button
                type="button"
                onClick={() => setUser(generateRandomName())}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                🎲 Randomize
              </button>
            </div>
            <input
              type="text"
              id="name"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="room" className="block text-sm font-medium text-gray-700">Room ID</label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
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
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Your user ID for debugging purposes:</p>
        <p className="font-mono break-all">{currentUid}</p>
      </div>
    </div>
  );
}

