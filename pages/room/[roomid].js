// This is the room page, where users will be able to vote and see results
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import Firebase and Firestore modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

// The main component for our planning poker room
export default function Room() {
  const router = useRouter();
  const { room, user } = router.query;
  
  // State variables for Firebase services and data
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use a single useEffect hook for Firebase initialization and data listening
  useEffect(() => {
    async function initializeFirebase() {
      try {
        // Log that we're starting the Firebase initialization
        console.log('Initializing Firebase...');

        // IMPORTANT: Use the global variables provided by the Canvas environment
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // Initialize Firebase with the provided configuration
        const app = initializeApp(firebaseConfig);
        const dbInstance = getFirestore(app);
        const authInstance = getAuth(app);

        // Sign in the user. We try with the custom token first, then fall back to anonymous.
        if (initialAuthToken) {
          await signInWithCustomToken(authInstance, initialAuthToken);
        } else {
          await signInAnonymously(authInstance);
        }

        // Once authenticated, set the user ID and services
        setUserId(authInstance.currentUser?.uid || crypto.randomUUID());
        setDb(dbInstance);
        setAuth(authInstance);
        setLoading(false);
        console.log('Firebase initialized and user authenticated.');

      } catch (error) {
        console.error('Failed to initialize Firebase or authenticate user:', error);
        setLoading(false);
      }
    }

    // Call the initialization function when the component mounts
    initializeFirebase();
  }, []);

  // Set up the real-time Firestore listener once Firebase is ready
  useEffect(() => {
    // Ensure we have the necessary data before trying to listen to the database
    if (db && userId && room) {
      console.log(`Setting up real-time listener for room: ${room}`);

      // Construct the document path for the current room
      const roomRef = doc(db, 'artifacts', userId, 'poker-rooms', room);

      // Set up the onSnapshot listener for real-time updates
      const unsubscribe = onSnapshot(roomRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          // If the document exists, update our state with the latest data
          console.log('Real-time update received:', docSnapshot.data());
          setRoomData(docSnapshot.data());
        } else {
          // If the document doesn't exist, we can handle it here (e.g., create it)
          console.log('No such document! Room may need to be initialized.');
          setRoomData(null);
        }
      }, (error) => {
        console.error('Error listening to room data:', error);
      });

      // Clean up the listener when the component unmounts
      return () => {
        console.log('Detaching Firestore listener.');
        unsubscribe();
      };
    }
  }, [db, userId, room]);

  // Render a loading state or the main content based on state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Render the main room UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans antialiased">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Room: <span className="text-blue-600">{room}</span>
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome, <span className="font-semibold text-gray-800">{user}</span>!
        </p>
        
        {roomData ? (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="text-lg font-semibold text-blue-800">Room Status:</h3>
            <pre className="mt-2 text-sm text-blue-700 text-left overflow-x-auto">
              {JSON.stringify(roomData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <p className="text-sm text-yellow-800">Room data is not yet available. It will be created when the first user performs an action.</p>
          </div>
        )}

      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Your user ID for debugging purposes:</p>
        <p className="font-mono break-all">{userId}</p>
      </div>
    </div>
  );
}
