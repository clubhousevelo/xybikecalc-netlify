// Firebase Authentication Configuration
// This file handles all Firebase authentication functionality

// Firebase configuration object - you'll need to replace these values with your own
const firebaseConfig = {
    apiKey: "AIzaSyCsde9TK1Jyxnscq01Sgvny_PnPg6rXZkY",
    authDomain: "xy-bike-calc-2e94b.firebaseapp.com",
    projectId: "xy-bike-calc-2e94b",
    storageBucket: "xy-bike-calc-2e94b.firebasestorage.app",
    messagingSenderId: "831215730499",
    appId: "1:831215730499:web:fc6e2b4aba2383555479f6",
    measurementId: "G-H1TXBTLXDW"
};

// Initialize Firebase
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get auth and firestore instances
  const auth = firebase.auth();
  const db = firebase.firestore ? firebase.firestore() : null;
  
  // Set up UI event listeners once the DOM is fully loaded
  setupAuthUI();
  
  // Check auth state and update UI accordingly
  auth.onAuthStateChanged(user => {
    updateUIForAuthState(user);
    
    // Check subscription role and redirect if necessary
    if (user && window.location.pathname.endsWith('/xy-position-calculator/')) {
      checkSubscriptionAndRedirect(user.uid);
    }
    
    // If user is logged in and we're on the main calculator page, load saved data
    if (user && window.location.pathname.includes('/xy-position-calculator/') && typeof BikeCalculator !== 'undefined') {
      loadUserData(user.uid);
    }
  });
  
  /*  DISABLED FREE/BASIC/AUTO FOR NOW **************************

  // Function to check subscription role and redirect
  function checkSubscriptionAndRedirect(userId) {
    if (!db) return;
    
    // Get the current path
    const currentPath = window.location.pathname;
    
    // If we're already in a role-specific directory, no need to redirect
    if (currentPath.includes('/xy-position-calculator/free/') || currentPath.includes('/xy-position-calculator/basic/') || currentPath.includes('/xy-position-calculator/pro/')) {
      return;
    }
    
    db.collection('users').doc(userId).get()
      .then(doc => {
        if (!doc.exists) {
          console.log('No user document found');
          window.location.href = '/xy-position-calculator/free/';
          return;
        }
        
        const userData = doc.data();
        const role = userData.firebaseRole || 'free';
        
        // Redirect based on role
        if (role === 'pro') {
          window.location.href = '/xy-position-calculator/pro/';
        } else if (role === 'basic') {
          window.location.href = '/xy-position-calculator/basic/';
        } else {
          // Default to free tier
          window.location.href = '/xy-position-calculator/free/';
        }
      })
      .catch(error => {
        console.error('Error checking subscription:', error);
        // On error, default to free tier
        window.location.href = '/xy-position-calculator/free/';
      });
  }
  */

  // Function to load user data from Firestore
  function loadUserData(userId) {
    if (!db) return;
    
    db.collection('users').doc(userId).collection('bikeFits').get()
      .then(snapshot => {
        if (snapshot.empty) {
          console.log('No saved bike fits found');
          return;
        }
        
        // If we have a global bike calculator instance, populate it with saved data
        if (window.bikeCalculatorInstance) {
          const savedFits = [];
          snapshot.forEach(doc => {
            savedFits.push(doc.data());
          });
          
          // Sort by date created
          savedFits.sort((a, b) => b.createdAt - a.createdAt);
          
          // Load the most recent fit
          if (savedFits.length > 0) {
            window.bikeCalculatorInstance.loadSavedFit(savedFits[0]);
          }
        }
      })
      .catch(error => {
        console.error('Error loading user data:', error);
      });
  }
  
  // Function to save user data to Firestore
  window.saveUserData = function(data) {
    const user = auth.currentUser;
    if (!user || !db) return Promise.reject('User not logged in or Firestore not available');
    
    // Add timestamp and user info
    const fitData = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      userId: user.uid
    };
    
    // Save to Firestore
    return db.collection('users').doc(user.uid).collection('bikeFits').add(fitData)
      .then(docRef => {
        console.log('Bike fit saved with ID:', docRef.id);
        return docRef.id;
      })
      .catch(error => {
        console.error('Error saving bike fit:', error);
        throw error;
      });
  };
});

// Set up UI event listeners for auth-related elements
function setupAuthUI() {
  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  // Logout buttons - both desktop and mobile
  const logoutButtons = document.querySelectorAll('#logout-button, #logout-button-mobile');
  logoutButtons.forEach(button => {
    button.addEventListener('click', handleLogout);
  });
  
  // Profile link in navigation
  const userDisplayElements = document.querySelectorAll('.user-display');
  userDisplayElements.forEach(el => {
    el.addEventListener('click', function() {
      window.location.href = '/profile/';
    });
    el.style.cursor = 'pointer';
  });
}

// Handle login form submission
function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorElement = document.getElementById('login-error');
  
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Clear form and any error messages
      e.target.reset();
      if (errorElement) errorElement.textContent = '';
      
      
      // Get the user's role from Firestore and redirect accordingly
      const user = userCredential.user;
      if (firebase.firestore) {
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).get()
          .then(doc => {
            if (doc.exists) {
              const userData = doc.data();
              const role = userData.firebaseRole || 'free';
              
              // Redirect based on role
              if (role === 'pro') {
                window.location.href = '/xy-position-calculator/pro/';
              } else if (role === 'basic') {
                window.location.href = '/xy-position-calculator/';
              } else {
                window.location.href = '/xy-position-calculator/';
              }
            } else {
              // User document doesn't exist, redirect to free tier
              window.location.href = '/xy-position-calculator/';
            }
          })
          .catch(error => {
            console.error('Error getting user document:', error);
            // Default to free tier on error
            window.location.href = '/xy-position-calculator/';
          });
      } else {
        // No Firestore, redirect to default index
        window.location.href = '/xy-position-calculator/';
      }
      
    })
    .catch((error) => {
      // Display error message
      if (errorElement) {
        errorElement.textContent = error.message;
      } else {
        console.error('Login error:', error.message);
      }
    });
}

// Handle signup form submission
function handleSignup(e) {
  e.preventDefault();
  
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const errorElement = document.getElementById('signup-error');
  
  // Check if passwords match
  if (password !== confirmPassword) {
    if (errorElement) errorElement.textContent = 'Passwords do not match';
    return;
  }
  
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Create user document in Firestore
      if (firebase.firestore) {
        const db = firebase.firestore();
        const user = userCredential.user;
        
        // Update the user profile with the name
        user.updateProfile({
          displayName: name
        });
        
        return db.collection('users').doc(user.uid).set({
          displayName: name,
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          // Clear form and any error messages
          e.target.reset();
          if (errorElement) errorElement.textContent = '';
          
          // Redirect to free tier after signup
          window.location.href = '/xy-position-calculator/';
        });
      } else {
        // Clear form and any error messages
        e.target.reset();
        if (errorElement) errorElement.textContent = '';
        
        // Redirect to default index
        window.location.href = '/xy-position-calculator/';
      }
    })
    .catch((error) => {
      // Display error message
      if (errorElement) {
        errorElement.textContent = error.message;
      } else {
        console.error('Signup error:', error.message);
      }
    });
}

// Handle logout button click
function handleLogout() {
  firebase.auth().signOut()
    .then(() => {
      // Clear all saved data from localStorage
      localStorage.removeItem('xyCalculatorData');
      sessionStorage.removeItem('xyCalculatorSession');

      // You may want to keep certain settings like dark mode preference
      const darkModePreference = localStorage.getItem('theme');
      const tosAcknowledged = localStorage.getItem('tosAcknowledged');
      const upgradeNoticeAcknowledged = localStorage.getItem('upgradeNoticeAcknowledged');

      // Clear all localStorage
      localStorage.clear();

      // Restore settings that should persist across sessions
      if (darkModePreference) localStorage.setItem('theme', darkModePreference);
      if (tosAcknowledged) localStorage.setItem('tosAcknowledged', tosAcknowledged);
      if (upgradeNoticeAcknowledged) localStorage.setItem('upgradeNoticeAcknowledged', upgradeNoticeAcknowledged);

      // Redirect to login page or update UI
      window.location.href = '/login/';
    })
    .catch((error) => {
      console.error('Logout error:', error);
    });
}

// Update UI based on authentication state
function updateUIForAuthState(user) {
  const authElements = document.querySelectorAll('.auth-dependent');
  const nonAuthElements = document.querySelectorAll('.non-auth-dependent');
  const userDisplayElements = document.querySelectorAll('.user-display');
  
  if (user) {
    // User is signed in
    authElements.forEach(el => el.style.display = 'block');
    nonAuthElements.forEach(el => el.style.display = 'none');
    
    // Update elements that display user info
    userDisplayElements.forEach(el => {
      el.textContent = user.displayName || user.email;
    });
    
    // If we're on the calculator page, enable save functionality
    if (window.location.pathname.includes('/xy-position-calculator/') && window.bikeCalculatorInstance) {
      const saveButton = document.getElementById('saveButton');
      if (saveButton) {
        saveButton.disabled = false;
        
        // Add event listener for save button if not already added
        if (!saveButton.hasAttribute('data-auth-listener')) {
          saveButton.setAttribute('data-auth-listener', 'true');
          saveButton.addEventListener('click', function() {
            const clientName = document.getElementById('clientName').value;
            if (!clientName) {
              alert('Please enter a client name before saving');
              return;
            }
            
            // Get data from calculator
            const data = window.bikeCalculatorInstance.getSaveData();
            
            // Save to Firestore
            window.saveUserData(data)
              .then(() => {
                alert('Bike fit saved successfully!');
              })
              .catch(error => {
                alert('Error saving bike fit: ' + error);
              });
          });
        }
      }
    }
  } else {
    // User is signed out
    authElements.forEach(el => el.style.display = 'none');
    nonAuthElements.forEach(el => el.style.display = 'block');
    
    // Clear user info
    userDisplayElements.forEach(el => {
      el.textContent = '';
    });
    
    // If we're on the calculator page, disable save functionality
    if (window.location.pathname.includes('/xy-position-calculator/')) {
      const saveButton = document.getElementById('saveButton');
      if (saveButton) {
        saveButton.disabled = true;
      }
    }
  }
} 