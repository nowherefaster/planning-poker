// This component displays the poker room and handles all real-time logic
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Import Firebase and Firestore modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';

// Global variables for Firebase instances
let app, auth, db;
let userId;
let firebaseInitialized = false;

const PokerRoom = () => {
  const router = useRouter();
  // Get the room ID and user name from the URL
  const { roomid, user } = router.query;

  // Local state for the room's data
  const [roomData, setRoomData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState(null);

  // This effect handles Firebase initialization and user authentication
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

        // Sign in the user anonymously if they are not already signed in
        if (!auth.currentUser) {
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
    // Only initialize if we have a roomid
    if (roomid) {
      initializeFirebase();
    }
  }, [roomid]);

  // This effect handles the real-time subscription to the room data
  useEffect(() => {
    // Only proceed if Firebase is initialized and we have a roomid
    if (db && roomid && userId) {
      console.log('Setting up real-time listener for room:', roomid);
      
      // Get the document reference for the specific room
      // The path is /artifacts/{appId}/poker-rooms/{roomId}
      // Note: We're using a single user's uid to scope the rooms, as defined in the PRD.
      const roomRef = doc(db, 'artifacts', userId, 'poker-rooms', roomid);

      // Listen for real-time updates to the room document
      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoomData(data);
          // Update the list of users based on the real-time data
          if (data.users) {
            setUsers(Object.values(data.users));
          }
          console.log('Room data updated:', data);
        } else {
          console.log('No such room document!');
          // Handle case where room doesn't exist, e.g., redirect user
          router.push('/');
        }
      });

      // Update the user's presence in the room document
      const userRef = doc(db, 'artifacts', userId, 'poker-rooms', roomid);
      const userPresence = {
        name: decodeURIComponent(user),
        uid: userId,
        vote: null,
      };

      // Add or update the user in the 'users' map
      updateDoc(userRef, {
        [`users.${userId}`]: userPresence,
      }).catch(error => {
        console.error("Error updating user presence:", error);
      });

      // Return a cleanup function to detach the listener
      return () => unsubscribe();
    }
  }, [db, roomid, user, userId, router]);

  // Handle the vote action
  const handleVote = async (voteValue) => {
    if (!db) {
      alert('Firebase not initialized. Please wait.');
      return;
    }

    try {
      const roomRef = doc(db, 'artifacts', userId, 'poker-rooms', roomid);
      
      // Update the user's vote in the Firestore document
      await updateDoc(roomRef, {
        [`users.${userId}.vote`]: voteValue,
      });

      setMyVote(voteValue);
      console.log(`Vote cast: ${voteValue}`);
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Failed to cast vote. Please try again.');
    }
  };

  // Render a loading state or the main content based on state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Loading room...</p>
      </div>
    );
  }

  // Define a simple voting deck
  const voteOptions = ['0', '1', '2', '3', '5', '8', '13', '☕', '?'];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <Head>
        <title>Poker Room: {roomid}</title>
      </Head>

      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          Poker Room: <span className="font-mono bg-gray-200 px-2 rounded-md">{roomid}</span>
        </h1>
        <p className="text-gray-600 mb-6">Welcome, <span className="font-semibold">{decodeURIComponent(user)}</span>!</p>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Users in Room</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {users.map((member) => (
              <div 
                key={member.uid} 
                className="bg-gray-100 p-4 rounded-lg shadow-sm w-32"
              >
                <p className="font-medium text-gray-800 break-words">{member.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {member.vote ? 'Voted' : 'Not Voted'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Cast Your Vote</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {voteOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleVote(option)}
                className={`flex items-center justify-center w-20 h-28 rounded-xl shadow-md transition-all duration-200 ease-in-out font-bold text-2xl
                  ${myVote === option 
                    ? 'bg-blue-600 text-white transform scale-110 ring-2 ring-blue-500' 
                    : 'bg-white text-blue-600 hover:bg-gray-100 hover:scale-105'
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-8">
          <button
            onClick={() => { /* Implement reveal logic here */ alert("Reveal Votes!"); }}
            className="w-full bg-slalom-blue-light hover:bg-slalom-blue-dark text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Reveal Votes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PokerRoom;
