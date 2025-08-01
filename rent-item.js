import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Your web app's Firebase configuration
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

// Rental calculation functionality
class RentalCalculator {
  constructor() {
    this.dailyRate = 100; // Default daily rate, will be updated from Firestore
    this.userId = null;
    this.listingId = null;
    this.loggedInUserId = null;
    this.startDateInput = null;
    this.endDateInput = null;
    this.priceDisplay = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
      this.getUserAndListingIdsFromURL();
      this.setupAuthListener();
      this.fetchPriceFromFirestore();
      this.setupElements();
      this.setupEventListeners();
      this.setupFormSubmission();
    });
  }

  setupElements() {
    this.startDateInput = document.getElementById('startDate');
    this.endDateInput = document.getElementById('endDate');
    this.priceDisplay = document.getElementById('price');
    
    // If elements don't exist yet, try again after a short delay
    if (!this.startDateInput || !this.endDateInput || !this.priceDisplay) {
      setTimeout(() => this.setupElements(), 500);
      return;
    }
  }

  setupEventListeners() {
    if (!this.startDateInput || !this.endDateInput) return;

    // Listen for date changes
    this.startDateInput.addEventListener('change', () => this.calculatePrice());
    this.endDateInput.addEventListener('change', () => this.calculatePrice());
    
    // Also listen for flatpickr events if available
    if (window.flatpickr) {
      // Setup flatpickr change listeners
      const startPicker = this.startDateInput._flatpickr;
      const endPicker = this.endDateInput._flatpickr;
      
      if (startPicker) {
        startPicker.config.onChange.push(() => this.calculatePrice());
      }
      if (endPicker) {
        endPicker.config.onChange.push(() => this.calculatePrice());
      }
    }
  }

  calculatePrice() {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    if (!startDate || !endDate) {
      this.updatePriceDisplay(this.dailyRate);
      return;
    }

    const days = this.calculateDaysBetween(startDate, endDate);
    const totalPrice = days * this.dailyRate;
    
    this.updatePriceDisplay(totalPrice);
  }

  getStartDate() {
    if (!this.startDateInput) return null;
    
    // Try to get date from flatpickr first
    if (this.startDateInput._flatpickr && this.startDateInput._flatpickr.selectedDates.length > 0) {
      return this.startDateInput._flatpickr.selectedDates[0];
    }
    
    // Fallback to input value
    const value = this.startDateInput.value;
    return value ? new Date(value) : null;
  }

  getEndDate() {
    if (!this.endDateInput) return null;
    
    // Try to get date from flatpickr first
    if (this.endDateInput._flatpickr && this.endDateInput._flatpickr.selectedDates.length > 0) {
      return this.endDateInput._flatpickr.selectedDates[0];
    }
    
    // Fallback to input value
    const value = this.endDateInput.value;
    return value ? new Date(value) : null;
  }

  calculateDaysBetween(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    
    // Ensure end date is after start date
    if (endDate < startDate) return 0;
    
    // Calculate difference in milliseconds
    const timeDifference = endDate.getTime() - startDate.getTime();
    
    // Convert to days (add 1 to include both start and end dates)
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
    
    return Math.max(1, daysDifference); // Minimum 1 day
  }

  updatePriceDisplay(price) {
    if (this.priceDisplay) {
      this.priceDisplay.textContent = price.toFixed(0);
    }
  }

  updatePriceDisplayInModal(price) {
    // Find the price display in renterDetailsModal
    const modalPriceDisplay = document.querySelector('#renterDetailsModal #price');
    if (modalPriceDisplay) {
      modalPriceDisplay.textContent = price.toFixed(0);
    }
    
    // Also update the stored priceDisplay reference if it exists
    if (this.priceDisplay) {
      this.priceDisplay.textContent = price.toFixed(0);
    }
  }

  setupAuthListener() {
    // Initialize Firebase Auth
    const auth = getAuth();
    
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.loggedInUserId = user.uid;
        console.log('Logged in user ID:', this.loggedInUserId);
      } else {
        console.warn('No user is logged in');
      }
    });
  }

  setupFormSubmission() {
    // Find the confirm button in the modal
    const confirmButton = document.querySelector('#renterDetailsModal button[type="button"]:not([aria-label="Close"])');
    
    if (confirmButton) {
      confirmButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.submitRental();
      });
    }
  }

  async submitRental() {
    if (!this.loggedInUserId) {
      alert('Please log in to submit a rental request');
      return;
    }

    try {
      const formData = this.getFormData();
      const rentalDetails = this.getRentalDetails();
      
      if (!this.validateFormData(formData)) {
        return;
      }

      // Fetch listing data to get name and images using view-details.js approach
      let listingName = 'Unnamed Listing';
      let listingImage = '';
      
      try {
        // Fetch the listing document from the owner's listings subcollection
        const listingDoc = await getDoc(doc(db, 'users', this.userId, 'listings', this.listingId));
        
        if (listingDoc.exists()) {
          const listingData = listingDoc.data();
          listingName = listingData.name || listingData.title || 'Unnamed Listing';
          
          // Handle both 'images' and 'image' fields as seen in view-details.js
          const images = Array.isArray(listingData.images) ? listingData.images : 
                        (Array.isArray(listingData.image) ? listingData.image : []);
          listingImage = images.length > 0 ? images[0] : '';
        } else {
          console.warn('Listing not found:', this.listingId, 'for user:', this.userId);
        }
      } catch (error) {
        console.error('Error fetching listing data:', error);
      }

      const rentalData = {
        ...formData,
        ...rentalDetails,
        ownerUserId: this.userId, // The owner of the listing
        renterUserId: this.loggedInUserId, // The logged-in user
        listingTitle: listingName,
        listingImage: listingImage,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Query users collection to find document with matching id field
      const usersQuery = query(
        collection(db, 'users'),
        where('uid', '==', this.loggedInUserId)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        throw new Error('User document not found');
      }
      
      // Get the first matching document (should be only one)
      const userDoc = querySnapshot.docs[0];
      const userDocId = userDoc.id;
      
      // Save to rentals subcollection of the found user document
      const rentalRef = await addDoc(
        collection(db, 'users', userDocId, 'rentals'),
        rentalData
      );

      console.log('Rental submitted successfully:', rentalRef.id);
      alert('Rental request submitted successfully!');
      
      // Close the modal
      const modal = document.getElementById('renterDetailsModal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }

    } catch (error) {
      console.error('Error submitting rental:', error);
      alert('Error submitting rental request. Please try again.');
    }
  }

  getFormData() {
    const modal = document.getElementById('renterDetailsModal');
    if (!modal) return null;

    // Get form inputs
    const nameInput = modal.querySelector('input[placeholder="Ex. John"]');
    const startDateInput = modal.querySelector('#startDate');
    const endDateInput = modal.querySelector('#endDate');
    
    // Extract full name
    let fullName = '';
    if (nameInput && nameInput.value) {
      fullName = nameInput.value.trim();
    }

    return {
      fullName,
      startDate: startDateInput ? startDateInput.value : '',
      endDate: endDateInput ? endDateInput.value : ''
    };
  }

  validateFormData(formData) {
    if (!formData.fullName) {
      alert('Please enter your name');
      return false;
    }
    
    if (!formData.startDate || !formData.endDate) {
      alert('Please select both start and end dates');
      return false;
    }

    const rentalDetails = this.getRentalDetails();
    if (!rentalDetails.startDate || !rentalDetails.endDate) {
      alert('Please select valid rental dates');
      return false;
    }

    return true;
  }

  setDailyRate(rate) {
    this.dailyRate = rate;
    this.calculatePrice(); // Recalculate with new rate
  }

  getUserAndListingIdsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Get userId from URL parameters
    this.userId = urlParams.get('userId') || urlParams.get('sellerId') || urlParams.get('uid');
    
    // Get listingId from URL parameters
    this.listingId = urlParams.get('listingId') || urlParams.get('id') || urlParams.get('listing');
    
    // Fallback: try to extract from pathname
    if (!this.userId || !this.listingId) {
      const pathParts = window.location.pathname.split('/');
      
      // Try to extract userId and listingId from path like /user/listing
      if (pathParts.length >= 3) {
        const lastPart = pathParts[pathParts.length - 1];
        const secondLastPart = pathParts[pathParts.length - 2];
        
        if (lastPart && lastPart !== 'details.html') {
          this.listingId = lastPart.replace('.html', '');
        }
        
        if (secondLastPart && secondLastPart !== 'details.html') {
          this.userId = secondLastPart;
        }
      }
    }
    
    return { userId: this.userId, listingId: this.listingId };
  }

  async fetchPriceFromFirestore() {
    if (!this.userId || !this.listingId) {
      console.warn('Missing userId or listingId from URL');
      console.warn('userId:', this.userId, 'listingId:', this.listingId);
      return;
    }

    try {
      // Fetch from user's listings subcollection
      const listingDoc = await getDoc(doc(db, 'users', this.userId, 'listings', this.listingId));
      
      if (listingDoc.exists()) {
        const listingData = listingDoc.data();
        
        // Try to get price from common fields
        const price = listingData.price || 
                     listingData.dailyRate || 
                     listingData.rentPrice || 
                     listingData.costPerDay ||
                     listingData.rate;
        
        if (price && !isNaN(price)) {
          this.dailyRate = parseFloat(price);
          
          // Update the price display in the renterDetailsModal
          this.updatePriceDisplayInModal(this.dailyRate);
          
          // Recalculate with new price
          this.calculatePrice();
          
          console.log(`Successfully fetched price: ₱${this.dailyRate} for user ${this.userId}, listing ${this.listingId}`);
        } else {
          console.warn('No valid price found in listing data for user:', this.userId, 'listing:', this.listingId);
        }
      } else {
        console.warn(`Listing with ID ${this.listingId} not found for user ${this.userId}`);
      }
    } catch (error) {
      console.error('Error fetching price from Firestore:', error);
    }
  }

  // Public method to get rental details
  getRentalDetails() {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    const days = startDate && endDate ? this.calculateDaysBetween(startDate, endDate) : 0;
    const totalPrice = days * this.dailyRate;

    return {
      userId: this.userId,
      listingId: this.listingId,
      startDate,
      endDate,
      days,
      dailyRate: this.dailyRate,
      totalPrice
    };
  }
}

// Initialize rental calculator
const rentalCalculator = new RentalCalculator();

// Export for use in other modules
window.rentalCalculator = rentalCalculator;

