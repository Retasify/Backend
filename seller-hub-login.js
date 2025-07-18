import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBpXpTDyMZ-Xt2bmexmZAVtXs77GCZLt4",
  authDomain: "retasify-main.firebaseapp.com",
  projectId: "retasify-main",
  storageBucket: "retasify-main.firebasestorage.app",
  messagingSenderId: "1035459336602",
  appId: "1:1035459336602:web:c934dd289ecb58d5340223",
  measurementId: "G-KWS5QPRSJB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Auth persistence enabled');
    
    // Monitor auth state continuously
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // User signed out, redirect to login
        console.log('User session ended, redirecting to login');
        window.location.href = "login.html";
        unsubscribe(); // Clean up listener
      } else {
        // User logged in - display details
        console.log('User authenticated:');
        console.log('UID:', user.uid);
        console.log('Email:', user.email);
        
        // Update username span
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) {
          let firstName = "";
          try {
            const usersCol = collection(db, "users");
            const q = query(usersCol, where("uid", "==", user.uid));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const data = querySnapshot.docs[0].data();
              if (data.FirstName) {
                firstName = data.FirstName;
              }
            }
          } catch (err) {
            console.error("Error fetching user FirstName:", err);
          }
          
          if (firstName) {
            userNameSpan.textContent = `Hello, ${firstName}`;
          }
        }
      }
    });
    
    // Clean up on page unload
    window.addEventListener('unload', () => unsubscribe());
  })
  .catch((error) => {
    console.error("Auth persistence error:", error);
    // Fallback to basic auth check
    if (!auth.currentUser) {
      window.location.href = "login.html";
    }
  });