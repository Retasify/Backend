import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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
  measurementId: "G-KWS5QPRSJB",
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

// Check if a user is logged in and display details in console
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // User is signed in
    console.log("User is logged in:");
    console.log("UID:", user.uid);
    console.log("Email:", user.email);
    console.log("Display Name:", user.displayName);

    // Check if user has seller status and update seller hub link
    try {
      const usersCol = collection(db, "users");
      const { query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js");
      const q = query(usersCol, where("uid", "==", user.uid), where("sellerActivated", "==", true));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const sellerHubLink = document.querySelector('a[id="sellerHub"]');
        if (sellerHubLink) {
          sellerHubLink.innerHTML = '<i class="fas fa-store mr-3 text-gray-400"></i>Go to seller hub';
          sellerHubLink.href = 'seller-hub.html';
          console.log('Seller hub link updated for activated seller');
        }
      } else {
        console.log('User is not an activated seller');
      }
    } catch (error) {
      console.error('Error checking seller status:', error);
    }

    // Optimize: Query only the user document with matching uid instead of fetching all users
    let firstName = "";
    try {
      const usersCol = collection(db, "users");
      const { query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js");
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

    // Inject user buttons into the header
    const header = document.querySelector("header .flex.items-center.gap-3");
    if (header) {
      // Remove existing injected buttons if any
      if (header._userBtnsInjected) return;
      header._userBtnsInjected = true;

      // Hide the sign in button if present
      const signInBtn = document.getElementById("signIn");
      if (signInBtn) {
        signInBtn.style.display = "none";
      }

      // Create and append user action buttons with welcome message
      const welcomeMsg = firstName ? `<span class="text-white mr-2">Welcome! ${firstName}</span>` : "";
      const btnsHtml = `
        <button id="notif-clock" class="p-2 text-white hover:text-[#F4B840] transition-colors">
          <i class="fas fa-clock text-lg"></i>
        </button>
        <button id="notif-bag" class="p-2 text-white hover:text-[#F4B840] transition-colors">
          <i class="fas fa-shopping-bag text-lg"></i>
        </button>
        <button id="notif-bell" class="p-2 text-white hover:text-[#F4B840] transition-colors">
          <i class="fas fa-bell text-lg"></i>
        </button>
        <button class="p-2 text-white hover:text-[#F4B840] transition-colors" id="userDropdown">
          <i class="fas fa-user text-lg"></i>
        </button>
        ${welcomeMsg}
      `;
      header.insertAdjacentHTML("afterbegin", btnsHtml);

      // Add dropdown functionality
      const userDropdown = document.getElementById('userDropdown');
      const dropdownMenu = document.getElementById('dropdownMenu');

      if (userDropdown && dropdownMenu) {
        userDropdown.addEventListener('click', function (e) {
          e.stopPropagation();
          // Position the dropdown just below the button
          const rect = userDropdown.getBoundingClientRect();
          dropdownMenu.style.position = 'absolute';
          dropdownMenu.style.top = `${rect.bottom + window.scrollY}px`;
          dropdownMenu.style.left = `${rect.left + window.scrollX}px`;
          dropdownMenu.classList.toggle('hidden');
        });
        // Hide the dropdown when clicking outside
        document.addEventListener('click', function (e) {
          if (!dropdownMenu.classList.contains('hidden')) {
            dropdownMenu.classList.add('hidden');
          }
        });
        // Prevent closing when clicking inside the dropdown
        dropdownMenu.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }

      // Add open-ended redirections for the icons
      const clockBtn = document.getElementById("notif-clock");
      if (clockBtn) {
        clockBtn.addEventListener("click", () => {
          window.location.href = "history.html"; // Change to your desired page
        });
      }
      const bagBtn = document.getElementById("notif-bag");
      if (bagBtn) {
        bagBtn.addEventListener("click", () => {
          window.location.href = "watchlist.html"; // Change to your desired page
        });
      }
      const bellBtn = document.getElementById("notif-bell");
      if (bellBtn) {
        bellBtn.addEventListener("click", () => {
          window.location.href = "notification.html"; // Change to your desired page
        });
      }
    }
  } else {
    // No user is signed in
    console.log("No user is currently logged in.");
    // Optionally show the sign in button again
    const signInBtn = document.getElementById("signIn");
    if (signInBtn) {
      signInBtn.style.display = "";
    }
  }
});