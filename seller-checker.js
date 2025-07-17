// Check if user has UID in users collection
const user = firebase.auth().currentUser;
if (user) {
  db.collection('users').doc(user.uid).get()
    .then((doc) => {
      if (doc.exists && doc.data().uid) {
        // User has UID, update the seller hub link
        const sellerHubLink = document.querySelector('a[id="sellerHub"]');
        if (sellerHubLink) {
          // Make sure modal is visible if link is inside one
          const modal = sellerHubLink.closest('.modal');
          if (modal) {
            modal.style.display = 'block';
          }
          sellerHubLink.textContent = 'Go to seller hub';
          sellerHubLink.href = 'seller-listings.html';
          console.log('Seller hub link updated successfully');
        } else {
          console.warn('Could not find sellerHub link element');
        }
      }
    })
    .catch((error) => {
      console.error('Error checking user UID:', error);
    });
}