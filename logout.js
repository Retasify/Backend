import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, getDocs, collection, query, where, addDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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

  // Function to handle user logout
  function setupLogout() {
    const logoutButton = document.getElementById('logoutButton');
    
    if (logoutButton) {
      logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          await signOut(auth);
          console.log('User signed out successfully');
          // Reload the page to update the UI
          window.location.reload();
        } catch (error) {
          console.error('Error signing out:', error);
          alert('Failed to sign out. Please try again.');
        }
      });
    }
  }

  // Initialize the logout functionality when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', setupLogout);

  // Also handle logout when clicked from dropdown menu
  document.addEventListener('click', (e) => {
    if (e.target.closest('#logoutButton')) {
      e.preventDefault();
      setupLogout();
    }
  });
  