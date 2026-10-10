// This component displays the poker room and handles all real-time logic
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Import Firebase and Firestore modules
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';

const PokerRoom = () => {
  const router = useRouter();
  // Get the room ID and user name from the URL
  const { roomid, user } = router.query;

  // Local state for the room's data
  const [roomData, setRoomData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState(null);
  const [currentUid, setCurrentUid] = useState(null);
  const [firestoreDb, setFirestoreDb] = useState(null);

  // This effect handles Firebase initialization and user authentication
  useEffect(() => {
    let unsubscribe;
    async function initializeFirebase() {
      try {
        console.log('Initializing Firebase...');
        const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);

        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        setFirestoreDb(db);

        // Sign in the user anonymously if they are not already signed in
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        // Set up an auth state listener to get the user ID
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

    // Only initialize if we have a roomid
    if (roomid) {
      initializeFirebase();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomid]);

  // This effect handles the real-time subscription to the room data
  useEffect(() => {
    // Only proceed if Firebase is initialized and we have a roomid
    if (firestoreDb && roomid && currentUid) {
      console.log('Setting up real-time listener for room:', roomid);
      
      // Get the document reference for the specific room in the shared collection
      const roomRef = doc(firestoreDb, 'poker-rooms', roomid);

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
      const userRef = doc(firestoreDb, 'poker-rooms', roomid);
      const userPresence = {
        name: decodeURIComponent(user || 'Anonymous'),
        uid: currentUid,
        vote: null,
      };

      // Add or update the user in the 'users' map
      updateDoc(userRef, {
        [`users.${currentUid}`]: userPresence,
      }).catch(error => {
        console.error("Error updating user presence:", error);
      });

      // Return a cleanup function to detach the listener
      return () => unsubscribe();
    }
  }, [firestoreDb, roomid, user, currentUid, router]);

  // Sync local myVote with roomData for the current user (e.g. after a reset)
  useEffect(() => {
    if (roomData?.users && currentUid) {
      const userVote = roomData.users[currentUid]?.vote ?? null;
      setMyVote(userVote);
    }
  }, [roomData, currentUid]);

  // Auto-Reveal check: when there are users, none are unvoted, and not already revealed
  useEffect(() => {
    if (!firestoreDb || !roomid || !roomData) return;

    const isRevealed = !!roomData.revealed;
    const userList = roomData.users ? Object.values(roomData.users) : [];

    // Need at least 1 user, room not revealed yet, and all users have voted
    if (!isRevealed && userList.length > 0) {
      const allHaveVoted = userList.every(u => u.vote !== null && u.vote !== undefined);
      if (allHaveVoted) {
        console.log('All users have voted. Triggering auto-reveal...');
        const roomRef = doc(firestoreDb, 'poker-rooms', roomid);
        updateDoc(roomRef, { revealed: true }).catch(err => {
          console.error('Error auto-revealing votes:', err);
        });
      }
    }
  }, [roomData, firestoreDb, roomid]);

  // Handle the vote action
  const handleVote = async (voteValue) => {
    if (!firestoreDb || !currentUid) {
      alert('Firebase not initialized. Please wait.');
      return;
    }

    if (roomData?.revealed) {
      alert('Votes are already revealed. Start a new round to vote again!');
      return;
    }

    try {
      const roomRef = doc(firestoreDb, 'poker-rooms', roomid);
      
      // Update the user's vote in the Firestore document
      await updateDoc(roomRef, {
        [`users.${currentUid}.vote`]: voteValue,
      });

      setMyVote(voteValue);
      console.log(`Vote cast: ${voteValue}`);
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Failed to cast vote. Please try again.');
    }
  };

  // Reveal votes manually
  const handleReveal = async () => {
    if (!firestoreDb || !roomid) return;
    try {
      const roomRef = doc(firestoreDb, 'poker-rooms', roomid);
      await updateDoc(roomRef, { revealed: true });
    } catch (error) {
      console.error('Error revealing votes:', error);
      alert('Failed to reveal votes. Please try again.');
    }
  };

  // Reset round: clears all users' votes and sets revealed to false
  const handleResetRound = async () => {
    if (!firestoreDb || !roomid || !roomData) return;
    try {
      const roomRef = doc(firestoreDb, 'poker-rooms', roomid);
      const updates = { revealed: false };

      if (roomData.users) {
        Object.keys(roomData.users).forEach((uid) => {
          updates[`users.${uid}.vote`] = null;
        });
      }

      await updateDoc(roomRef, updates);
      setMyVote(null);
      console.log('Round reset successfully.');
    } catch (error) {
      console.error('Error resetting round:', error);
      alert('Failed to reset round. Please try again.');
    }
  };

  // Multi-Deck options definition
  const DECKS = {
    'fibonacci': {
      name: 'Fibonacci (Story Points)',
      unit: 'pts',
      cards: ['0', '1', '2', '3', '5', '8', '13', '21', '40', '100', '☕', '?']
    },
    'time-days': {
      name: 'Time (Days)',
      unit: 'days',
      cards: ['0.5', '1', '2', '3', '5', '8', '13', '20', '☕', '?']
    },
    't-shirt': {
      name: 'T-Shirt Sizes',
      unit: '',
      cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '☕', '?']
    }
  };

  const currentDeckType = roomData?.estimationType || 'fibonacci';
  const activeDeck = DECKS[currentDeckType] || DECKS['fibonacci'];
  const voteOptions = activeDeck.cards;

  // Change deck type (switches estimationType for the room and resets round)
  const handleDeckChange = async (newType) => {
    if (!firestoreDb || !roomid || !roomData) return;
    if (newType === currentDeckType) return;

    try {
      const roomRef = doc(firestoreDb, 'poker-rooms', roomid);
      const updates = { 
        estimationType: newType,
        revealed: false 
      };

      // Reset votes when changing deck
      if (roomData.users) {
        Object.keys(roomData.users).forEach((uid) => {
          updates[`users.${uid}.vote`] = null;
        });
      }

      await updateDoc(roomRef, updates);
      setMyVote(null);
    } catch (error) {
      console.error('Error changing estimation deck:', error);
      alert('Failed to change deck type. Please try again.');
    }
  };

  // Calculate results statistics when revealed
  const isRevealed = !!roomData?.revealed;
  const numericVotes = users
    .map(u => parseFloat(u.vote))
    .filter(val => !isNaN(val));

  const averageVote = numericVotes.length > 0
    ? (numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length).toFixed(1)
    : null;

  // Count distribution of votes
  const voteCounts = users.reduce((acc, u) => {
    if (u.vote !== null && u.vote !== undefined) {
      acc[u.vote] = (acc[u.vote] || 0) + 1;
    }
    return acc;
  }, {});

  // Check consensus (all voted users have the exact same vote)
  const castVotes = users.map(u => u.vote).filter(v => v !== null && v !== undefined);
  const hasConsensus = castVotes.length > 1 && castVotes.every(v => v === castVotes[0]);

  // Render a loading state or the main content based on state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Loading room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <Head>
        <title>Poker Room: {roomid}</title>
      </Head>

      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl text-center">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-gray-200 mb-6 gap-2">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-gray-800">
              Poker Room: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-blue-600">{roomid}</span>
            </h1>
            <p className="text-sm text-gray-500">Welcome, <span className="font-semibold text-gray-700">{decodeURIComponent(user || '')}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isRevealed ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
            }`}>
              {isRevealed ? 'Votes Revealed' : 'Voting in Progress'}
            </span>
          </div>
        </div>

        {/* Deck Selector Tabs */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Estimation Deck:
          </span>
          <div className="flex flex-wrap gap-1">
            {Object.entries(DECKS).map(([typeKey, deckInfo]) => (
              <button
                key={typeKey}
                onClick={() => handleDeckChange(typeKey)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  currentDeckType === typeKey
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {deckInfo.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results Banner when Revealed */}
        {isRevealed && (
          <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-left">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">Round Results</h2>
              {hasConsensus && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-bounce">
                  🎉 Consensus Reached!
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <span className="text-xs text-gray-500 block">Average Estimate</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  {averageVote !== null ? `${averageVote} ${activeDeck.unit}`.trim() : '—'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <span className="text-xs text-gray-500 block">Total Votes</span>
                <span className="text-2xl font-extrabold text-gray-800">
                  {castVotes.length} / {users.length}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">Vote Breakdown</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(voteCounts).map(([card, count]) => (
                    <span key={card} className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                      <span className="font-bold text-blue-600 mr-1">{card}</span> × {count}
                    </span>
                  ))}
                  {Object.keys(voteCounts).length === 0 && <span className="text-xs text-gray-400">None</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participants & Live Votes */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Participants ({users.length})</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {users.map((member) => {
              const hasVoted = member.vote !== null && member.vote !== undefined;
              return (
                <div 
                  key={member.uid} 
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border w-32 transition-all ${
                    isRevealed
                      ? 'bg-white border-blue-200 shadow-md'
                      : hasVoted
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : 'bg-gray-50 border-gray-200 opacity-80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm mb-2">
                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <p className="font-medium text-gray-800 text-sm truncate max-w-full mb-1" title={member.name}>
                    {member.name}
                  </p>

                  {/* Revealed Card or Voting Status */}
                  {isRevealed ? (
                    <div className="mt-2 w-12 h-16 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow">
                      {member.vote !== null && member.vote !== undefined ? member.vote : '—'}
                    </div>
                  ) : (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                      hasVoted ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {hasVoted ? '✓ Ready' : 'Thinking...'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Voting Deck (hidden or disabled when revealed) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Cast Your Vote</h2>
            {myVote !== null && !isRevealed && (
              <span className="text-xs text-blue-600 font-medium">
                Your selection: <span className="font-bold text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{myVote}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {voteOptions.map((option) => (
              <button
                key={option}
                disabled={isRevealed}
                onClick={() => handleVote(option)}
                className={`flex items-center justify-center w-16 h-24 sm:w-20 sm:h-28 rounded-xl shadow-md transition-all duration-150 font-bold text-xl sm:text-2xl
                  ${isRevealed 
                    ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400'
                    : myVote === option 
                    ? 'bg-blue-600 text-white ring-4 ring-blue-300 scale-105' 
                    : 'bg-white text-blue-600 border border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:scale-105'
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        
        {/* Action Controls: Reveal & Reset Round */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          {!isRevealed ? (
            <button
              onClick={handleReveal}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm"
            >
              Reveal Votes
            </button>
          ) : (
            <button
              onClick={handleResetRound}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>🔄</span> Start New Round
            </button>
          )}

          {/* Quick reset option if users want to clear votes mid-round */}
          {!isRevealed && (
            <button
              onClick={handleResetRound}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-5 rounded-lg transition-colors"
            >
              Reset Votes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PokerRoom;
