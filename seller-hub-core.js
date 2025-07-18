import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";
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

/******************************************************************************
 * AUTHENTICATION & PERSISTENCE HANDLING
 * 
 * This section handles:
 * - Firebase initialization
 * - Authentication state persistence check
 * - Redirects to login if no active session
 * - User session validation
 ******************************************************************************/

// Verify auth persistence is enabled
console.log('Checking auth persistence state');

// Monitor auth state - persistence will already be active from seller-hub-login.js
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log('No persisted session found, redirecting to login');
    window.location.href = "login.html";
    return;
  }
  
  console.log('Persisted user session found:');
  console.log('UID:', user.uid);
  
  /****************************************************************************
   * USER DOCUMENT VALIDATION
   * 
   * This section:
   * - Finds the user document in Firestore using the auth UID
   * - Verifies the document exists before proceeding
   * - Gets the actual document ID (since UID may be a field, not the doc ID)
   ****************************************************************************/
  
  try {
    // First find the user document where uid field matches
    const usersQuery = query(collection(db, "users"), where("uid", "==", user.uid));
    const userSnapshot = await getDocs(usersQuery);
    
    if (userSnapshot.empty) {
      console.log('No user document found with UID:', user.uid);
      return;
    }
    
    // Get the user document ID
    const userDocId = userSnapshot.docs[0].id;
    console.log('Found user document ID:', userDocId);
    
    /**************************************************************************
     * LISTINGS DATA FETCHING
     * 
     * This section:
     * - Accesses the listings subcollection under the user document
     * - Performs initial unfiltered query for debugging
     * - Runs separate queries for active and inactive listings
     **************************************************************************/
    
    // Now access listings subcollection under this document
    const listingsRef = collection(db, "users", userDocId, "listings");
    
    // Try getting ALL listings first (without status filter)
    const allListings = await getDocs(listingsRef);
    console.log(`User has ${allListings.size} total listings`);
    allListings.forEach(doc => {
      console.log('Listing:', doc.id, 'Status:', doc.data().status || 'undefined');
    });
    
    /**************************************************************************
     * ACTIVE LISTINGS DISPLAY
     * 
     * This section:
     * - Queries for listings with status "active"
     * - Updates the active listings count display
     * - Populates the active listings table with formatted data
     * - Handles empty state if no active listings found
     **************************************************************************/
    
    // Now try with status filter
    const activeQuery = query(listingsRef, where("status", "==", "active"));
    const activeSnapshot = await getDocs(activeQuery);
    console.log(`Found ${activeSnapshot.size} active listings`);
    
    // Update active count display
    const activeCountDisplay = document.getElementById('activeCountDisplay');
    if (activeCountDisplay) {
      activeCountDisplay.textContent = `Total Active (${activeSnapshot.size})`;
      console.log('Updated active count display with:', activeSnapshot.size);
    }
    
    // Update pagination info
    const resultsInfo = document.getElementById('resultsInfo');
    if (resultsInfo) {
      resultsInfo.textContent = `Showing ${Math.min(activeSnapshot.size, 10)} of ${activeSnapshot.size} results`;
      console.log('Updated pagination info');
    }
    
    // Get table body element
    const tableBody = document.getElementById('activeListings');
    
    if (tableBody) {
      tableBody.innerHTML = '';
      
      if (activeSnapshot.size > 0) {
        // Display active listings
        activeSnapshot.forEach((doc) => {
          const listing = doc.data();
          const row = document.createElement('tr');
          row.className = 'border-b hover:bg-gray-50';
          
          // Format date if available
          const listingDate = listing.date?.toDate() || new Date();
          const formattedDate = listingDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Format price if available
          const formattedPrice = listing.price ? `₱${listing.price.toLocaleString()}` : '₱0';
          
          row.innerHTML = `
            <td class="p-4">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <i class="fas fa-image text-gray-400"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">${listing.title || 'No Title'}</p>
                  ${listing.category ? `<p class="text-sm text-gray-600">${listing.category}</p>` : ''}
                  ${listing.subcategory ? `<p class="text-sm text-gray-600">${listing.subcategory}</p>` : ''}
                </div>
              </div>
            </td>
            <td class="p-4 text-gray-600">${formattedDate}</td>
            <td class="p-4 text-gray-800 font-semibold">${formattedPrice}</td>
            <td class="p-4">
              <div class="flex gap-2">
                <button class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                  Edit
                </button>
                <button class="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors">
                  Deactivate
                </button>
              </div>
            </td>
          `;
          
          tableBody.appendChild(row);
        });
      } else {
        // Show message if no active listings found
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="p-4 text-center text-gray-500">No active listings found</td>';
        tableBody.appendChild(row);
      }
    }
    
    /**************************************************************************
     * INACTIVE LISTINGS DISPLAY
     * 
     * This section:
     * - Queries for listings with status "inactive"
     * - Populates the inactive listings container with simplified cards
     * - Includes reactivate button for each inactive listing
     * - Handles empty state if no inactive listings found
     **************************************************************************/
    
    // Get inactive listings
    const inactiveQuery = query(listingsRef, where("status", "==", "inactive"));
    const inactiveSnapshot = await getDocs(inactiveQuery);
    console.log(`Found ${inactiveSnapshot.size} inactive listings`);
    
    // Display inactive listings
    const inactiveContainer = document.getElementById('inactiveListings');
    const inactiveResultsInfo = document.getElementById('inactiveResultsInfo');
    
    if (inactiveContainer) {
      inactiveContainer.innerHTML = '';
      
      if (inactiveSnapshot.size > 0) {
        // Update results info
        if (inactiveResultsInfo) {
          inactiveResultsInfo.textContent = `Showing ${Math.min(inactiveSnapshot.size, 10)} of ${inactiveSnapshot.size} results`;
        }
        
        inactiveSnapshot.forEach((doc) => {
          const listing = doc.data();
          const row = document.createElement('tr');
          row.className = 'border-b hover:bg-gray-50';
          
          // Title cell
          const titleCell = document.createElement('td');
          titleCell.className = 'p-4';
          titleCell.innerHTML = `
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                <i class="fas fa-image text-gray-400"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">${listing.title || 'Untitled'}</p>
                <p class="text-sm text-gray-600">${listing.description || ''}</p>
              </div>
            </div>
          `;
          
          // Date cell
          const dateCell = document.createElement('td');
          dateCell.className = 'p-4 text-gray-600';
          dateCell.textContent = listing.createdAt ? formatDate(listing.createdAt.toDate()) : 'Unknown';
          
          // Price cell
          const priceCell = document.createElement('td');
          priceCell.className = 'p-4 text-gray-800 font-semibold';
          priceCell.textContent = listing.price ? `₱${listing.price}` : 'Price not set';
          
          // Actions cell
          const actionsCell = document.createElement('td');
          actionsCell.className = 'p-4';
          actionsCell.innerHTML = `
            <div class="flex gap-2">
              <button class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                Edit
              </button>
              <button class="bg-green-100 text-green-600 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors">
                Reactivate
              </button>
            </div>
          `;
          
          row.appendChild(titleCell);
          row.appendChild(dateCell);
          row.appendChild(priceCell);
          row.appendChild(actionsCell);
          inactiveContainer.appendChild(row);
        });
      } else {
        // Empty state
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="4" class="p-8 text-center text-gray-500">
            No inactive listings found
          </td>
        `;
        inactiveContainer.appendChild(emptyRow);
      }
    }
  } catch (error) {
    console.error("Error loading listings:", error);
  }
});

/*******************************************************************
 * CREATE LISTING
 * 
 * Handles the creation of a new listing
 * - Validates form inputs
 * - Collects all listing data from the form
 * - Creates a new document in the user's listings subcollection
 * - Updates UI to show the new listing
 * - Handles errors and provides user feedback
 *******************************************************************/
async function handleCreateListing(e) {
  e.preventDefault();
  
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    
    // Get user document reference
    const usersQuery = query(collection(db, "users"), where("uid", "==", user.uid));
    const userSnapshot = await getDocs(usersQuery);
    if (userSnapshot.empty) return;
    
    const userDocId = userSnapshot.docs[0].id;
    const listingsRef = collection(db, "users", userDocId, "listings");
    
    // Get form values
    const title = document.getElementById('listingTitle').value;
    const listingData = {
      title: title,
      subtitle: document.getElementById('listingSubtitle').value,
      category: document.getElementById('listingCategory').value,
      condition: document.getElementById('listingCondition').value,
      size: document.getElementById('listingSize').value,
      bust: document.getElementById('listingBust').value,
      waist: document.getElementById('listingWaist').value,
      length: document.getElementById('listingLength').value,
      price: document.getElementById('listingPrice').value,
      description: document.getElementById('listingDescription').value,
      address: document.getElementById('listingAddress').value,
      landmark: document.getElementById('listingLandmark').value,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      images: []
    };
    
    // Initialize storage
    const storage = getStorage();
    const storageRef = ref(storage, `listings/${user.uid}/${title.replace(/[^a-z0-9]/gi, '_')}`);
    
    // Upload photos
    const photoUploads = [];
    for (let i = 1; i <= 4; i++) {
      const fileInput = document.getElementById(`photoUpload${i}`);
      if (fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileRef = ref(storageRef, `photo_${i}_${file.name}`);
        const uploadTask = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        photoUploads.push(downloadURL);
      }
    }
    
    // Add image URLs to listing data
    listingData.images = photoUploads;
    listingData.sellerId = user.uid;
    
    // Add listing to Firestore
    const docRef = await addDoc(listingsRef, listingData);
    console.log("Listing created with ID: ", docRef.id);
    
    // Close modal and refresh listings
    document.getElementById('createListing').style.display = 'none';
    window.location.reload();
    
  } catch (error) {
    console.error("Error creating listing:", error);
    // TODO: Show error message to user
  }
}

// Add event listener for form submission
document.getElementById('listingForm')?.addEventListener('submit', handleCreateListing);

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
