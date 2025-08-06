import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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

// Pagination variables
let currentPage = 1;
const itemsPerPage = 9;
let allListingsCache = [];
let totalListings = 0;

// Function to display all listings in #productGrid
async function displayListings(page = 1) {
    // Ensure page is a number
    if (typeof page !== 'number') {
        page = 1;
    }
    
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) {
        console.error("");
        return;
    }

    // If we don't have cached listings, fetch them
    if (allListingsCache.length === 0) {
        await fetchAllListings();
    }

    currentPage = page;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageListings = allListingsCache.slice(startIndex, endIndex);

    let html = "";

    currentPageListings.forEach(listing => {
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
                    <a href="details.html?listingId=${encodeURIComponent(listing.listingId)}" style="display:inline-block; width:auto;"
                        class="bg-[#F4B840] text-white px-6 py-2 rounded-full text-base font-medium hover:bg-orange-500 transition-colors"
                        style="background: #F4B840; border-radius: 9999px; font-size: 1.05rem; padding-left: 1.5rem; padding-right: 1.5rem; text-align:center; text-decoration:none; display:inline-block;">
                        Rent Now
                    </a>
                </div>
            </div>
        </div>
        `;
    });

    productGrid.innerHTML = html;
    
    // Only update pagination UI if we have listings
    if (allListingsCache.length > 0) {
        updateResultsHeader();
        updatePagination();
    }
}

// Function to fetch all listings and cache them
async function fetchAllListings() {
    
    // Get all users with listings subcollections
    const usersCol = collection(db, "users");
    const usersSnapshot = await getDocs(usersCol);

    // Initialize empty array to store all listings
    let allListings = [];

    // For each user, get their listings
    for (const userDoc of usersSnapshot.docs) {
        try {
            const listingsRef = collection(db, "users", userDoc.id, "listings");
            const listingsSnapshot = await getDocs(listingsRef);
            
            // Add listings to our array
            listingsSnapshot.forEach(listingDoc => {
                const listingData = listingDoc.data();
                // Add user ID to listing data for reference
                listingData.userId = userDoc.id;
                allListings.push({
                    id: listingDoc.id,
                    ...listingData
                });
            });
        } catch (error) {
            console.error(`Error fetching listings for user`, error);
        }
    }


    // Use Promise.all to fetch reviews for all listings in parallel
    const listingsWithReviews = await Promise.all(
        allListings.map(async listing => {
            // Fallbacks for missing data
            const itemName = listing.title || "Untitled";
            const itemLocation = listing.landmark || "";
            // Use first image from images array if available, fallback to placeholder
            const itemImage = Array.isArray(listing.images) && listing.images.length > 0
                ? listing.images[0]
                : "./images/Placeholder_img.png";
            const itemSize = listing.size || "";
            const itemClassification = listing.category || "";
            const rentPrice = listing.price ? `Php ${listing.price}` : "Php 1,200";
            
            const listingId = listing.id;
            
            // Query reviews subcollection inside each listing document
            // Note: We need to use the userId from the listing data to find the correct reviews collection
            const reviewsCol = collection(db, "users", listing.userId, "listings", listingId, "reviews");
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
            const avgRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : "0";
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
                listingId
            };
        })
    );

    allListingsCache = listingsWithReviews;
    totalListings = listingsWithReviews.length;
}

// Function to update the results header
function updateResultsHeader() {
    const resultsHeader = document.querySelector('.text-gray-600.mb-4');
    if (resultsHeader) {
        if (totalListings === 0) {
            resultsHeader.textContent = `Showing 0 results`;
        } else {
            const startItem = (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, totalListings);
            resultsHeader.textContent = `Showing ${startItem}-${endItem} of ${totalListings} results`;
        }
    }
}

// Function to update pagination
function updatePagination() {
    const totalPages = Math.ceil(totalListings / itemsPerPage);
    const paginationContainer = document.querySelector('nav.flex.items-center.gap-2');
    
    if (!paginationContainer) {
        console.error("Pagination container not found!");
        return;
    }
    
    // Always show pagination (removed the totalPages <= 1 check)
    // if (totalPages <= 1) {
    //     console.log("Only 1 page, hiding pagination");
    //     paginationContainer.innerHTML = '';
    //     return;
    // }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="p-2 text-gray-400 hover:text-[#F4B840] pagination-btn" 
                data-page="${currentPage - 1}" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Show first page and ellipsis if needed
    if (startPage > 1) {
        paginationHTML += `
            <button class="w-10 h-10 text-gray-600 hover:bg-[#F4B840] hover:text-white rounded-full transition-colors pagination-btn" 
                    data-page="1">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
    }

    // Show page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <button class="w-10 h-10 ${isActive ? 'bg-[#F4B840] text-white' : 'text-gray-600 hover:bg-[#F4B840] hover:text-white'} rounded-full font-medium transition-colors pagination-btn" 
                    data-page="${i}">${i}</button>
        `;
    }

    // Show ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
        paginationHTML += `
            <button class="w-10 h-10 text-gray-600 hover:bg-[#F4B840] hover:text-white rounded-full transition-colors pagination-btn" 
                    data-page="${totalPages}">${totalPages}</button>
        `;
    }

    // Next button
    paginationHTML += `
        <button class="p-2 text-gray-600 hover:text-[#F4B840] pagination-btn" 
                data-page="${currentPage + 1}" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages && !btn.disabled) {
                displayListings(page);
            }
        });
    });
}

// Call the function on page load
window.addEventListener('DOMContentLoaded', () => displayListings(1));