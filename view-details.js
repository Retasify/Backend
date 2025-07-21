import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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
  
  if (!listingId) {
    console.error("Missing listingId in URL parameters");
    return;
  }

  try {
    // Get all users
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    
    let foundListing = null;
    let foundUserId = null;
    
    // Search through each user's listings subcollection
    for (const userDoc of usersSnapshot.docs) {
      const listingRef = doc(db, "users", userDoc.id, "listings", listingId);
      const listingDoc = await getDoc(listingRef);
      
      if (listingDoc.exists()) {
        const listingData = listingDoc.data();
        console.log("Found listing data:", listingData);
        console.log("Image array:", listingData.image);
        foundListing = { id: listingDoc.id, ...listingData };
        foundUserId = userDoc.id;
        break;
      }
    }
    
    if (!foundListing) {
      console.error("No listing found with the provided ID in any user's collection");
      return;
    }

    // Update the URL to include the userId for future references
    if (foundUserId && !getQueryParam("userId")) {
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('userId', foundUserId);
      window.history.replaceState({}, '', newUrl);
    }

    // Set main image (first in array or fallback)
    const mainImageElem = document.getElementById("mainImage");
    if (mainImageElem) {
      // Debug log the image data we're working with
      console.log("Setting main image from:", foundListing.image);
      
      // Ensure we're working with an array and it has items
      const images = Array.isArray(foundListing.images) ? foundListing.images : [];
      console.log("Processed images array:", images);
      
      // Set the image source or fallback
      const imgSrc = images.length > 0 ? images[0] : "./images/Placeholder_img.png";
      console.log("Setting image source to:", imgSrc);
      
      mainImageElem.src = imgSrc;
    }
    
    // Update the rest of the UI with the found listing data
    updateListingUI(foundListing);
    
  } catch (error) {
    console.error("Error fetching listing:", error);
  }
}

// Update the rest of the UI with the found listing data
function updateListingUI(data) {
  const thumbnailContainer = document.getElementById("thumbnailContainer");
  const mainImageElem = document.getElementById("mainImage");
  
  // Clear any existing thumbnails
  if (thumbnailContainer) {
    thumbnailContainer.innerHTML = '';
    
    // Get the first 4 images (or fewer if there aren't 4)
    const images = Array.isArray(data.images) ? data.images.slice(0, 4) : [];
    
    // Create thumbnail for each image
    images.forEach((imgSrc, index) => {
      if (!imgSrc) return; // Skip empty image entries
      
      const thumbWrapper = document.createElement('div');
      thumbWrapper.className = 'thumbnail-wrapper relative inline-block mr-2 mb-2';
      thumbWrapper.style.width = '90px';
      thumbWrapper.style.height = '100px';
      thumbWrapper.style.borderRadius = '8px';
      thumbWrapper.style.overflow = 'hidden';
      thumbWrapper.style.cursor = 'pointer';
      thumbWrapper.style.border = '2px solid transparent';
      thumbWrapper.style.transition = 'all 0.2s ease';
      
      // Highlight first thumbnail by default
      if (index === 0) {
        thumbWrapper.style.borderColor = '#F4B840';
      }
      
      const thumbImg = document.createElement('img');
      thumbImg.src = imgSrc;
      thumbImg.alt = `Thumbnail ${index + 1}`;
      thumbImg.className = 'w-full h-full object-cover';
      thumbImg.loading = 'lazy';
      
      // Add hover effect
      thumbWrapper.addEventListener('mouseenter', () => {
        thumbWrapper.style.transform = 'scale(1.05)';
        thumbWrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      });
      
      thumbWrapper.addEventListener('mouseleave', () => {
        thumbWrapper.style.transform = 'scale(1)';
        thumbWrapper.style.boxShadow = 'none';
      });
      
      // Update main image on click
      thumbWrapper.addEventListener('click', () => {
        if (mainImageElem) {
          mainImageElem.src = imgSrc;
          // Update active thumbnail
          document.querySelectorAll('.thumbnail-wrapper').forEach(thumb => {
            thumb.style.borderColor = 'transparent';
          });
          thumbWrapper.style.borderColor = '#F4B840';
        }
      });
      
      thumbWrapper.appendChild(thumbImg);
      thumbnailContainer.appendChild(thumbWrapper);
    });
    
    // If no thumbnails, show a message
    if (images.length === 0) {
      const noImagesMsg = document.createElement('div');
      noImagesMsg.className = 'text-gray-500 text-sm';
      noImagesMsg.textContent = 'No images available';
      thumbnailContainer.appendChild(noImagesMsg);
    }
  }
  
  if (thumbnailContainer && Array.isArray(data.image)) {
    thumbnailContainer.innerHTML = ""; // Clear previous thumbnails
    
    // Add thumbnails for each image
    data.image.slice(0, 4).forEach((img, idx) => {
      if (!img) return; // Skip empty image entries
      
      const thumb = document.createElement("img");
      thumb.src = img;
      thumb.alt = `Thumbnail ${idx + 1}`;
      thumb.className = "thumbnail-img cursor-pointer";
      thumb.style.width = "160px";
      thumb.style.height = "160px";
      thumb.style.objectFit = "cover";
      thumb.style.borderRadius = "14px";
      thumb.style.marginRight = "14px";
      thumb.style.transition = "opacity 0.2s";
      
      // Add hover effect
      thumb.addEventListener("mouseenter", () => {
        thumb.style.opacity = "0.8";
      });
      thumb.addEventListener("mouseleave", () => {
        thumb.style.opacity = "1";
      });
      
      // Click to set as main image
      thumb.addEventListener("click", () => {
        if (mainImageElem) {
          mainImageElem.src = img;
          // Update active thumbnail
          document.querySelectorAll('.thumbnail-img').forEach(t => 
            t.classList.remove('ring-2', 'ring-[#F4B840]')
          );
          thumb.classList.add('ring-2', 'ring-[#F4B840]');
        }
      });
      
      // Highlight first thumbnail by default
      if (idx === 0) {
        thumb.classList.add('ring-2', 'ring-[#F4B840]');
      }
      
      thumbnailContainer.appendChild(thumb);
    });
  }

  // Set text fields
  if (document.getElementById("listingTitle"))
    document.getElementById("listingTitle").textContent = data.title || "";
  if (document.getElementById("listingTeaser"))
    document.getElementById("listingTeaser").textContent = data.subtitle || "";
  if (document.getElementById("listingDesc"))
    document.getElementById("listingDesc").textContent = data.description || "";
  if (document.getElementById("sellerName"))
    document.getElementById("sellerName").textContent = data.sellerName || "";
  if (document.getElementById("sellerLoc"))
    document.getElementById("sellerLoc").textContent = data.landmark || "";
  if (document.getElementById("itemClass"))
    document.getElementById("itemClass").textContent = data.category || "";
  if (document.getElementById("itemSize"))
    document.getElementById("itemSize").textContent = data.size || "";
  if (document.getElementById("pickupArea"))
    document.getElementById("pickupArea").textContent = data.landmark || "";
  if (document.getElementById("finalPrice"))
    document.getElementById("finalPrice").textContent = data.price ? `Php ${data.price}` : "";
}

// Run on DOMContentLoaded
window.addEventListener("DOMContentLoaded", populateListingDetails);

// Event listener for reviewsBtn to show reviews in listingDescContainer
const reviewsBtn = document.getElementById("reviewsBtn");
if (reviewsBtn) {
  reviewsBtn.addEventListener("click", async function () {
    // Style the reviews button as active and descBtn as inactive
    reviewsBtn.classList.add("text-[#F4B840]", "border-b-2", "border-[#F4B840]", "pb-2", "font-medium");
    const descBtn = document.getElementById("descBtn");
    if (descBtn) {
      descBtn.classList.remove("text-[#F4B840]", "border-b-2", "border-[#F4B840]", "pb-2", "font-medium");
      descBtn.classList.add("text-gray-600", "hover:text-[#F4B840]");
    }

    const listingId = getQueryParam("listingId");
    const userId = getQueryParam("userId");
    if (!listingId || !userId) return;
    const reviewsCol = collection(db, "users", userId, "listings", listingId, "reviews");
    const reviewsSnapshot = await getDocs(reviewsCol);

    const container = document.getElementById("listingDescContainer");
    if (!container) return;

    if (reviewsSnapshot.empty) {
      container.innerHTML = `<p class="text-gray-600 leading-relaxed">No reviews yet.</p>`;
      return;
    }

    let reviewsHtml = `<div class="max-w-4xl">`;
    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      const reviewer = data.reviewerName || "Anonymous";
      const rating = typeof data.reviewRating === "number" ? data.reviewRating : "N/A";
      const comment = data.reviewComment || "";
      reviewsHtml += `
        <div class="mb-8 pb-6 border-b border-gray-200">
          <div class="flex items-center mb-2">
            <span class="font-semibold text-gray-800 mr-3">${reviewer}</span>
            <span class="text-[#F4B840] font-bold mr-2">★ ${rating}</span>
          </div>
          <p class="text-gray-600 leading-relaxed">${comment}</p>
        </div>
      `;
    });
    reviewsHtml += `</div>`;
    container.innerHTML = reviewsHtml;
  });
}

// Event listener for descBtn to revert to description
const descBtn = document.getElementById("descBtn");
if (descBtn) {
  descBtn.addEventListener("click", async function () {
    // Style the descBtn as active and reviewsBtn as inactive
    descBtn.classList.add("text-[#F4B840]", "border-b-2", "border-[#F4B840]", "pb-2", "font-medium");
    if (reviewsBtn) {
      reviewsBtn.classList.remove("text-[#F4B840]", "border-b-2", "border-[#F4B840]", "pb-2", "font-medium");
      reviewsBtn.classList.add("text-gray-600", "hover:text-[#F4B840]");
    }

    // Restore the description content
    const listingId = getQueryParam("listingId");
    const userId = getQueryParam("userId");
    if (!listingId || !userId) return;
    const docRef = doc(db, "users", userId, "listings", listingId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    const descElem = document.getElementById("listingDescContainer");
    if (descElem) {
      descElem.textContent = data.itemDescription || "";
    }
  });
}