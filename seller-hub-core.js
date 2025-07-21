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
  
  // Show initial loader for active listings
  showLoader('activeListingsLoader');
  hideElement('listingsTable');
  hideElement('activeCount');
  
  // Add skeleton loading to table
  addSkeletonRows('activeListings', 3);
  
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
    const userDoc = userSnapshot.docs[0].data();
    console.log('Found user document ID:', userDocId);
    
    // Update user name in header
    const userNameElement = document.getElementById('userName');
    if (userNameElement && userDoc) {
      const displayName = userDoc.firstName || userDoc.name || userDoc.email || 'User';
      userNameElement.textContent = displayName;
    }
    
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
    
    // Show active count section
    showElement('activeCount');
    
    // Update pagination info
    const resultsInfo = document.getElementById('resultsInfo');
    if (resultsInfo) {
      resultsInfo.textContent = `Showing ${Math.min(activeSnapshot.size, 10)} of ${activeSnapshot.size} results`;
      console.log('Updated pagination info');
    }
    
    // Hide loader and show table
    hideLoader('activeListingsLoader');
    showElement('listingsTable');
    
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
                <div class="w-16 h-16 rounded-lg overflow-hidden">
                  <img src="${listing.images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2YwMDAwMCIgZD0iTTEyIDEyIi8+PC9zdmc+'}" alt="Listing" class="w-full h-full object-cover">
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
                <button class="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors" id="deactivateBtn-${doc.id}" data-listing-id="${doc.id}" data-doc-ref="${JSON.stringify(doc.ref)}">
                  Deactivate
                </button>
              </div>
            </td>
          `;
          
          tableBody.appendChild(row);
          
          // Add deactivation handler for this specific listing
          const deactivateBtn = document.getElementById(`deactivateBtn-${doc.id}`);
          if (deactivateBtn) {
            deactivateBtn.addEventListener('click', async (e) => {
              try {
                // Prevent default button behavior
                e.preventDefault();
                
                // Get the listings collection reference
                const listingsRef = collection(db, "users", userDocId, "listings");
                
                // Update the listing status to inactive
                await updateDoc(listingsRef.doc(e.target.dataset.listingId), {
                  status: "inactive",
                  updatedAt: new Date()
                });
                
                // Show success message
                alert('Listing has been deactivated successfully');
                
                // Refresh the listings display
                window.location.reload();
              } catch (error) {
                console.error("Error deactivating listing:", error);
                // TODO: Show error message to user
              }
            });
          }
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
    
    // Note: Inactive listings are loaded when tab is clicked
    // See tab switching logic at the bottom of this file
    // Note: Inactive listings are loaded when tab is clicked
    // See tab switching logic at the bottom of this file
    
    // Store references for later use
    window.listingsRef = listingsRef;
    window.inactiveQuery = inactiveQuery;
    
  } catch (error) {
    console.error("Error loading listings:", error);
    hideLoader('activeListingsLoader');
    showElement('listingsTable');
  }
});

/******************************************************************************
 * LOADER UTILITY FUNCTIONS
 * 
 * These functions handle showing and hiding loaders throughout the app
 ******************************************************************************/

function showLoader(loaderId) {
  const loader = document.getElementById(loaderId);
  if (loader) {
    loader.style.display = 'flex';
  }
}

function hideLoader(loaderId) {
  const loader = document.getElementById(loaderId);
  if (loader) {
    loader.style.display = 'none';
  }
}

function showElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'block';
    element.classList.remove('hidden');
  }
}

function hideElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'none';
    element.classList.add('hidden');
  }
}

function showGlobalLoader(message = 'Loading...') {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    const messageSpan = loader.querySelector('span');
    if (messageSpan) {
      messageSpan.textContent = message;
    }
    loader.classList.remove('hidden');
    loader.style.display = 'flex';
  }
}

function hideGlobalLoader() {
  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.classList.add('hidden');
    loader.style.display = 'none';
  }
}

/******************************************************************************
 * SKELETON LOADING FUNCTIONS
 * 
 * These functions create skeleton loading placeholders for better UX
 ******************************************************************************/

function addSkeletonRows(tableBodyId, count = 3) {
  const tableBody = document.getElementById(tableBodyId);
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  for (let i = 0; i < count; i++) {
    const row = document.createElement('tr');
    row.className = 'border-b animate-pulse';
    row.innerHTML = `
      <td class="p-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-gray-300 rounded-lg"></div>
          <div>
            <div class="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div class="h-3 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
      </td>
      <td class="p-4">
        <div class="h-4 bg-gray-300 rounded w-24"></div>
      </td>
      <td class="p-4">
        <div class="h-4 bg-gray-300 rounded w-16"></div>
      </td>
      <td class="p-4">
        <div class="flex gap-2">
          <div class="h-8 bg-gray-300 rounded w-16"></div>
          <div class="h-8 bg-gray-300 rounded w-20"></div>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

/******************************************************************************
 * LOAD INACTIVE LISTINGS
 * 
 * Separate function to load inactive listings when the tab is clicked
 ******************************************************************************/

async function loadInactiveListings() {
  if (!window.listingsRef) return;
  
  showLoader('inactiveListingsLoader');
  hideElement('inactiveListingsTable');
  
  // Add skeleton loading
  addSkeletonRows('inactiveListings', 2);
  
  try {
    const inactiveQuery = query(window.listingsRef, where("status", "==", "inactive"));
    const inactiveSnapshot = await getDocs(inactiveQuery);
    console.log(`Found ${inactiveSnapshot.size} inactive listings`);
    
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
    
    hideLoader('inactiveListingsLoader');
    showElement('inactiveListingsTable');
    
  } catch (error) {
    console.error("Error loading inactive listings:", error);
    hideLoader('inactiveListingsLoader');
    showElement('inactiveListingsTable');
  }
}

/******************************************************************************
 * LOAD ACTIVE ORDERS
 * 
 * Function to load active orders when the orders section is accessed
 ******************************************************************************/

async function loadActiveOrders() {
  showLoader('activeOrdersLoader');
  hideElement('activeOrdersTable');
  
  try {
    // Simulate loading time for demonstration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // TODO: Replace with actual orders fetching logic
    console.log('Loading active orders...');
    
    hideLoader('activeOrdersLoader');
    showElement('activeOrdersTable');
    
  } catch (error) {
    console.error("Error loading active orders:", error);
    hideLoader('activeOrdersLoader');
    showElement('activeOrdersTable');
  }
}

/******************************************************************************
 * LOAD PENDING ORDERS
 * 
 * Function to load pending orders when the pending tab is clicked
 ******************************************************************************/

async function loadPendingOrders() {
  showLoader('pendingOrdersLoader');
  hideElement('pendingOrdersTable');
  
  try {
    // Simulate loading time for demonstration
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // TODO: Replace with actual pending orders fetching logic
    console.log('Loading pending orders...');
    
    hideLoader('pendingOrdersLoader');
    showElement('pendingOrdersTable');
    
  } catch (error) {
    console.error("Error loading pending orders:", error);
    hideLoader('pendingOrdersLoader');
    showElement('pendingOrdersTable');
  }
}

/******************************************************************************
 * LOAD CANCELLED ORDERS
 * 
 * Function to load cancelled orders when the cancellations tab is clicked
 ******************************************************************************/

async function loadCancelledOrders() {
  showLoader('cancelledOrdersLoader');
  hideElement('cancelledOrdersTable');
  
  try {
    // Simulate loading time for demonstration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // TODO: Replace with actual cancelled orders fetching logic
    console.log('Loading cancelled orders...');
    
    hideLoader('cancelledOrdersLoader');
    showElement('cancelledOrdersTable');
    
  } catch (error) {
    console.error("Error loading cancelled orders:", error);
    hideLoader('cancelledOrdersLoader');
    showElement('cancelledOrdersTable');
  }
}

/*******************************************************************
 * CREATE LISTING
 * 
 * Handles the creation of a new listing
 * - Handles Preview for image uploads
 * - Validates form inputs
 * - Collects all listing data from the form
 * - Creates a new document in the user's listings subcollection
 * - Updates UI to show the new listing
 * - Handles errors and provides user feedback
 *******************************************************************/
async function handleCreateListing(e) {
  e.preventDefault();
  
  // Show loader and hide form
  showLoader('createListingLoader');
  hideElement('listingForm');
  
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    
    // Get user document reference
    const usersQuery = query(collection(db, "users"), where("uid", "==", user.uid));
    const userSnapshot = await getDocs(usersQuery);
    if (userSnapshot.empty) {
      hideLoader('createListingLoader');
      showElement('listingForm');
      return;
    }
    
    const userDocId = userSnapshot.docs[0].id;
    const listingsRef = collection(db, "users", userDocId, "listings");
    
    // Get form values
    const title = document.getElementById('listingTitle').value;
    const listingData = {
      title: title,
      subtitle: document.getElementById('listingSubtitle').value,
      category: document.getElementById('listingCategory').value,
      itemGender: document.getElementById('itemGender').value,
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
      if (fileInput && fileInput.files[0]) {
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
    
    // Hide loader, show form, and close modal
    hideLoader('createListingLoader');
    showElement('listingForm');
    document.getElementById('createListing').style.display = 'none';
    
    // Refresh listings
    window.location.reload();
    
  } catch (error) {
    console.error("Error creating listing:", error);
    // Hide loader and show form again
    hideLoader('createListingLoader');
    showElement('listingForm');
    // TODO: Show error message to user
    alert('Error creating listing. Please try again.');
  }
}

// Function to handle file selection and preview
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const container = e.target.closest('.photo-upload-container');
        const previewContainer = container.querySelector('.preview-container');
        const previewImg = container.querySelector('.preview-image');
        const removeBtn = container.querySelector('.remove-preview');
        
        // Show preview
        previewContainer.classList.remove('hidden');
        container.querySelector('.text-center').classList.add('hidden');
        
        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        previewImg.src = objectUrl;
        
        // Clean up object URL when page is unloaded
        window.addEventListener('unload', () => URL.revokeObjectURL(objectUrl));
    }
}

// Add click handlers for photo upload buttons and file change handlers
document.querySelectorAll('.photo-upload-container').forEach(container => {
    const fileInput = container.querySelector('input[type="file"]');
    if (fileInput) {
        container.addEventListener('click', (e) => {
            fileInput.click();
        });
        fileInput.addEventListener('change', handleFileSelect);
    }
});

// Add close button functionality
document.getElementById('closeCreateListing')?.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent any form submission
    document.getElementById('createListing').style.display = 'none';
});

// Add event listener for form submission
document.getElementById('listingForm')?.addEventListener('submit', handleCreateListing);

// Make functions globally available
window.loadInactiveListings = loadInactiveListings;
window.loadActiveOrders = loadActiveOrders;
window.loadPendingOrders = loadPendingOrders;
window.loadCancelledOrders = loadCancelledOrders;

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
