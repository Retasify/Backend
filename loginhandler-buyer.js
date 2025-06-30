import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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
  const auth = getAuth(app);

/**
 * Handles login for buyers.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function loginBuyer(email, password) {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if user email exists in buyer_id collection
    const q = query(collection(db, "buyer_id"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      alert("Login successful and user is a buyer.");
      return { success: true, message: "Login successful and user is a buyer." };
    } else {
      alert("User is not registered as a buyer.");
      return { success: false, message: "User is not registered as a buyer." };
    }
  } catch (error) {
    alert(error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Handles login for buyers.
 * Fetches input values from the DOM, authenticates, and checks buyer_id collection.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function loginBuyerFromInputs() {
  try {
    // Fetch input values from DOM
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Sign in with Firebase Auth
    await signInWithEmailAndPassword(auth, email, password);

    // Check if user email exists in buyer_id collection
    const q = query(collection(db, "buyer_id"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      alert("Login successful and user is a buyer.");
      return { success: true, message: "Login successful and user is a buyer." };
    } else {
      alert("User is not registered as a buyer.");
      return { success: false, message: "User is not registered as a buyer." };
    }
  } catch (error) {
    alert(error.message);
    return { success: false, message: error.message };
  }
}
  


