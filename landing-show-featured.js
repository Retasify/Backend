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
        <div class="bg-[#E7E9DE] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 max-w-sm mx-auto p-3 border border-[#99A57C]" data-aos="fade-up" data-aos-delay="100">
            <div class="relative">
                <img src="${listing.itemImage}" alt="${listing.itemName}" class="w-full h-64 object-cover bg-gray-300 rounded-2xl">
                <div class="absolute top-3 left-3 bg-[#F4B840] rounded-full p-2">
                    <i class="fas fa-heart text-white text-xs px-2"></i>
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-center justify-between mb-1">
                    <h3 class="text-lg font-semibold text-gray-800">${listing.itemName}</h3>
                    <div class="flex items-center gap-1">
                        <span class="text-[#F4B840] text-sm">★</span>
                        <span class="text-sm font-medium text-gray-800">${listing.avgRating}</span>
                        <span class="text-gray-400 text-sm">(${listing.ratingCount})</span>
                    </div>
                </div>
                <p class="text-gray-500 text-sm mb-1">${listing.itemClassification}${listing.itemSize ? `, ${listing.itemSize}` : ""}</p>
                <p class="text-gray-500 text-sm mb-3">${listing.itemLocation}</p>
                <hr class="border-black mb-3 mt-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-lg font-bold text-gray-800">${listing.rentPrice}</p>
                        <p class="text-gray-500 text-xs">/3 days</p>
                    </div>
                    <a href="details.html?listingId=${encodeURIComponent(listing.listingId)}" 
                       class="bg-[#F4B840] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#D1630E] transition-colors">
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