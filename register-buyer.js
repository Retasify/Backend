import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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
 * Checks if password and confirmPassword are the same.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {boolean}
 */
function validatePasswords(password, confirmPassword) {
  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return false;
  }
  return true;
}

/**
 * Registers a new buyer: creates user in Firebase Auth and adds to buyer_id collection.
 * @param {string} email
 * @param {string} password
 * @param {string} confirmPassword
 */
async function registerBuyer(email, password, confirmPassword) {
  if (!validatePasswords(password, confirmPassword)) {
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    await addDoc(collection(db, "buyer_id"), {
      email: email,
      role: "buyer"
    });
    alert("Registration successful!");
    window.location.href = "loginBuyer.html";
  } catch (error) {
    alert("Registration failed: " + error.message);
  }
}

// Attach event listener to the form with id 'registerForm'
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = registerForm.elements['email'].value;
    const password = registerForm.elements['password'].value;
    const confirmPassword = registerForm.elements['confirmPassword'].value;
    await registerBuyer(email, password, confirmPassword);
  });
}