// This is the room page, where users will be able to vote and see results
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// Import Firebase and Firestore modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

let app, auth, db;
let userId;
let firebaseInitialized = false;

// The main component for our planning poker room
export default function Room() {
  const router = useRouter();
  const { room, user } = router.query;
  
  // State variables for Firebase services and data
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  // The predefined set of cards for voting
  const votingCards = ['0', '1', '2', '3', '5', '8', '13', '21', '40', '100', '☕️', '?'];

  // State to track the current user's vote
  const [myVote, setMyVote] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // Use a single useEffect hook for Firebase initialization and data listening
  useEffect(() => {
    async function initializeFirebase() {
      if (firebaseInitialized) {
        setLoading(false);
        return;
      }
      try {
        console.log('Initializing Firebase...');

        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // Use a fallback configuration if the provided one is not available
        let firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        if (!firebaseConfig || !firebaseConfig.projectId) {
            console.warn('Firebase config missing projectId. Using a fallback to prevent crash.');
            firebaseConfig = {
                apiKey: "mock-api-key",
                authDomain: "mock-auth-domain",
                projectId: "mock-project-id",
                storageBucket: "mock-storage-bucket",
                messagingSenderId: "mock-sender-id",
                appId: "mock-app-id"
            };
        }
        
        // Initialize Firebase with the provided configuration
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in the user. We try with the custom token first, then fall back to anonymous.
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }

        // Once authenticated, get the user ID and set it
        onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            userId = currentUser.uid;
            console.log('User authenticated with ID:', userId);
          } else {
            console.log('No user authenticated.');
          }
          setLoading(false);
        });

        firebaseInitialized = true;
        
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

  // Handler for when a user votes
  const handleVote = async (vote) => {
    if (!db || !userId || !room) {
      console.error("Firebase not initialized. Cannot vote.");
      return;
    }

    setMyVote(vote);
    console.log(`User ${user} voted for: ${vote}`);

    // Update the room document with the user's vote
    const roomRef = doc(db, 'artifacts', userId, 'poker-rooms', room);
    const votes = roomData?.votes || {};
    votes[userId] = { user, vote };

    try {
      await setDoc(roomRef, {
        votes: votes,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('Vote successfully written to Firestore.');
    } catch (error) {
      console.error('Error writing vote to Firestore:', error);
    }
  };

  // Handler for revealing the votes
  const handleReveal = async () => {
    if (!db || !userId || !room) {
      console.error("Firebase not initialized. Cannot reveal.");
      return;
    }

    const roomRef = doc(db, 'artifacts', userId, 'poker-rooms', room);
    try {
      await setDoc(roomRef, {
        isRevealed: true,
        revealedAt: new Date().toISOString()
      }, { merge: true });
      setIsRevealed(true);
      console.log('Votes successfully revealed.');
    } catch (error) {
      console.error('Error revealing votes:', error);
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

  // Render the main room UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans antialiased">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Room: <span className="text-blue-600">{room}</span>
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome, <span className="font-semibold text-gray-800">{user}</span>!
        </p>
        
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Cast Your Vote</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {votingCards.map((card) => (
              <button
                key={card}
                onClick={() => handleVote(card)}
                className={`py-4 px-2 rounded-lg text-xl font-bold transition-transform transform hover:scale-105
                            ${myVote === card ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                {card}
              </button>
            ))}
          </div>
        </div>

        {roomData ? (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Current Votes:</h3>
            <ul className="text-left">
              {Object.entries(roomData.votes || {}).map(([voterId, voteDetails]) => (
                <li key={voterId} className="mb-1 text-sm text-gray-700">
                  <span className="font-semibold">{voteDetails.user}:</span>{' '}
                  <span className="font-mono">{isRevealed ? voteDetails.vote : 'Voted'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <p className="text-sm text-yellow-800">No votes have been cast yet.</p>
          </div>
        )}

        <button
          onClick={handleReveal}
          className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Reveal Votes
        </button>

      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Your user ID for debugging purposes:</p>
        <p className="font-mono break-all">{userId}</p>
      </div>
    </div>
  );
}
