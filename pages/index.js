// This is our main page, where users enter their details to join a room
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import Firebase and Firestore modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// The main component for our planning poker app
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [room, setRoom] = useState('');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // This effect runs once to initialize Firebase and authenticate the user
  useEffect(() => {
    async function initializeFirebase() {
      try {
        console.log('Initializing Firebase...');

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        const app = initializeApp(firebaseConfig);
        const dbInstance = getFirestore(app);
        const authInstance = getAuth(app);

        // Sign in the user. We try with the custom token first, then fall back to anonymous.
        if (initialAuthToken) {
          await signInWithCustomToken(authInstance, initialAuthToken);
        } else {
          await signInAnonymously(authInstance);
        }

        // Set up an auth state listener to get the user ID
        onAuthStateChanged(authInstance, (currentUser) => {
          if (currentUser) {
            setUserId(currentUser.uid);
            console.log('User authenticated with ID:', currentUser.uid);
          } else {
            // This case should not be reached with anonymous auth
            console.log('No user authenticated.');
          }
          setLoading(false);
        });

        // Store the Firebase service instances in state
        setDb(dbInstance);
        setAuth(authInstance);

      } catch (error) {
        console.error('Failed to initialize Firebase or authenticate user:', error);
        setLoading(false);
      }
    }

    initializeFirebase();
  }, []);

  // Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user && room && db && userId) {
      // Construct the document path for the current room
      const roomRef = doc(db, 'artifacts', userId, 'poker-rooms', room);
      
      try {
        // Set a document with a simple message to initialize it if it doesn't exist
        await setDoc(roomRef, { 
          initialized: true,
          createdAt: new Date().toISOString()
        }, { merge: true });

        // Log the successful creation/update
        console.log(`Room document for ${room} created/updated in Firestore.`);

        // Navigate to the dynamic room URL
        router.push(`/room/${room}?user=${user}`);
      } catch (error) {
        console.error('Error creating/joining room:', error);
        alert('Failed to join room. Please try again.');
      }
    } else {
      alert('Please wait for the app to load and then enter your name and a room ID!');
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
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Your user ID for debugging purposes:</p>
        <p className="font-mono break-all">{userId}</p>
      </div>
    </div>
  );
}
