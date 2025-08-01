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

// Utility to render history entries
function renderHistory(entries) {
  // Select the tbody for dynamic injection
  const tbody = document.querySelector("tbody.divide-y.divide-gray-200");
  if (!tbody) return;
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 px-6 text-center text-gray-600">No history found.</td></tr>`;
    return;
  }
  let html = "";
  entries.forEach(entry => {
    // Fallbacks for missing data
    const imgSrc = entry.listingImage ||"./images/Placeholder_img.png";
    const productName = entry.listingTitle || "Untitled";
    const productClass = entry.itemClassification || "";
    const productGender = entry.itemGender || "Unspecified";
    const totalPrice = entry.totalPrice ? `Php ${entry.totalPrice}` : "Php 1,200";
    const startDate = formatDate(entry.startDate);
    const endDate = formatDate(entry.endDate);

    // Check if today is after endDate (Firestore Timestamp or Date)
    let isOverdue = false;
    if (entry.endDate) {
      let endDateObj;
      if (typeof entry.endDate.toDate === "function") {
        endDateObj = entry.endDate.toDate();
      } else if (entry.endDate instanceof Date) {
        endDateObj = entry.endDate;
      } else if (typeof entry.endDate === "number") {
        endDateObj = new Date(entry.endDate);
      }
      if (endDateObj && new Date() > endDateObj) {
        isOverdue = true;
      }
    }

    // Status styling
    let statusText = entry.status || "Completed";
    if (isOverdue && statusText !== "Completed") statusText = "Overdue";
    let statusClass = "bg-green-100 text-green-800";
    if (statusText === "Processing") statusClass = "bg-yellow-100 text-yellow-800";
    if (statusText === "In Progress") statusClass = "bg-blue-100 text-blue-800";
    if (statusText === "Overdue") statusClass = "bg-red-100 text-red-800";
    // Actions
    let actionsHtml = "";
    if (statusText === "Completed") {
      actionsHtml = `
        <button class="bg-[#F4B840] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-500 transition-colors">
          Re-rent
        </button>
        <button class="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
          Review
        </button>
      `;
    } else if (statusText === "In Progress") {
      actionsHtml = `
        <button class="bg-[#48583B] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors">
          Extend
        </button>
        <button class="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
          Return
        </button>
      `;
    } else if (statusText === "Processing") {
      actionsHtml = `
        <button class="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors" disabled>
          Processing
        </button>
      `;
    } else if (statusText === "Overdue") {
      actionsHtml = `
        <button class="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-600 transition-colors">
          Contact Seller
        </button>
        <button class="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
          Support
        </button>
      `;
    }
    html += `
      <tr class="hover:bg-gray-50">
        <td class="py-6 px-6">
          <div class="flex items-center gap-4">
            <img src="${imgSrc}" alt="${productName}" class="w-16 h-16 object-cover rounded-lg bg-gray-300">
            <div>
              <h3 class="font-semibold text-gray-800">${productName}</h3>
              <div class="flex items-center gap-2">
                
                
              </div>
            </div>
          </div>
        </td>
        <td class="py-6 px-6 text-gray-600">${startDate}</td>
        <td class="py-6 px-6 text-gray-600">${endDate}</td>
        <td class="py-6 px-6 font-semibold text-gray-800">${totalPrice}</td>
        <td class="py-6 px-6">
          <span class="${statusClass} px-3 py-1 rounded-full text-sm font-medium">${statusText}</span>
        </td>
        <td class="py-6 px-6">
          <div class="flex gap-2">
            ${actionsHtml}
          </div>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// Format Firestore Timestamp to date string
function formatDate(ts) {
  if (!ts) return "";
  // Firestore Timestamp object: { seconds, nanoseconds }
  if (typeof ts.toDate === "function") {
    return ts.toDate().toLocaleDateString();
  }
  // If it's a JS Date
  if (ts instanceof Date) {
    return ts.toLocaleDateString();
  }
  // If it's a plain number (milliseconds)
  if (typeof ts === "number") {
    return new Date(ts).toLocaleDateString();
  }
  return "";
}

// Fetch and display user's history
async function showUserHistory() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      renderHistory([]);
      return;
    }
    // Query all user documents to find the one with matching uid
    const usersCol = collection(db, "users");
    const usersSnap = await getDocs(usersCol);
    let userDocId = null;
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.uid === user.uid) {
        userDocId = docSnap.id;
      }
    });

    if (!userDocId) {
      renderHistory([]);
      return;
    }

    // Query the rentals subcollection of the found user document
    const rentalsCol = collection(db, "users", userDocId, "rentals");
    const rentalsSnap = await getDocs(rentalsCol);
    const entries = [];
    rentalsSnap.forEach(doc => {
      entries.push(doc.data());
    });
    renderHistory(entries);
  });
}

// Run on DOMContentLoaded
window.addEventListener("DOMContentLoaded", showUserHistory);