import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, getDocs, collection, query, where, addDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCBpXpTDyMZ-Xt2bmexmZAVtXs77GCZLt4",
    authDomain: "retasify-main.firebaseapp.com",
    projectId: "retasify-main",
    storageBucket: "retasify-main.firebasestorage.app",
    messagingSenderId: "1035459336602",
    appId: "1:1035459336602:web:c934dd289ecb58d5340223",
    measurementId: "G-KWS5QPRSJB"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);
  const auth = getAuth();

  // Initialize watchlist button when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    initWatchlistButton();
  });

  // Function to get the listing ID from the URL
  function getListingIdFromUrl() {
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('listingId'); // Changed from 'id' to 'listingId' to match the URL parameter
    console.log('Extracted ID:', id);
    return id;
  }

  // Function to get listing details from Firestore
  async function getListingDetails(listingId) {
    try {
      const listingDoc = await getDoc(doc(db, 'listings', listingId));
      if (listingDoc.exists()) {
        return { id: listingDoc.id, ...listingDoc.data() };
      } else {
        console.log('No such listing found!');
        return null;
      }
    } catch (error) {
      console.error('Error getting listing details:', error);
      return null;
    }
  }

  // Function to add listing to user's watchlist
  async function addToWatchlist(userDoc, listingData) {
    try {
      // Use the user's document ID from getUserDocument
      const watchlistRef = collection(db, 'users', userDoc.id, 'watchlist');
      
      // Check if already in watchlist
      const q = query(watchlistRef, where('id', '==', listingData.id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert('This item is already in your watchlist!');
        return false;
      }
      
      // Add to watchlist
      await addDoc(watchlistRef, {
        ...listingData,
        addedAt: new Date().toISOString(),
        listingId: listingData.id // Store the listing ID for easier reference
      });
      
      alert('Item added to watchlist!');
      return true;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      alert('Failed to add to watchlist. Please try again.');
      return false;
    }
  }

  // Function to initialize watchlist button
  function initWatchlistButton() {
    const watchlistBtn = document.getElementById('watchlistBtn');
    if (!watchlistBtn) return;

    watchlistBtn.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) {
        alert('Please sign in to add items to your watchlist');
        return;
      }

      const listingId = getListingIdFromUrl();
      if (!listingId) {
        console.error('No listing ID found in URL');
        return;
      }

      const listingData = await getListingDetails(listingId);
      if (!listingData) {
        console.error('Failed to get listing details');
        return;
      }

      const userDoc = await getUserDocument();
      if (!userDoc) {
        console.error('Failed to get user document');
        return;
      }

      await addToWatchlist(userDoc, listingData);
    });
  }

  // Function to get the current user's document from Firestore
  async function getUserDocument() {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user is signed in');
        return null;
      }
      
      const userRef = collection(db, 'users');
      const q = query(userRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Return the document ID and data
        const userDoc = querySnapshot.docs[0];
        console.log('User document found with ID:', userDoc.id);
        return { 
          id: userDoc.id, 
          uid: user.uid,
          ...userDoc.data() 
        };
      } else {
        console.log('No user document found');
        return null;
      }
    } catch (error) {
      console.error('Error getting user document:', error);
      return null;
    }
  }


  