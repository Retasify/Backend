import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, where, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
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
 * PAGINATION VARIABLES
 * 
 * Global variables for handling pagination across different sections
 ******************************************************************************/

// Pagination variables for listings
let currentListingsPage = 1;
let currentOrdersPage = 1;
const itemsPerPage = 5; // 5 items per page for seller dashboard
let allActiveListingsCache = [];
let allInactiveListingsCache = [];
let allOrdersCache = [];
let totalActiveListings = 0;
let totalInactiveListings = 0;
let totalOrders = 0;

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
    
    // Get the user document ID and store globally
    window.userDocId = userSnapshot.docs[0].id;
    const userDoc = userSnapshot.docs[0].data();
    console.log('Found user document ID:', window.userDocId);
    
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
    
    // Define inactiveQuery in the correct scope
    const inactiveQuery = query(listingsRef, where("status", "==", "inactive"));
    
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
    
    // Cache all active listings for pagination
    allActiveListingsCache = [];
    activeSnapshot.forEach((doc) => {
      allActiveListingsCache.push({
        id: doc.id,
        ...doc.data()
      });
    });
    totalActiveListings = allActiveListingsCache.length;
    
    // Update active count display
    const activeCountDisplay = document.getElementById('activeCountDisplay');
    if (activeCountDisplay) {
      activeCountDisplay.textContent = `Total Active (${totalActiveListings})`;
      console.log('Updated active count display with:', totalActiveListings);
    }
    
    // Show active count section
    showElement('activeCount');
    
    // Hide loader and show table
    hideLoader('activeListingsLoader');
    showElement('listingsTable');
    
    // Display first page of active listings
    displayActiveListings(1);

    /**************************************************************************
     * INACTIVE LISTINGS DISPLAY
     * 
     * This section:
     * - Queries for listings with status "inactive"
     * - Populates the inactive listings container with simplified cards
     * - Includes reactivate button for each inactive listing
     * - Handles empty state if no inactive listings found
     **************************************************************************/
    
    // Initialize tab switching
    const activeTab = document.getElementById('activeTab');
    const inactiveTab = document.getElementById('inactiveTab');
    const activeContent = document.getElementById('listingsTable');
    const inactiveContent = document.getElementById('inactiveContent');
    
    // Function to switch to active listings
    function showActiveListings() {
        // Update tab styles
        activeTab.classList.add('border-b-2', 'border-[#F4B840]', 'text-[#F4B840]', 'font-semibold');
        activeTab.classList.remove('text-gray-600');
        inactiveTab.classList.remove('border-b-2', 'border-[#F4B840]', 'text-[#F4B840]', 'font-semibold');
        inactiveTab.classList.add('text-gray-600');
        
        // Show/hide content
        if (activeContent) {
            activeContent.style.display = 'block';
            // Show active count
            const activeCountDisplay = document.getElementById('activeCountDisplay');
            if (activeCountDisplay) {
                activeCountDisplay.textContent = `Total Active (${totalActiveListings})`;
                activeCountDisplay.parentElement.style.display = 'block';
            }
        }
        if (inactiveContent) inactiveContent.classList.add('hidden');
        
        // Display first page of active listings
        displayActiveListings(1);
    }
    
    // Function to switch to inactive listings
    async function showInactiveListings() {
        // Update tab styles
        inactiveTab.classList.add('border-b-2', 'border-[#F4B840]', 'text-[#F4B840]', 'font-semibold');
        inactiveTab.classList.remove('text-gray-600');
        activeTab.classList.remove('border-b-2', 'border-[#F4B840]', 'text-[#F4B840]', 'font-semibold');
        activeTab.classList.add('text-gray-600');
        
        // Show/hide content
        if (activeContent) {
            activeContent.style.display = 'none';
            // Hide active count
            const activeCount = document.getElementById('activeCount');
            if (activeCount) activeCount.style.display = 'none';
        }
        if (inactiveContent) {
            inactiveContent.classList.remove('hidden');
            // Show inactive count
            const inactiveCountDisplay = document.getElementById('inactiveCountDisplay');
        if (inactiveContent) inactiveContent.classList.remove('hidden');
        
        // Show inactive count and load data
        const inactiveCountElement = document.getElementById('inactiveCountDisplay');
        if (inactiveCountElement) {
            try {
                const inactiveQuery = query(listingsRef, where("status", "==", "inactive"));
                const inactiveSnapshot = await getDocs(inactiveQuery);
                
                // Cache all inactive listings for pagination
                allInactiveListingsCache = [];
                inactiveSnapshot.forEach((doc) => {
                    allInactiveListingsCache.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                totalInactiveListings = allInactiveListingsCache.length;
                
                inactiveCountElement.textContent = `Total Inactive (${totalInactiveListings})`;
                inactiveCountElement.parentElement.style.display = 'block';
                
                // Display first page of inactive listings
                displayInactiveListings(1);
                
            } catch (error) {
                inactiveCountElement.textContent = 'Error loading inactive count';
            }
        }
        }
        
        // Load inactive listings if needed
        if (typeof loadInactiveListings === 'function') {
            loadInactiveListings();
        }
    }
    
    // Set up tab click handlers
    if (activeTab && inactiveTab) {
        activeTab.addEventListener('click', showActiveListings);
        inactiveTab.addEventListener('click', showInactiveListings);
        
        // Initialize with active listings
        showActiveListings();
    }
    
    // Store references for later use
    window.listingsRef = listingsRef;
    window.inactiveQuery = inactiveQuery;
    
  } catch (error) {
    hideLoader('activeListingsLoader');
    showElement('listingsTable');
  }
});

/******************************************************************************
 * PAGINATION UTILITY FUNCTIONS
 * 
 * These functions handle pagination for listings and orders
 ******************************************************************************/

function updateListingsPagination(section = 'active') {
    const totalItems = section === 'active' ? totalActiveListings : totalInactiveListings;
    const currentPage = currentListingsPage;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationContainer = document.querySelector('#listingsPaginationContainer nav');
    
    if (!paginationContainer) {
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors pagination-btn" 
                data-page="${currentPage - 1}" 
                data-section="listings"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left text-gray-400"></i>
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
            <button class="w-8 h-8 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors pagination-btn" 
                    data-page="1" data-section="listings">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
    }

    // Show page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <button class="w-8 h-8 ${isActive ? 'bg-[#F4B840] text-black' : 'hover:bg-gray-100 text-gray-600'} rounded-lg font-semibold transition-colors pagination-btn" 
                    data-page="${i}" data-section="listings">${i}</button>
        `;
    }

    // Show ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
        paginationHTML += `
            <button class="w-8 h-8 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors pagination-btn" 
                    data-page="${totalPages}" data-section="listings">${totalPages}</button>
        `;
    }

    // Next button
    paginationHTML += `
        <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors pagination-btn" 
                data-page="${currentPage + 1}" 
                data-section="listings"
                ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right text-gray-400"></i>
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    document.querySelectorAll('.pagination-btn[data-section="listings"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages && !btn.disabled) {
                currentListingsPage = page;
                // Determine which tab is currently active
                const activeTab = document.getElementById('activeTab');
                const isActiveTabSelected = activeTab && activeTab.classList.contains('text-[#F4B840]');
                
                if (isActiveTabSelected) {
                    displayActiveListings(page);
                } else {
                    displayInactiveListings(page);
                }
            }
        });
    });
}

function updateOrdersPagination() {
    const totalPages = Math.ceil(totalOrders / itemsPerPage);
    const paginationContainer = document.querySelector('#ordersPaginationContainer nav');
    
    if (!paginationContainer) {
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors pagination-btn" 
                data-page="${currentOrdersPage - 1}" 
                data-section="orders"
                ${currentOrdersPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left text-gray-400"></i>
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentOrdersPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Show first page and ellipsis if needed
    if (startPage > 1) {
        paginationHTML += `
            <button class="w-8 h-8 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors pagination-btn" 
                    data-page="1" data-section="orders">1</button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
    }

    // Show page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentOrdersPage;
        paginationHTML += `
            <button class="w-8 h-8 ${isActive ? 'bg-[#F4B840] text-black' : 'hover:bg-gray-100 text-gray-600'} rounded-lg font-semibold transition-colors pagination-btn" 
                    data-page="${i}" data-section="orders">${i}</button>
        `;
    }

    // Show ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
        paginationHTML += `
            <button class="w-8 h-8 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors pagination-btn" 
                    data-page="${totalPages}" data-section="orders">${totalPages}</button>
        `;
    }

    // Next button
    paginationHTML += `
        <button class="p-2 rounded-lg hover:bg-gray-100 transition-colors pagination-btn" 
                data-page="${currentOrdersPage + 1}" 
                data-section="orders"
                ${currentOrdersPage === totalPages || totalPages === 0 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right text-gray-400"></i>
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // Add event listeners to pagination buttons
    document.querySelectorAll('.pagination-btn[data-section="orders"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages && !btn.disabled) {
                currentOrdersPage = page;
                displayOrders(page);
            }
        });
    });
}

function updateResultsHeader(section, startItem, endItem, total) {
    let elementId;
    switch(section) {
        case 'active':
            elementId = 'resultsInfo';
            break;
        case 'inactive':
            elementId = 'inactiveResultsInfo';
            break;
        case 'orders':
            elementId = 'ordersResultsInfo';
            break;
        default:
            return;
    }
    
    const resultsHeader = document.getElementById(elementId);
    if (resultsHeader) {
        if (total === 0) {
            resultsHeader.textContent = `Showing 0 results`;
        } else {
            resultsHeader.textContent = `Showing ${startItem}-${endItem} of ${total} results`;
        }
    }
}

// Functions to display paginated data
function displayActiveListings(page = 1) {
    currentListingsPage = page;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageListings = allActiveListingsCache.slice(startIndex, endIndex);
    
    // Update results header
    const startItem = startIndex + 1;
    const endItem = Math.min(endIndex, totalActiveListings);
    updateResultsHeader('active', startItem, endItem, totalActiveListings);
    
    // Render the listings table (reuse existing logic)
    renderActiveListingsTable(pageListings);
    
    // Update pagination
    updateListingsPagination('active');
}

function displayInactiveListings(page = 1) {
    currentListingsPage = page;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageListings = allInactiveListingsCache.slice(startIndex, endIndex);
    
    // Update results header
    const startItem = startIndex + 1;
    const endItem = Math.min(endIndex, totalInactiveListings);
    updateResultsHeader('inactive', startItem, endItem, totalInactiveListings);
    
    // Render the listings table (reuse existing logic)
    renderInactiveListingsTable(pageListings);
    
    // Update pagination
    updateListingsPagination('inactive');
}

function displayOrders(page = 1) {
    currentOrdersPage = page;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageOrders = allOrdersCache.slice(startIndex, endIndex);
    
    // Update results header (if you have one for orders)
    const startItem = startIndex + 1;
    const endItem = Math.min(endIndex, totalOrders);
    updateResultsHeader('orders', startItem, endItem, totalOrders);
    
    // Render the orders table (reuse existing logic)
    renderOrdersTable(pageOrders);
    
    // Update pagination
    updateOrdersPagination();
}

// Functions to render table content
function renderActiveListingsTable(listings) {
    const tableBody = document.getElementById('activeListings');
    if (!tableBody) {
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (listings.length === 0) {
        // Show empty state
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="p-4 text-center text-gray-500">No active listings found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    listings.forEach((listing) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        // Format data
        const formattedDate = listing.createdAt ? 
            (listing.createdAt.toDate ? listing.createdAt.toDate() : new Date(listing.createdAt)).toLocaleDateString() : 
            'No date';
        const formattedPrice = listing.price ? `₱${listing.price}` : 'No price';
        
        row.innerHTML = `
            <td class="p-4">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-lg overflow-hidden">
                  <img src="${listing.images && listing.images[0] ? listing.images[0] : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2YwMDAwMCIgZD0iTTEyIDEyIi8+PC9zdmc+'}" alt="Listing" class="w-full h-full object-cover">
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
                <button class="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors" 
                        onclick="deactivateListing('${listing.id}')">
                  Deactivate
                </button>
              </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function renderInactiveListingsTable(listings) {
    const tableBody = document.getElementById('inactiveListings');
    if (!tableBody) {
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (listings.length === 0) {
        // Show empty state
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="p-4 text-center text-gray-500">No inactive listings found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    listings.forEach((listing) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50';
        
        // Format data
        const formattedDate = listing.createdAt ? 
            (listing.createdAt.toDate ? listing.createdAt.toDate() : new Date(listing.createdAt)).toLocaleDateString() : 
            'No date';
        const formattedPrice = listing.price ? `₱${listing.price}` : 'No price';
        
        row.innerHTML = `
            <td class="p-4">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-lg overflow-hidden">
                  <img src="${listing.images && listing.images[0] ? listing.images[0] : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI2YwMDAwMCIgZD0iTTEyIDEyIi8+PC9zdmc+'}" alt="Listing" class="w-full h-full object-cover">
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
                <button class="bg-green-100 text-green-600 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                        onclick="reactivateListing('${listing.id}')">
                  Reactivate
                </button>
              </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function renderOrdersTable(orders) {
    // Implementation to render orders table - placeholder for now
    // TODO: Implement based on your orders structure
}

// Global functions for listing management
window.deactivateListing = async function(listingId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to manage listings');
            return;
        }
        
        const userDocId = window.userDocId;
        if (!userDocId) {
            alert('User document not found');
            return;
        }
        
        // Update the listing status to inactive
        const listingRef = doc(db, "users", userDocId, "listings", listingId);
        await updateDoc(listingRef, {
            status: "inactive",
            updatedAt: new Date()
        });
        
        // Show success message
        alert('Listing has been deactivated successfully');
        
        // Refresh the listings display
        window.location.reload();
        
    } catch (error) {
        alert('Error deactivating listing: ' + error.message);
    }
};

window.reactivateListing = async function(listingId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please log in to manage listings');
            return;
        }
        
        const userDocId = window.userDocId;
        if (!userDocId) {
            alert('User document not found');
            return;
        }
        
        // Update the listing status to active
        const listingRef = doc(db, "users", userDocId, "listings", listingId);
        await updateDoc(listingRef, {
            status: "active",
            updatedAt: new Date()
        });
        
        // Show success message
        alert('Listing has been reactivated successfully');
        
        // Refresh the listings display
        window.location.reload();
        
    } catch (error) {
        alert('Error reactivating listing: ' + error.message);
    }
};

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
    const rentals = await fetchAllRentalsForOwner();
    const activeOrdersTable = document.getElementById('activeOrdersTable');
    
    if (!activeOrdersTable) {
      console.error('Active orders table not found');
      return;
    }

    if (rentals.length === 0) {
      activeOrdersTable.innerHTML = `
        <div class="text-center py-8">
          <div class="text-gray-400 mb-4">
            <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <p class="text-gray-500">No rentals found for your listings.</p>
        </div>
      `;
      hideLoader('activeOrdersLoader');
      showElement('activeOrdersTable');
      return;
    }

    // Sort rentals by createdAt (newest first)
    rentals.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });

    let html = '';
    rentals.forEach(rental => {
      const startDate = formatDate(rental.startDate);
      const endDate = formatDate(rental.endDate);
      const createdDate = formatDate(rental.createdAt);
      const totalPrice = rental.totalPrice ? `₱${rental.totalPrice.toLocaleString()}` : '₱0';
      
      let statusClass = '';
      let statusText = rental.status || 'Pending';
      
      switch(statusText.toLowerCase()) {
        case 'pending':
          statusClass = 'bg-yellow-100 text-yellow-800';
          break;
        case 'confirmed':
          statusClass = 'bg-blue-100 text-blue-800';
          break;
        case 'in-progress':
          statusClass = 'bg-green-100 text-green-800';
          break;
        case 'completed':
          statusClass = 'bg-gray-100 text-gray-800';
          break;
        case 'cancelled':
          statusClass = 'bg-red-100 text-red-800';
          break;
        default:
          statusClass = 'bg-gray-100 text-gray-800';
      }

      html += `
        <div class="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-start space-x-3">
              ${rental.listingImage ? `<img src="${rental.listingImage}" alt="${rental.listingTitle}" class="w-16 h-16 rounded-md object-cover flex-shrink-0">` : ''}
              <div>
                <h4 class="font-semibold text-gray-900">${rental.listingTitle}</h4>
                <p class="text-sm text-gray-600">Rental ID: ${rental.id}</p>
              </div>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
              ${statusText}
            </span>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Start Date:</span>
              <p class="font-medium">${startDate}</p>
            </div>
            <div>
              <span class="text-gray-500">End Date:</span>
              <p class="font-medium">${endDate}</p>
            </div>
            <div>
              <span class="text-gray-500">Total Price:</span>
              <p class="font-medium">${totalPrice}</p>
            </div>
            <div>
              <span class="text-gray-500">Renter:</span>
              <p class="font-medium">${rental.fullName || rental.renterName || rental.renterEmail || 'Unknown'}</p>
            </div>
          </div>
          
          ${rental.notes ? `
            <div class="mt-3 pt-3 border-t">
              <span class="text-gray-500 text-sm">Notes:</span>
              <p class="text-sm text-gray-700">${rental.notes}</p>
            </div>
          ` : ''}
          <div class="mt-3 pt-3 border-t flex justify-end">
              <button 
                onclick="markAsPickedUp('${rental.id}', '${rental.ownerUserId}')" 
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors">
                Mark as Picked Up
              </button>
            </div>
        </div>
      `;
    });

    activeOrdersTable.innerHTML = html;
    
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

/******************************************************************************
 * FETCH ALL RENTALS FOR OWNER'S LISTINGS
 * 
 * This function fetches all rentals from the rentals subcollection
 * of all listings that have an ownerUserId matching the logged-in user's UID
 ******************************************************************************/
async function fetchAllRentalsForOwner() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }

    console.log('Fetching all rentals for owner auth UID:', user.uid);

    // Use globally stored user document ID instead of querying again
    const userDocId = window.userDocId;
    if (!userDocId) {
      console.error('User document ID not found in global scope');
      return [];
    }
    console.log('Using globally stored user document ID:', userDocId);

    // Query the rentals subcollection under the user document
    // Use the document ID instead of the auth UID
    const rentalsQuery = query(
      collection(db, "users", userDocId, "rentals"), 
      where("ownerUserId", "==", userDocId)
    );
    
    const rentalsSnapshot = await getDocs(rentalsQuery);
    console.log(`Found ${rentalsSnapshot.size} rentals for owner document ID ${userDocId}`);

    const allRentals = [];

    // Process each rental document
    rentalsSnapshot.forEach(rentalDoc => {
      const rentalData = rentalDoc.data();
      console.log('Rental data:', rentalData);
      console.log('Rental status:', rentalData.status);
      console.log('Rental ownerUserId:', rentalData.ownerUserId);
      allRentals.push({
        id: rentalDoc.id,
        ...rentalData
      });
    });

    console.log(`Total rentals found for owner: ${allRentals.length}`);
    return allRentals;

  } catch (error) {
    console.error('Error fetching rentals for owner:', error);
    return [];
  }
}

// Function to display rentals in seller dashboard
async function displayOwnerRentals() {
  try {
    showLoader('rentalsLoader');
    
    const rentals = await fetchAllRentalsForOwner();
    const rentalsContainer = document.getElementById('ownerRentalsContainer');
    
    if (!rentalsContainer) {
      console.error('Rentals container not found');
      return;
    }

    if (rentals.length === 0) {
      rentalsContainer.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500">No rentals found for your listings.</p>
        </div>
      `;
      return;
    }

    // Sort rentals by createdAt (newest first)
    rentals.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });

    let html = '';
    rentals.forEach(rental => {
      const startDate = formatDate(rental.startDate);
      const endDate = formatDate(rental.endDate);
      const createdDate = formatDate(rental.createdAt);
      const totalPrice = rental.totalPrice ? `₱${rental.totalPrice.toLocaleString()}` : '₱0';
      
      let statusClass = '';
      let statusText = rental.status || 'Pending';
      
      switch(statusText.toLowerCase()) {
        case 'pending':
          statusClass = 'bg-yellow-100 text-yellow-800';
          break;
        case 'confirmed':
          statusClass = 'bg-blue-100 text-blue-800';
          break;
        case 'in-progress':
          statusClass = 'bg-green-100 text-green-800';
          break;
        case 'completed':
          statusClass = 'bg-gray-100 text-gray-800';
          break;
        case 'cancelled':
          statusClass = 'bg-red-100 text-red-800';
          break;
        default:
          statusClass = 'bg-gray-100 text-gray-800';
      }

      html += `
        <div class="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-start space-x-3">
              ${rental.listingImage ? `<img src="${rental.listingImage}" alt="${rental.listingTitle}" class="w-16 h-16 rounded-md object-cover flex-shrink-0">` : ''}
              <div>
                <h4 class="font-semibold text-gray-900">${rental.listingTitle}</h4>
                <p class="text-sm text-gray-600">Rental ID: ${rental.id}</p>
              </div>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
              ${statusText}
            </span>
          </div>
          
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Start Date:</span>
              <p class="font-medium">${startDate}</p>
            </div>
            <div>
              <span class="text-gray-500">End Date:</span>
              <p class="font-medium">${endDate}</p>
            </div>
            <div>
              <span class="text-gray-500">Total Price:</span>
              <p class="font-medium">${totalPrice}</p>
            </div>
            <div>
              <span class="text-gray-500">Renter:</span>
              <p class="font-medium">${rental.fullName || rental.renterName || rental.renterEmail || 'Unknown'}</p>
            </div>
          </div>
          
          ${rental.notes ? `
            <div class="mt-3 pt-3 border-t">
              <span class="text-gray-500 text-sm">Notes:</span>
              <p class="text-sm text-gray-700">${rental.notes}</p>
            </div>
          ` : ''}
          <div class="mt-3 pt-3 border-t flex justify-end">
              <button 
                onclick="markAsPickedUp('${rental.id}', '${rental.ownerUserId}')" 
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors">
                Mark as Picked Up
              </button>
            </div>
        </div>
      `;
    });

    rentalsContainer.innerHTML = html;
    
  } catch (error) {
    console.error('Error displaying owner rentals:', error);
  } finally {
    hideLoader('rentalsLoader');
  }
}

// Make functions globally available
window.fetchAllRentalsForOwner = fetchAllRentalsForOwner;
window.displayOwnerRentals = displayOwnerRentals;

function formatDate(date) {
  if (!date) return 'N/A';
  
  // Handle Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // Handle regular Date or string
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Function to mark rental as picked up
window.markAsPickedUp = async function(rentalId, ownerUserId) {
  try {
    // Get the rental document reference
    const rentalDocRef = doc(db, "users", ownerUserId, "rentals", rentalId);
    
    // Update the rental status to picked up
    await updateDoc(rentalDocRef, {
      status: "picked up",
      updatedAt: new Date()
    });
    
    // Show success message
    alert('Rental has been marked as picked up successfully');
    
    // Refresh the rentals display
    window.location.reload();
    
  } catch (error) {
    console.error("Error marking rental as picked up:", error);
    alert('Error marking rental as picked up: ' + error.message);
  }
};

// Function to mark rental as returned
window.markAsReturned = async function(rentalId, ownerUserId) {
  try {
    // Get the rental document reference
    const rentalDocRef = doc(db, "users", ownerUserId, "rentals", rentalId);
    
    // Update the rental status to returned
    await updateDoc(rentalDocRef, {
      status: "returned",
      updatedAt: new Date()
    });
    
    // Show success message
    alert('Rental has been marked as returned successfully');
    
    // Refresh the rentals display
    window.location.reload();
    
  } catch (error) {
    console.error("Error marking rental as returned:", error);
    alert('Error marking rental as returned: ' + error.message);
  }
};
