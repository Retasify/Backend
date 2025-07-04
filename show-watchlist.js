import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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


onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    try {
      // Query the users collection for a document with this uid
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      let userDocRef = null;
      usersSnapshot.forEach((docSnap) => {
        if (docSnap.data().uid === uid) {
          userDocRef = docSnap.ref;
        }
      });

      if (userDocRef) {
        // Found the user document, now get the watchlist subcollection
        const watchlistCollection = collection(userDocRef, "watchlist");
        const watchlistSnapshot = await getDocs(watchlistCollection);
        const watchlistItems = [];
        watchlistSnapshot.forEach((watchDoc) => {
          watchlistItems.push({ id: watchDoc.id, ...watchDoc.data() });
        });

        // Inject watchlist items into the UI
        const watchlistDiv = document.getElementById("watchlistItems");
        if (watchlistDiv) {
          if (watchlistItems.length === 0) {
            watchlistDiv.innerHTML = '<div class="p-6 text-gray-500">No items in your watchlist.</div>';
          } else {
            watchlistDiv.innerHTML = watchlistItems.map(item => `
              <div class="grid grid-cols-12 gap-4 p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div class="col-span-6 flex items-center gap-4">
                  <div class="w-20 h-20 bg-gray-300 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center">
                    ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.itemName || 'Item'}" class="w-full h-full object-cover rounded-2xl" />` : `<svg width="48" height="48" fill="none" viewBox="0 0 24 24" class="text-gray-400"><rect width="100%" height="100%" rx="12" fill="#e5e7eb"></rect><path d="M8 16l3-3 2 2 3-4 4 5v2H4v-2l4-5z" fill="#cbd5e1"/></svg>`}
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">${item.itemName || 'No Title'}</h3>
                    <p class="text-gray-600 text-sm">${item.itemClassification ? `${item.itemClassification}  |  ` : ''}${item.itemSize}</p>
                  </div>
                </div>
                <div class="col-span-2 flex items-center justify-center">
                  <span class="font-medium text-gray-800">Php ${item.rentPrice ? item.rentPrice.toLocaleString() : ''}</span>
                </div>
                <div class="col-span-2 flex items-center justify-center">
                  <span class="font-medium text-gray-800">${item.status || 'Still Available'}</span>
                </div>
                <div class="col-span-2 flex items-center justify-center">
                  <button class="bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-red-200 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            `).join("");
          }
        }
      } else {
        console.log("No user document found for UID:", uid);
      }
    } catch (error) {
      console.error("Error fetching watchlist:", error);
    }
  } else {
    console.log("No user is logged in.");
  }
});

