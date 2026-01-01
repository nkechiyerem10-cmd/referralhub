// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyACwTfO-Ri9E3JrzAlcAunl5yYPJCYZU4I",
    authDomain: "referralhub-8d29d.firebaseapp.com",
    projectId: "referralhub-8d29d",
    storageBucket: "referralhub-8d29d.firebasestorage.app",
    messagingSenderId: "784103835168",
    appId: "1:784103835168:web:baa4015f498028bb5bde45"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('Browser does not support offline persistence.');
        }
    });

// ==================== UTILITY FUNCTIONS ====================

// Email validation
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Name validation
function isValidName(name) {
    return name && name.trim().length >= 2;
}

// Password validation
function isValidPassword(password) {
    return password && password.length >= 6;
}

// User-friendly error messages
function getReadableError(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled. Contact support.',
        'auth/weak-password': 'Password must be at least 6 characters long.',
        'auth/user-disabled': 'This account has been disabled. Contact support.',
        'auth/user-not-found': 'No account found with this email. Please sign up first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
        'auth/invalid-credential': 'Invalid login credentials. Please check and try again.',
        'permission-denied': 'You do not have permission to perform this action.',
        'unavailable': 'Service temporarily unavailable. Please try again.',
        'not-found': 'Data not found.',
        'already-exists': 'This record already exists.'
    };
    
    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Show error message
function showError(element, message) {
    if (!element) return;
    element.textContent = `⚠ ${message}`;
    element.classList.add('show');
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
        element.classList.remove('show');
    }, 6000);
}

// Clear messages
function clearMessages(...elements) {
    elements.forEach(el => {
        if (el) {
            el.classList.remove('show');
            el.textContent = '';
        }
    });
}

// Set button loading state
function setButtonLoading(button, textElement, isLoading, loadingText = 'Processing...', defaultText = 'Submit') {
    if (!button || !textElement) return;
    
    button.disabled = isLoading;
    if (isLoading) {
        textElement.innerHTML = `${loadingText} <span class="spinner"></span>`;
    } else {
        textElement.textContent = defaultText;
    }
}

// Debounce function to prevent rapid form submissions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== AUTH PAGE LOGIC ====================

// Get auth page elements
const authForm = document.getElementById('authForm');
const authBtn = document.getElementById('authBtn');
const btnText = document.getElementById('btnText');
const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess');
const signupToggle = document.getElementById('signupToggle');
const loginToggle = document.getElementById('loginToggle');
const nameGroup = document.getElementById('nameGroup');

// Track auth mode
let isSignupMode = true;

// Auth page initialization
if (authForm && authBtn) {
    
    // Toggle between signup and login
    if (signupToggle && loginToggle && nameGroup) {
        signupToggle.addEventListener('click', () => {
            isSignupMode = true;
            signupToggle.classList.add('active');
            loginToggle.classList.remove('active');
            nameGroup.style.display = 'block';
            document.getElementById('fullName').required = true;
            if (btnText) btnText.textContent = 'Create Account';
            clearMessages(authError);
        });

        loginToggle.addEventListener('click', () => {
            isSignupMode = false;
            loginToggle.classList.add('active');
            signupToggle.classList.remove('active');
            nameGroup.style.display = 'none';
            document.getElementById('fullName').required = false;
            if (btnText) btnText.textContent = 'Login';
            clearMessages(authError);
        });
    }

    // Clear errors on input
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const fullNameInput = document.getElementById('fullName');

    [emailInput, passwordInput, fullNameInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => clearMessages(authError));
        }
    });

    // Handle form submission with debouncing
    const handleAuth = debounce(async (e) => {
        e.preventDefault();
        
        // Clear previous messages
        clearMessages(authError, authSuccess);

        // Get form values
        const email = emailInput?.value.trim().toLowerCase();
        const password = passwordInput?.value.trim();
        const fullName = fullNameInput?.value.trim();

        // Validation
        if (isSignupMode && !isValidName(fullName)) {
            showError(authError, 'Please enter your full name (at least 2 characters).');
            fullNameInput?.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showError(authError, 'Please enter a valid email address.');
            emailInput?.focus();
            return;
        }

        if (!isValidPassword(password)) {
            showError(authError, 'Password must be at least 6 characters long.');
            passwordInput?.focus();
            return;
        }

        // Set loading state
        const defaultText = isSignupMode ? 'Create Account' : 'Login';
        setButtonLoading(authBtn, btnText, true, isSignupMode ? 'Creating account...' : 'Logging in...', defaultText);

        try {
            let userCredential;

            if (isSignupMode) {
                // Sign up new user
                userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // Create user document in Firestore
                await db.collection('users').doc(userCredential.user.uid).set({
                    fullName: fullName,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    totalReferrals: 0,
                    totalEarnings: 0,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log('User registered:', userCredential.user.uid);
            } else {
                // Login existing user
                userCredential = await auth.signInWithEmailAndPassword(email, password);
                
                // Update last active timestamp
                await db.collection('users').doc(userCredential.user.uid).update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => console.warn('Could not update lastActive:', err));

                console.log('User logged in:', userCredential.user.uid);
            }

            // Show success message
            if (authForm && authSuccess) {
                authForm.style.display = 'none';
                authSuccess.classList.add('show');
            }

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Authentication error:', error);
            
            // Show user-friendly error message
            const errorMessage = getReadableError(error.code);
            showError(authError, errorMessage);
            
            // Reset button state
            setButtonLoading(authBtn, btnText, false, '', isSignupMode ? 'Create Account' : 'Login');
        }
    }, 500); // 500ms debounce

    authForm.addEventListener('submit', handleAuth);

    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });
}

// ==================== DASHBOARD LOGIC ====================

// Get dashboard elements
const logoutBtn = document.getElementById('logoutBtn');
const userNameEl = document.getElementById('userName');
const userAvatarEl = document.getElementById('userAvatar');
const totalReferralsEl = document.getElementById('totalReferrals');
const totalEarningsEl = document.getElementById('totalEarnings');
const monthlyActiveEl = document.getElementById('monthlyActive');
const refForm = document.getElementById('refForm');
const addRefBtn = document.getElementById('addRefBtn');
const addBtnText = document.getElementById('addBtnText');
const refError = document.getElementById('refError');
const successBanner = document.getElementById('successBanner');
const referralList = document.getElementById('referralList');

// Track current user and cleanup functions
let currentUser = null;
let unsubscribeReferrals = null;

// Dashboard initialization
if (logoutBtn) {
    
    // Handle logout
    logoutBtn.addEventListener('click', async () => {
        try {
            // Cleanup listeners
            if (unsubscribeReferrals) {
                unsubscribeReferrals();
            }
            
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout. Please try again.');
        }
    });

    // Auth state change handler
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // User not logged in, redirect to auth page
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        console.log('Dashboard loaded for user:', user.uid);

        // Load user data and referrals
        await loadUserData();
        loadReferrals();
    });
}

// Load user profile data
async function loadUserData() {
    if (!currentUser) return;

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const firstName = userData.fullName?.split(' ')[0] || 'User';

            // Update UI elements
            if (userNameEl) userNameEl.textContent = firstName;
            if (userAvatarEl) userAvatarEl.textContent = firstName.charAt(0).toUpperCase();
            if (totalReferralsEl) totalReferralsEl.textContent = userData.totalReferrals || 0;
            if (totalEarningsEl) totalEarningsEl.textContent = `₦${(userData.totalEarnings || 0).toLocaleString()}`;

            // Calculate monthly active referrals
            if (monthlyActiveEl) {
                const monthStart = new Date();
                monthStart.setDate(1);
                monthStart.setHours(0, 0, 0, 0);

                const monthlySnapshot = await db.collection('referrals')
                    .where('userId', '==', currentUser.uid)
                    .where('createdAt', '>=', monthStart)
                    .get();

                monthlyActiveEl.textContent = monthlySnapshot.size;
            }
        } else {
            console.warn('User document does not exist in Firestore');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        
        // Fallback to email-based name
        if (currentUser.email && userNameEl) {
            const emailName = currentUser.email.split('@')[0];
            userNameEl.textContent = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
    }
}

// Load referrals with real-time updates
function loadReferrals() {
    if (!currentUser || !referralList) return;

    // Show loading skeleton
    referralList.innerHTML = `
        <div class="loading-skeleton"></div>
        <div class="loading-skeleton"></div>
        <div class="loading-skeleton"></div>
    `;

    // Setup real-time listener
    unsubscribeReferrals = db.collection('referrals')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(
            (snapshot) => {
                if (snapshot.empty) {
                    referralList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📭</div>
                            <h3>No referrals yet</h3>
                            <p>Add your first referral above to get started!</p>
                        </div>
                    `;
                    return;
                }

                referralList.innerHTML = '';

                snapshot.forEach((doc) => {
                    const ref = doc.data();
                    const initial = ref.name?.charAt(0).toUpperCase() || '?';
                    const statusClass = ref.status === 'active' ? 'status-active' : 'status-pending';
                    const statusText = ref.status === 'active' ? 'Active' : 'Pending';

                    const refItem = document.createElement('div');
                    refItem.className = 'referral-item';
                    refItem.innerHTML = `
                        <div class="referral-info">
                            <div class="referral-avatar">${initial}</div>
                            <div class="referral-details">
                                <h4>${ref.name || 'Unknown'}</h4>
                                <p>${ref.email || 'No email'}</p>
                            </div>
                        </div>
                        <div class="referral-status ${statusClass}">${statusText}</div>
                    `;

                    referralList.appendChild(refItem);
                });
            },
            (error) => {
                console.error('Error loading referrals:', error);
                referralList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <h3>Error loading referrals</h3>
                        <p>${getReadableError(error.code)}</p>
                    </div>
                `;
            }
        );
}

// Handle add referral form
if (refForm && addRefBtn) {
    
    // Clear errors on input
    const refNameInput = document.getElementById('refName');
    const refEmailInput = document.getElementById('refEmail');

    [refNameInput, refEmailInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => clearMessages(refError, successBanner));
        }
    });

    // Show success banner
    function showSuccess() {
        if (successBanner) {
            successBanner.classList.add('show');
            setTimeout(() => successBanner.classList.remove('show'), 4000);
        }
    }

    // Handle form submission with debouncing
    const handleAddReferral = debounce(async (e) => {
        e.preventDefault();

        // Clear previous messages
        clearMessages(refError, successBanner);

        // Get form values
        const name = refNameInput?.value.trim();
        const email = refEmailInput?.value.trim().toLowerCase();

        // Validation
        if (!isValidName(name)) {
            showError(refError, 'Please enter the referral\'s full name (at least 2 characters).');
            refNameInput?.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showError(refError, 'Please enter a valid email address.');
            refEmailInput?.focus();
            return;
        }

        // Prevent self-referral
        if (email === currentUser.email) {
            showError(refError, 'You cannot refer yourself!');
            refEmailInput?.focus();
            return;
        }

        // Set loading state
        setButtonLoading(addRefBtn, addBtnText, true, 'Adding referral...', 'Add Referral');

        try {
            // Check for duplicate email (from this user)
            const duplicateCheck = await db.collection('referrals')
                .where('userId', '==', currentUser.uid)
                .where('email', '==', email)
                .limit(1)
                .get();

            if (!duplicateCheck.empty) {
                throw new Error('You have already referred this email address.');
            }

            // Add referral to Firestore
            await db.collection('referrals').add({
                userId: currentUser.uid,
                name: name,
                email: email,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update user's total referrals count
            await db.collection('users').doc(currentUser.uid).update({
                totalReferrals: firebase.firestore.FieldValue.increment(1)
            });

            // Reset form
            refForm.reset();
            
            // Show success message
            showSuccess();

            // Reload user data to update stats
            await loadUserData();

            console.log('Referral added successfully');

        } catch (error) {
            console.error('Error adding referral:', error);
            
            // Show user-friendly error
            const errorMessage = error.message || getReadableError(error.code);
            showError(refError, errorMessage);
        } finally {
            // Reset button state
            setButtonLoading(addRefBtn, addBtnText, false, '', 'Add Referral');
        }
    }, 500); // 500ms debounce

    refForm.addEventListener('submit', handleAddReferral);
}

// ==================== GLOBAL ERROR HANDLER ====================

// Handle network errors globally
window.addEventListener('online', () => {
    console.log('Back online');
    location.reload(); // Reload to sync data
});

window.addEventListener('offline', () => {
    console.warn('You are offline. Some features may not work.');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeReferrals) {
        unsubscribeReferrals();
    }
});
