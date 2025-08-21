// This is our main page, where users enter their details to join a room
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import Firebase and Firestore modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

let app, auth, db;
let userId;
let firebaseInitialized = false;

// The main component for our planning poker app
export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(true);

  // This effect runs once to initialize Firebase and authenticate the user
  useEffect(() => {
    async function initializeFirebase() {
      if (firebaseInitialized) {
        setLoading(false);
        return;
      }
      try {
        console.log('Initializing Firebase...');

        // Use environment variables provided by Vercel
        const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
        const initialAuthToken = process.env.NEXT_PUBLIC_INITIAL_AUTH_TOKEN;

        // Initialize Firebase with the provided configuration
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in the user. We try with the custom token first, then fall back to anonymous.
        if (initialAuthToken && initialAuthToken.split('.').length === 3) {
          // Only attempt custom token sign-in if the format is valid
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          // Fall back to anonymous sign-in, which is perfect for this app
          await signInAnonymously(auth);
        }

        // Set up an auth state listener to get the user ID
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            userId = currentUser.uid;
            console.log('User authenticated with ID:', userId);
          } else {
            console.log('No user authenticated.');
          }
          setLoading(false);
        });

        firebaseInitialized = true;

        // Return a cleanup function
        return () => unsubscribe();

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
    if (user && room && !loading && db && userId) {
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
        // We will show an alert to the user.
        alert('Failed to join room. Please try again.');
      }
    } else {
      // We will show an alert to the user.
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
