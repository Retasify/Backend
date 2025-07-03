import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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

// Function to display all listings in #productGrid
async function displayListings() {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;

    const listingsCol = collection(db, "listings");
    const listingsSnapshot = await getDocs(listingsCol);
    let html = "";

    // Use Promise.all to fetch reviews for all listings in parallel
    const listingsWithReviews = await Promise.all(
        listingsSnapshot.docs.map(async doc => {
            const data = doc.data();
            // Fallbacks for missing data
            const itemName = data.itemName || "Untitled";
            const itemLocation = data.itemLocation || "";
            // Use first image if itemImage is an array, else fallback
            const itemImage = Array.isArray(data.itemImage) && data.itemImage.length > 0
                ? data.itemImage[0]
                : "./images/Placeholder_img.png";
            const itemSize = data.itemSize || "";
            const itemClassification = data.itemClassification || "";
            const rentPrice = data.rentPrice ? `Php ${data.rentPrice}` : "Php 1,200";
            const itemGender = data.itemGender || "Unspecified";
            const listingId = doc.id;
            

            // Query reviews subcollection inside each listing document
            const reviewsCol = collection(db, "listings", doc.id, "reviews");
            const reviewsSnapshot = await getDocs(reviewsCol);
            let totalRating = 0;
            let reviewCount = 0;
            reviewsSnapshot.forEach(reviewDoc => {
                const reviewData = reviewDoc.data();
                if (typeof reviewData.reviewRating === "number") {
                    totalRating += reviewData.reviewRating;
                    reviewCount++;
                }
            });
            const avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : "4.9";
            const ratingCount = reviewCount > 0 ? reviewCount : "0";

            return {
                itemName,
                itemLocation,
                itemImage,
                itemSize,
                itemClassification,
                rentPrice,
                avgRating,
                ratingCount,
                itemGender,
                listingId
            };
        })
    );

    listingsWithReviews.forEach(listing => {
        html += `
        <div class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-3" style="border-radius: 18px;">
            <div class="relative">
                <img src="${listing.itemImage}" alt="${listing.itemName}" class="w-full h-64 object-cover bg-gray-300 rounded-2xl" style="border-radius: 16px;">
                <div class="absolute top-3 left-3 bg-white rounded-full p-2 shadow-md flex items-center justify-center" style="top: 16px; left: 16px;">
                    <i class="far fa-heart text-gray-400 text-xl px-2"></i>
                </div>
            </div>
            <div class="p-4 pb-2">
                <div class="flex items-center justify-between mb-1">
                    <h3 class="text-lg font-semibold text-gray-800" style="font-size: 1.15rem;">${listing.itemName}</h3>
                    <div class="flex items-center gap-1">
                        <span class="text-[#F4B840] text-base" style="color: #F4B840; font-size: 1.1rem;">★</span>
                        <span class="text-base font-medium text-gray-800" style="font-size: 1.05rem;">${listing.avgRating}</span>
                        <span class="text-gray-400 text-base" style="font-size: 1.05rem;">(${listing.ratingCount})</span>
                    </div>
                </div>
                <p class="text-gray-500 text-base mb-0" style="font-size: 1rem;">${listing.itemClassification}${listing.itemSize ? `, ${listing.itemSize}` : ""}</p>
                <p class="text-gray-500 text-base mb-0" style="font-size: 1rem;">${listing.itemLocation}</p>
                <hr class="border-gray-300 my-3" style="margin-top: 14px; margin-bottom: 14px;">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-lg font-bold text-gray-800" style="font-size: 1.15rem;">${listing.rentPrice}</p>
                        <p class="text-gray-500 text-xs" style="font-size: 0.95rem;">/day</p>
                    </div>
                    <a href="details.html?listingId=${encodeURIComponent(listing.listingId)}"style="display:inline-block; width:auto;"
                        class="bg-[#F4B840] text-white px-6 py-2 rounded-full text-base font-medium hover:bg-orange-500 transition-colors"sition-colors"
                        style="background: #F4B840; border-radius: 9999px; font-size: 1.05rem; padding-left: 1.5rem; padding-right: 1.5rem; text-align:center; text-decoration:none; display:inline-block;">
                        Rent Now
                    </a>
                </div>
            </div>
        </div>
        `;
    });

    productGrid.innerHTML = html;
}

// Call the function on page load
window.addEventListener('DOMContentLoaded', displayListings);