import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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

// Utility to get query param
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Populate listing details
async function populateListingDetails() {
  const listingId = getQueryParam("listingId");
  if (!listingId) return;

  const docRef = doc(db, "listings", listingId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return;
  const data = docSnap.data();

  // Set main image (first in array or fallback)
  const mainImageElem = document.getElementById("mainImage");
  if (mainImageElem) {
    let imgSrc = Array.isArray(data.itemImage) && data.itemImage.length > 0
      ? data.itemImage[0]
      : "./images/Placeholder_img.png";
    mainImageElem.src = imgSrc;
  }

  // Inject thumbnails (index 0 to 3) into thumbnailContainer
  const thumbnailContainer = document.getElementById("thumbnailContainer");
  if (thumbnailContainer && Array.isArray(data.itemImage)) {
    thumbnailContainer.innerHTML = ""; // Clear previous thumbnails
    data.itemImage.slice(0, 4).forEach((img, idx) => {
      const thumb = document.createElement("img");
      thumb.src = img || "./images/Placeholder_img.png";
      thumb.alt = `Thumbnail ${idx + 1}`;
      thumb.className = "thumbnail-img"; // Add your CSS class if needed
      thumb.style.width = "160px";
      thumb.style.height = "160px";
      thumb.style.objectFit = "cover";
      thumb.style.borderRadius = "14px";
      thumb.style.marginRight = "14px";
      // Optional: clicking thumbnail sets main image
      thumb.addEventListener("click", () => {
        if (mainImageElem) mainImageElem.src = thumb.src;
      });
      thumbnailContainer.appendChild(thumb);
    });
  }

  // Set text fields
  if (document.getElementById("listingTitle"))
    document.getElementById("listingTitle").textContent = data.itemName || "";
  if (document.getElementById("listingTeaser"))
    document.getElementById("listingTeaser").textContent = data.itemTeaser || "";
  if (document.getElementById("listingDesc"))
    document.getElementById("listingDesc").textContent = data.itemDescription || "";
  if (document.getElementById("sellerName"))
    document.getElementById("sellerName").textContent = data.sellerName || "";
  if (document.getElementById("sellerLoc"))
    document.getElementById("sellerLoc").textContent = data.sellerLocation || "";
  if (document.getElementById("itemClass"))
    document.getElementById("itemClass").textContent = data.itemClassification || "";
  if (document.getElementById("itemSize"))
    document.getElementById("itemSize").textContent = data.itemSize || "";
  if (document.getElementById("pickupArea"))
    document.getElementById("pickupArea").textContent = data.pickupArea || "";
  if (document.getElementById("finalPrice"))
    document.getElementById("finalPrice").textContent = data.rentPrice ? `Php ${data.rentPrice}` : "";
}

// Run on DOMContentLoaded
window.addEventListener("DOMContentLoaded", populateListingDetails);

// Separate event listener for watchlistBtn
const watchlistBtn = document.getElementById("watchlistBtn");
if (watchlistBtn) {
  watchlistBtn.addEventListener("click", function () {
    // Placeholder: add your watchlist logic here
    alert("Added to watchlist!");
  });
}