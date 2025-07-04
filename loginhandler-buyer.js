import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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
  const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  // Handle Errors here.
  console.error("Auth persistence error:", error);
});

/**
 * Handles login for buyers.
 * Fetches input values from the LoginForm, authenticates, checks buyer_id collection,
 * redirects to buyer-login.html on success, alerts on error.
 */
async function loginBuyerFromForm(email, password) {
  try {
    // Sign in with Firebase Auth
    await signInWithEmailAndPassword(auth, email, password);

    // Check if user email exists in buyer_id collection
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      window.location.href = "index.html";
    } else {
      alert("User is not registered as a buyer.");
    }
  } catch (error) {
    alert(error.message);
  }
}

// Add event listener to trigger login on form submit
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('LoginForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = form.querySelector('input[type="email"], input[name="email"], #email')?.value;
      const password = form.querySelector('input[type="password"], input[name="password"], #password')?.value;
      loginBuyerFromForm(email, password);
    });
  }
});





