
const firebaseConfig = {
    apiKey: "AIzaSyD24pVQfAdnLizfcDt7WMi_YHG8cfEweGU",
    authDomain: "vrcapstonrit213123.firebaseapp.com",
    projectId: "vrcapstonrit213123",
    storageBucket: "vrcapstonrit213123.firebasestorage.app",
    messagingSenderId: "560615276492",
    appId: "1:560615276492:web:4b44fe0a89cbb05afa2769",
    measurementId: "G-M22TYYTYB0"
}

const avatarButton = document.querySelector(".avatar-circle");
if (avatarButton) {
  avatarButton.onclick = function () {
    const modal = document.getElementById("avatarModal");
    const frame = document.getElementById("avatarFrame");

    if (modal && frame) {
      frame.src = "https://studio.d-id.com/agents/share?id=v2_agt_mQjQX0oi&utm_source=copy&key=WjI5dloyeGxMVzloZFhSb01ud3hNRFkzTURZek56TTJPVEUwTmpFeE5UZzVOekU2WDBkVlNpMDNWV3RwVTIxTGJXZDBMVVpJWVdacA==";
      modal.style.display = "flex";
    }
  };
}

  function closeAvatarVideo() {
    const modal = document.getElementById("avatarModal");
    const frame = document.getElementById("avatarFrame");

    modal.style.display = "none";

    frame.src = "";
  }

let auth, db;
let firebaseInitialized = false;

function initializeFirebase() {
    if (firebaseInitialized) {
        return;
    }
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded yet. Waiting...');
        setTimeout(initializeFirebase, 100);
        return;
    }
    if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.warn('Firebase not configured. Please update firebaseConfig in script.js with your Firebase project credentials.');
        return;
    }
    
    try {
        let app;
        try {
            app = firebase.app();
            console.log('Firebase app already initialized');
        } catch (e) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully');
        }
        
        auth = firebase.auth();
        db = firebase.firestore();
        firebaseInitialized = true;
        
    } catch (error) {
        if (error.code === 'app/duplicate-app') {
            console.log('Firebase app already exists, using existing instance');
            auth = firebase.auth();
            db = firebase.firestore();
            firebaseInitialized = true;
        } else if (error.code === 'auth/configuration-not-found') {
            console.error('Firebase configuration error. Please check your Firebase config:', error);
            console.error('Make sure your Firebase project is properly set up and the config values are correct.');
            console.error('Also ensure that Authentication is enabled in Firebase Console > Authentication > Sign-in method.');
        } else {
            console.error('Firebase initialization error:', error);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    initializeFirebase();
}

window.getFirebaseInstances = function() {
    return { auth, db, firebaseInitialized };
};
let isSignUpMode = false;
let currentUserData = null;
function setupAuthStateListener() {
    if (typeof auth !== 'undefined' && auth) {
        auth.onAuthStateChanged(async (user) => {
        if (user) {
            document.getElementById('login-link').classList.add('hidden');
            document.getElementById('logout-link').classList.remove('hidden');
            document.getElementById('profile-link').classList.remove('hidden');
        
            if (typeof db !== 'undefined') {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    
                    // Check if document exists (compat with both v8 and v9+ syntax)
                    const docExists = userDoc.exists ? (typeof userDoc.exists === 'function' ? userDoc.exists() : userDoc.exists) : (userDoc.data() !== undefined);
                    
                    if (docExists) {
                        const userData = userDoc.data();
                        currentUserData = {
                            ...userData,
                            email: user.email,
                            uid: user.uid
                        };
                        const userRole = userData.role || 'doctor';

                        // Update profile link text
                        updateProfileLink(userData, user.email);

                        if (userRole === 'doctor') {
                            document.getElementById('doctor-dashboard-link').classList.remove('hidden');
                            document.getElementById('patient-dashboard-link').classList.add('hidden');
                        } else {
                            document.getElementById('patient-dashboard-link').classList.remove('hidden');
                            document.getElementById('doctor-dashboard-link').classList.add('hidden');
                        }
                    } else {
                        // User document doesn't exist, create a basic one
                        const defaultUserData = {
                            email: user.email,
                            role: 'doctor',
                            name: user.email.split('@')[0],
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        await db.collection('users').doc(user.uid).set(defaultUserData);
                        currentUserData = {
                            ...defaultUserData,
                            email: user.email,
                            uid: user.uid
                        };
                        
                        updateProfileLink(defaultUserData, user.email);
                        document.getElementById('doctor-dashboard-link').classList.remove('hidden');
                        document.getElementById('patient-dashboard-link').classList.add('hidden');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
            
            console.log('User signed in:', user.email);
        } else {
            // User is signed out
            currentUserData = null;
            document.getElementById('login-link').classList.remove('hidden');
            document.getElementById('logout-link').classList.add('hidden');
            document.getElementById('profile-link').classList.add('hidden');
            document.getElementById('patient-dashboard-link').classList.add('hidden');
            document.getElementById('doctor-dashboard-link').classList.add('hidden');
        }
    });
    } else {
        // Retry if Firebase not ready yet
        setTimeout(setupAuthStateListener, 200);
    }
}

// Update Profile Link Text
function updateProfileLink(userData, email) {
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        if (userData.role === 'doctor') {
            profileLink.innerHTML = '<i class="fas fa-user-md"></i> Dr. ' + (userData.name || email.split('@')[0]);
        } else {
            profileLink.innerHTML = '<i class="fas fa-user"></i> ' + (userData.name || email.split('@')[0]);
        }
    }
}

// Update Navbar Immediately
function updateNavbarForUser(userData, email) {
    // Hide login link, show logout and profile
    document.getElementById('login-link').classList.add('hidden');
    document.getElementById('logout-link').classList.remove('hidden');
    document.getElementById('profile-link').classList.remove('hidden');
    
    // Update profile link
    updateProfileLink(userData, email);
    
    // Show appropriate dashboard based on role
    const userRole = userData.role || 'doctor';
    if (userRole === 'doctor') {
        document.getElementById('doctor-dashboard-link').classList.remove('hidden');
        document.getElementById('patient-dashboard-link').classList.add('hidden');
    } else {
        document.getElementById('patient-dashboard-link').classList.remove('hidden');
        document.getElementById('doctor-dashboard-link').classList.add('hidden');
    }
}

// Show Notification
function showNotification(message, type = 'success', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
                 type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' :
                 type === 'info' ? '<i class="fas fa-info-circle"></i>' :
                 '<i class="fas fa-bell"></i>';
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, duration);
}

// Show Profile Info
function showProfileInfo(event) {
    event.preventDefault();
    if (!currentUserData) {
        alert('Profile information not available');
        return;
    }

    const prefix = currentUserData.role === 'doctor' ? 'Dr. ' : '';
    const displayName = currentUserData.name || currentUserData.email.split('@')[0];
    
    const profileInfo = `
Profile Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${prefix}${displayName}
Email: ${currentUserData.email}
Role: ${currentUserData.role === 'doctor' ? '<i class="fas fa-user-md"></i> Doctor' : '<i class="fas fa-user"></i> Patient'}
Account Created: ${currentUserData.createdAt ? new Date(currentUserData.createdAt.toDate()).toLocaleDateString() : 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    alert(profileInfo);
}

// Open Auth Modal
document.getElementById('login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal();
});

// Open Auth Modal Function
function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        isSignUpMode = false;
        updateAuthUI();
    }
}

// Close Auth Modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('auth-error').classList.add('hidden');
        // Clear form
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
    }
}

// Toggle between Login and Sign Up
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    updateAuthUI();
}

// Update Auth UI based on mode
function updateAuthUI() {
    const title = document.getElementById('auth-title');
    const button = document.getElementById('auth-button');
    const switchText = document.getElementById('auth-switch');
    const roleSelection = document.getElementById('role-selection');
    
    if (isSignUpMode) {
        title.textContent = 'Doctor Registration';
        button.textContent = 'Register as Doctor';
        switchText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>';
        if (roleSelection) {
            roleSelection.classList.remove('hidden');
            // Ensure doctor is selected
            const doctorRadio = roleSelection.querySelector('input[value="doctor"]');
            if (doctorRadio) doctorRadio.checked = true;
        }
    } else {
        title.textContent = 'Doctor Login';
        button.textContent = 'Login';
        switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Register as Doctor</a>';
        if (roleSelection) roleSelection.classList.add('hidden');
    }
}

// Handle Authentication (Login/Sign Up)
async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorElement = document.getElementById('auth-error');
    
    if (!email || !password) {
        showAuthError('Please fill in all fields');
        return;
    }

    if (typeof auth === 'undefined' || !auth) {
        showAuthError('Firebase not configured. Please update firebaseConfig in script.js with your Firebase credentials.');
        return;
    }

    try {
        
        if (isSignUpMode) {
            // Sign Up - Only doctors can register
            const roleInput = document.querySelector('input[name="user-role"]:checked');
            const userRole = roleInput ? roleInput.value : 'doctor'; // Default to doctor
            
            if (userRole !== 'doctor') {
                showAuthError('Only doctors can register. This system is for managing patient records and VR therapy sessions.');
                return;
            }
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            // Create user profile in Firestore with role
            const userData = {
                email: email,
                role: 'doctor',
                name: email.split('@')[0], // Use email prefix as default name
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                therapySessions: [],
                feedback: [],
                stressHistory: []
            };
            
            await db.collection('users').doc(userId).set(userData);
            
            // Update current user data
            currentUserData = {
                ...userData,
                uid: userId,
                email: email
            };
            
            // Update navbar immediately
            updateNavbarForUser(userData, email);
            
            // Show success notification
            showNotification(
                `Account created successfully! Welcome, Dr. ${userData.name}! You can now manage patient records and VR therapy sessions.`,
                'success',
                5000
            );
            
            showAuthError('Account created successfully!', true);
            
            // Close modal after successful registration
            setTimeout(() => {
                closeAuthModal();
            }, 1500);
            return; // Exit early to avoid the setTimeout at the end
            
        } else {
            // Login
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            // Wait a moment for auth state to update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Fetch user data
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                
                // Check if document exists (compat with both v8 and v9+ syntax)
                const docExists = userDoc.exists ? (typeof userDoc.exists === 'function' ? userDoc.exists() : userDoc.exists) : (userDoc.data() !== undefined);
                
                let userData;
                if (docExists) {
                    userData = userDoc.data();
                } else {
                    // User document doesn't exist, create a basic one
                    userData = {
                        email: email,
                        role: 'doctor',
                        name: email.split('@')[0],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await db.collection('users').doc(userId).set(userData);
                }
                
                // Update current user data
                currentUserData = {
                    ...userData,
                    uid: userId,
                    email: email
                };
                
                // Update navbar immediately
                updateNavbarForUser(userData, email);
                
                // Show success notification
                const prefix = userData.role === 'doctor' ? 'Dr. ' : '';
                const displayName = userData.name || email.split('@')[0];
                showNotification(
                    `Login successful! Welcome back, ${prefix}${displayName}!`,
                    'success',
                    4000
                );
                
            } catch (dbError) {
                console.error('Error fetching user data:', dbError);
                // Still update navbar with basic info
                const basicUserData = {
                    email: email,
                    role: 'doctor',
                    name: email.split('@')[0]
                };
                updateNavbarForUser(basicUserData, email);
                showNotification('Login successful!', 'success', 3000);
            }
            
            showAuthError('Login successful!', true);
            
            // Close modal after successful login
            setTimeout(() => {
                closeAuthModal();
            }, 1500);
        }
    } catch (error) {
        console.error('Auth error:', error);
        let errorMessage = 'Authentication failed. Please try again.';

        // Handle specific Firebase auth errors
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please use at least 6 characters.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address. Please check your email format.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email. Please sign up first or check your email address.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again or use "Forgot Password" if you\'ve forgotten it.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password. Please check your credentials and try again. If you\'ve forgotten your password, you may need to reset it.';
        } else if (error.code === 'auth/invalid-credential' || error.message.includes('invalid-credential')) {
            errorMessage = 'The email or password you entered is incorrect. Please verify your credentials and try again.';
        } else if (error.code === 'auth/configuration-not-found') {
            errorMessage = 'Firebase Authentication is not configured. Please enable Email/Password authentication in Firebase Console > Authentication > Sign-in method.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/password authentication is not enabled. Please enable it in Firebase Console > Authentication > Sign-in method.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed login attempts. Please wait a few minutes before trying again.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled. Please contact support.';
        } else if (error.code === 'auth/credential-already-in-use') {
            errorMessage = 'This credential is already associated with a different account.';
        } else if (error.message) {
            // Check if error message contains credential-related keywords
            if (error.message.includes('credential') || error.message.includes('expired') || error.message.includes('malformed')) {
                errorMessage = 'Authentication failed: Invalid or expired credentials. Please check your email and password, or try logging in again.';
            } else {
                errorMessage = error.message;
            }
        }

        showAuthError(errorMessage);
    }
}

// Show Auth Error
function showAuthError(message, isSuccess = false) {
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    if (isSuccess) {
        errorElement.style.color = '#4A7C59';
    } else {
        errorElement.style.color = '#ff4444';
    }
}

// Handle Logout
async function handleLogout() {
    if (typeof auth !== 'undefined' && auth) {
        try {
            const userName = currentUserData ? (currentUserData.role === 'doctor' ? 'Dr. ' : '') + (currentUserData.name || currentUserData.email.split('@')[0]) : 'User';
            
            await auth.signOut();
            currentUserData = null;

            // Update navbar immediately
            document.getElementById('login-link').classList.remove('hidden');
            document.getElementById('logout-link').classList.add('hidden');
            document.getElementById('profile-link').classList.add('hidden');
            document.getElementById('patient-dashboard-link').classList.add('hidden');
            document.getElementById('doctor-dashboard-link').classList.add('hidden');

            // Show logout notification
            showNotification(`Logged out successfully! Goodbye, ${userName}!`, 'info', 3000);

            console.log('User signed out');
        } catch (error) {
            console.error('Error signing out:', error);
            showNotification('Error signing out. Please try again.', 'error', 4000);
        }
    } else {
        showNotification('Authentication service not available.', 'error', 3000);
    }
}

// Start VR Therapy Session (from environment cards)
function startVRTherapy(environment) {
    selectedEnvironment = environment;
    startVRSetupFlow();
}

// Get Environment Name
function getEnvironmentName(environment) {
    const names = {
        'beach': 'Beach Paradise',
        'forest': 'Forest Sanctuary',
        'mountain': 'Mountain Peak',
        'zen': 'Zen Garden',
        'space': 'Space Observatory'
    };
    return names[environment] || environment;
}

// Log Therapy Session to Firestore
async function logTherapySession(environment) {
    if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
        try {
            const sessionData = {
                environment: environment,
                startTime: firebase.firestore.FieldValue.serverTimestamp(),
                userId: auth.currentUser.uid,
                status: 'started'
            };
            
            await db.collection('therapySessions').add(sessionData);
            
            // Update user's therapy sessions
            await db.collection('users').doc(auth.currentUser.uid).update({
                therapySessions: firebase.firestore.FieldValue.arrayUnion({
                    environment: environment,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                })
            });
        } catch (error) {
            console.error('Error logging therapy session:', error);
        }
    }
}

// Submit Feedback
async function submitFeedback(event) {
    event.preventDefault();
    
    const environment = document.getElementById('feedback-environment').value;
    const rating = document.getElementById('feedback-rating').value;
    const message = document.getElementById('feedback-message').value;
    
    if (!environment || !rating || !message) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
            // Save feedback to Firestore
            const feedbackData = {
                environment: environment,
                rating: parseInt(rating),
                message: message,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('feedback').add(feedbackData);
            
            // Update user's feedback array
            await db.collection('users').doc(auth.currentUser.uid).update({
                feedback: firebase.firestore.FieldValue.arrayUnion({
                    environment: environment,
                    rating: parseInt(rating),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                })
            });
            
            // Show success message
            document.getElementById('feedback-success').classList.remove('hidden');
            document.getElementById('feedback-form').reset();
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                document.getElementById('feedback-success').classList.add('hidden');
            }, 3000);
        } else {
            // If not logged in, still allow feedback but store anonymously
            if (typeof db !== 'undefined') {
                const feedbackData = {
                    environment: environment,
                    rating: parseInt(rating),
                    message: message,
                    userId: 'anonymous',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('feedback').add(feedbackData);
                
                document.getElementById('feedback-success').classList.remove('hidden');
                document.getElementById('feedback-form').reset();
                
                setTimeout(() => {
                    document.getElementById('feedback-success').classList.add('hidden');
                }, 3000);
            } else {
                alert('Feedback system not available. Please configure Firebase.');
            }
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback: ' + error.message);
    }
}

// Stress Prediction Function
async function predictStress() {
    // Get patient details
    const patientName = document.getElementById("patient-name-input").value.trim();
    const patientAge = document.getElementById("patient-age-input").value;
    
    // Get EEG values
    let beta = parseFloat(document.getElementById("beta").value);
    let gamma = parseFloat(document.getElementById("gamma").value);
    let delta = parseFloat(document.getElementById("delta").value);
    let alpha = parseFloat(document.getElementById("alpha").value);
    let theta = parseFloat(document.getElementById("theta").value);

    // Validate patient name
    if (!patientName) {
        alert("Please enter patient name!");
        document.getElementById("patient-name-input").focus();
        return;
    }

    // Validate EEG values
    if (isNaN(beta) || isNaN(gamma) || isNaN(delta) || isNaN(alpha) || isNaN(theta)) {
        alert("Please enter all EEG values!");
        return;
    }

    // Store patient details globally for later use (for non-doctor flow)
    window.currentPatientName = patientName;
    window.currentPatientAge = patientAge ? parseInt(patientAge) : null;
    
    // Also store in the global variables used by doctor flow
    if (!currentPatientName) {
        currentPatientName = patientName;
        currentPatientAge = patientAge ? parseInt(patientAge) : null;
    }

    // Show loading animation
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("result").classList.add("hidden");
    document.getElementById("vr-recommendations").classList.add("hidden");
    
    const btn = document.querySelector(".predict-btn-modern");
    const btnText = btn.querySelector(".btn-text");
    const btnLoader = btn.querySelector(".btn-loader");
    const btnIcon = btn.querySelector(".btn-icon");
    if (btnText) btnText.classList.add("hidden");
    if (btnIcon) btnIcon.classList.add("hidden");
    if (btnLoader) btnLoader.classList.remove("hidden");
    btn.disabled = true;

    try {
        const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beta, gamma, delta, alpha, theta })
        });

        const data = await response.json();
        
        // Hide loading
        document.getElementById("loading").classList.add("hidden");
        if (btnText) btnText.classList.remove("hidden");
        if (btnIcon) btnIcon.classList.remove("hidden");
        if (btnLoader) btnLoader.classList.add("hidden");
        btn.disabled = false;

        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        // Store stress level globally (for both flows)
        window.currentPatientStressLevel = data.prediction;
        if (!currentPatientStressLevel) {
            currentPatientStressLevel = data.prediction;
        }

        // Display stress level result
        displayStressResult(data.prediction);
        
        // Show VR recommendations based on stress level
        showVRRecommendations(data.prediction);
        
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("loading").classList.add("hidden");
        if (btnText) btnText.classList.remove("hidden");
        if (btnIcon) btnIcon.classList.remove("hidden");
        if (btnLoader) btnLoader.classList.add("hidden");
        btn.disabled = false;
        alert("Error connecting to the server. Please try again.");
    }
}

// Display Stress Result with Gamification
function displayStressResult(prediction) {
    const resultDiv = document.getElementById("result");
    const predictionText = document.getElementById("predictionText");
    const stressDescription = document.getElementById("stress-description");
    const stressBar = document.getElementById("stress-bar");
    const patientInfoDisplay = document.getElementById("patient-info-display");
    
    // Display patient information
    if (window.currentPatientName) {
        const ageText = window.currentPatientAge ? `, Age: ${window.currentPatientAge}` : '';
        patientInfoDisplay.textContent = `Patient: ${window.currentPatientName}${ageText}`;
        patientInfoDisplay.style.display = 'block';
        } else {
        patientInfoDisplay.style.display = 'none';
    }
    
    // Map prediction to stress level
    const stressLevels = {
        'Normal': { level: 1, color: '#87C5A4', description: 'Patient has a normal stress level. Great job maintaining balance!' },
        'Mild': { level: 2, color: '#A8D5BA', description: 'Patient has mild stress. Some relaxation techniques would be beneficial.' },
        'Moderate': { level: 3, color: '#FFC107', description: 'Patient has moderate stress. Consider regular VR therapy sessions.' },
        'High': { level: 4, color: '#FF9800', description: 'Patient has high stress levels. VR therapy is highly recommended.' },
        'Severe': { level: 5, color: '#F44336', description: 'Patient has severe stress. Immediate VR therapy intervention is recommended.' }
    };
    
    const stressInfo = stressLevels[prediction] || stressLevels['Moderate'];
    
    predictionText.textContent = `Stress Level: ${prediction}`;
    predictionText.style.color = stressInfo.color;
    stressDescription.textContent = stressInfo.description;
    
    // Animate stress bar
    stressBar.style.width = '0%';
    stressBar.style.backgroundColor = stressInfo.color;
    setTimeout(() => {
        stressBar.style.width = (stressInfo.level * 20) + '%';
    }, 100);
    
    resultDiv.classList.remove("hidden");
    
    // Add celebration animation for low stress
    if (stressInfo.level <= 2) {
        showCelebration();
    }
}

// Show VR Recommendations based on Stress Level
function showVRRecommendations(prediction) {
    const recommendationsSection = document.getElementById("vr-recommendations");
    const recommendationsList = document.getElementById("recommended-environments-list");
    
    // Map stress levels to recommended environments
    const recommendations = {
        'Normal': ['beach', 'zen'],
        'Mild': ['beach', 'forest', 'zen'],
        'Moderate': ['forest', 'mountain', 'zen'],
        'High': ['mountain', 'zen', 'space'],
        'Severe': ['zen', 'space', 'beach']
    };
    
    const recommendedEnvs = recommendations[prediction] || recommendations['Moderate'];
    
    recommendationsList.innerHTML = '';
    
    recommendedEnvs.forEach(env => {
        const envCard = createRecommendationCard(env);
        recommendationsList.appendChild(envCard);
    });
    
    recommendationsSection.classList.remove("hidden");
    
    // Check if user is a doctor and show/hide start VR button
    checkDoctorStatusForVR();
    
    // Animate cards appearing
    setTimeout(() => {
        const cards = recommendationsList.querySelectorAll('.recommended-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'all 0.5s ease';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50);
            }, index * 200);
        });
    }, 100);
}

// Check if user is doctor for VR session access
async function checkDoctorStatusForVR() {
    const doctorBtn = document.getElementById('doctor-start-vr-btn');
    const doctorNote = document.getElementById('doctor-note-info');
    
    if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
        try {
            const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
            const docExists = userDoc.exists ? (typeof userDoc.exists === 'function' ? userDoc.exists() : userDoc.exists) : (userDoc.data() !== undefined);
            if (docExists && userDoc.data().role === 'doctor') {
                if (doctorBtn) doctorBtn.classList.remove('hidden');
                if (doctorNote) doctorNote.classList.add('hidden');
            } else {
                if (doctorBtn) doctorBtn.classList.add('hidden');
                if (doctorNote) doctorNote.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error checking doctor status:', error);
            if (doctorBtn) doctorBtn.classList.add('hidden');
            if (doctorNote) doctorNote.classList.remove('hidden');
        }
    } else {
        if (doctorBtn) doctorBtn.classList.add('hidden');
        if (doctorNote) doctorNote.classList.remove('hidden');
    }
}

// Create Recommendation Card
function createRecommendationCard(environment) {
    const card = document.createElement('div');
    card.className = 'recommended-card';
    
    const envData = {
        'beach': { name: 'Beach Paradise', icon: '<i class="fas fa-umbrella-beach"></i>', desc: 'Calming ocean waves for relaxation' },
        'forest': { name: 'Forest Sanctuary', icon: '<i class="fas fa-tree"></i>', desc: 'Nature sounds for mindfulness' },
        'mountain': { name: 'Mountain Peak', icon: '<i class="fas fa-mountain"></i>', desc: 'Breathtaking views for perspective' },
        'zen': { name: 'Zen Garden', icon: '<i class="fas fa-leaf"></i>', desc: 'Deep relaxation and focus' },
        'space': { name: 'Space Observatory', icon: '<i class="fas fa-rocket"></i>', desc: 'Cosmic perspective for clarity' }
    };
    
    const data = envData[environment] || envData['beach'];
    
    card.innerHTML = `
        <div class="recommended-card-icon">${data.icon}</div>
        <h4>${data.name}</h4>
        <p>${data.desc}</p>
        <button class="select-env-btn" onclick="selectEnvironment('${environment}')"><i class="fas fa-check"></i> Select</button>
    `;
    
    card.dataset.environment = environment;
    return card;
}

// Select Environment
function selectEnvironment(env) {
    selectedEnvironment = env;
    const cards = document.querySelectorAll('.recommended-card');
    cards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.environment === env) {
            card.classList.add('selected');
        }
    });
    
    // Enable start button
    const startBtn = document.querySelector('.start-vr-flow-btn');
    startBtn.style.opacity = '1';
    startBtn.style.pointerEvents = 'auto';
    startBtn.textContent = `🚀 Start ${getEnvironmentName(env)} Therapy`;
}

// Celebration Animation
function showCelebration() {
    const resultDiv = document.getElementById("result");
    const confetti = document.createElement('div');
    confetti.className = 'celebration-confetti';
    resultDiv.appendChild(confetti);
    
    setTimeout(() => {
        confetti.remove();
    }, 3000);
}


// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('auth-modal');
    if (event.target === modal) {
        closeAuthModal();
    }
}

// Global variables for VR setup flow
let currentVRStep = 1;
let selectedEnvironment = null;

// VR Setup Flow Functions
function startVRSetupFlow() {
    if (!selectedEnvironment) {
        alert('Please select a VR environment first!');
        return;
    }
    const modal = document.getElementById('vr-setup-modal');
    if (modal) {
        modal.classList.remove('hidden');
        currentVRStep = 1;
        showVRStep(1);
    }
}

function closeVRSetupModal() {
    const modal = document.getElementById('vr-setup-modal');
    if (modal) {
        modal.classList.add('hidden');
        currentVRStep = 1;
        resetVRSteps();
    }
}

function showVRStep(step) {
    // Hide all steps
    for (let i = 1; i <= 7; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (stepEl) {
            stepEl.classList.add('hidden');
            stepEl.classList.remove('active');
        }
    }
    // Show current step
    const currentStepEl = document.getElementById(`step-${step}`);
    if (currentStepEl) {
        currentStepEl.classList.remove('hidden');
        currentStepEl.classList.add('active');
    }
    
    // Check if doctor is logged in for step 4
    if (step === 4) {
        checkDoctorStatus();
    }
}

function checkDoctorStatus() {
    // Check if current user is a doctor
    if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
        db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
            const docExists = doc.exists ? (typeof doc.exists === 'function' ? doc.exists() : doc.exists) : (doc.data() !== undefined);
            if (docExists && doc.data().role === 'doctor') {
                // Show doctor controls
                const confirmationBox = document.getElementById('doctor-confirmation-box');
                if (confirmationBox) {
                    confirmationBox.innerHTML = `
                        <div class="doctor-controls">
                            <p class="doctor-message">Review patient readiness and start the session when ready.</p>
                            <button class="step-btn doctor-start-btn" onclick="doctorStartSession()"><i class="fas fa-user-md"></i> Start Session</button>
                        </div>
                    `;
                }
            } else {
                // Show waiting message for patients
                const confirmationBox = document.getElementById('doctor-confirmation-box');
                if (confirmationBox) {
                    confirmationBox.innerHTML = `
                        <div class="waiting-indicator">
                            <div class="loading-spinner"></div>
                            <p>Waiting for doctor to start the session...</p>
                            <p class="doctor-note">The doctor will manually click "Start Session" when ready.</p>
                        </div>
                    `;
                }
            }
        }).catch(error => {
            console.error('Error checking doctor status:', error);
            // Default to waiting
            const confirmationBox = document.getElementById('doctor-confirmation-box');
            if (confirmationBox) {
                confirmationBox.innerHTML = `
                    <div class="waiting-indicator">
                        <div class="loading-spinner"></div>
                        <p>Waiting for doctor to start the session...</p>
                        <p class="doctor-note">The doctor will manually click "Start Session" when ready.</p>
                    </div>
                `;
            }
        });
    } else {
        // Not logged in - show waiting
        const confirmationBox = document.getElementById('doctor-confirmation-box');
        if (confirmationBox) {
            confirmationBox.innerHTML = `
                <div class="waiting-indicator">
                    <div class="loading-spinner"></div>
                    <p>Waiting for doctor to start the session...</p>
                    <p class="doctor-note">The doctor will manually click "Start Session" when ready.</p>
                </div>
            `;
        }
    }
}

function doctorStartSession() {
    // Doctor confirms and starts session
    currentVRStep = 5;
    showVRStep(5);
    loadEnvironmentPreview();
}

function nextVRStep(current) {
    if (current === 1) {
        // Animate progress bar
        animateProgressBar(1);
        setTimeout(() => {
            currentVRStep = 2;
            showVRStep(2);
        }, 1500);
    } else if (current === 2) {
        currentVRStep = 3;
        showVRStep(3);
        setupChecklist();
    } else if (current === 3) {
        // Check if all checkboxes are checked
        const checkboxes = document.querySelectorAll('.ready-checklist input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        if (allChecked) {
            currentVRStep = 4;
            showVRStep(4);
        } else {
            alert('Please complete all checklist items before proceeding.');
        }
    }
}

function setupChecklist() {
    const checkboxes = document.querySelectorAll('.ready-checklist input[type="checkbox"]');
    const startBtn = document.getElementById('start-therapy-btn');
    
    if (checkboxes && startBtn) {
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = Array.from(checkboxes).every(c => c.checked);
                startBtn.disabled = !allChecked;
            });
        });
    }
}

function animateProgressBar(step) {
    const progressFill = document.querySelector(`#step-${step} .progress-fill`);
    if (progressFill) {
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
            } else {
                width += 2;
                progressFill.style.width = width + '%';
            }
        }, 30);
    }
}

function loadEnvironmentPreview() {
    const preview = document.getElementById('environment-preview');
    if (preview && selectedEnvironment) {
        setTimeout(() => {
            preview.innerHTML = `
                <div class="environment-loaded">
                    <h4>${getEnvironmentName(selectedEnvironment)}</h4>
                    <div class="preview-image ${selectedEnvironment}-preview"></div>
                    <p>Environment loaded successfully!</p>
                </div>
            `;
        }, 2000);
    }
}

function enterVREnvironment() {
    currentVRStep = 6;
    showVRStep(6);
    startSessionTimer();
}

function startSessionTimer() {
    let seconds = 0;
    const timerEl = document.getElementById('session-time');
    const endBtn = document.getElementById('end-session-btn');
    const statusEl = document.getElementById('session-status');
    
    if (timerEl) {
        const timer = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            
            // Enable end session button after 30 seconds (minimum session time)
            if (seconds >= 30 && endBtn) {
                endBtn.disabled = false;
                if (statusEl) {
                    statusEl.textContent = 'You can now end the session and provide feedback';
                    statusEl.style.color = '#4A7C59';
                }
            }
            
            // Update status
            if (statusEl && seconds < 30) {
                const remaining = 30 - seconds;
                statusEl.textContent = `Please continue for ${remaining} more seconds to complete minimum session time`;
            }
        }, 1000);
        window.sessionTimer = timer;
        window.sessionStartTime = Date.now();
    }
}

function pauseSession() {
    if (window.sessionTimer) {
        clearInterval(window.sessionTimer);
        window.sessionTimer = null;
    }
}

function endSession() {
    if (window.sessionTimer) {
        clearInterval(window.sessionTimer);
        window.sessionTimer = null;
        
        // Update patient info display in feedback form
        updatePatientInfoInFeedbackForm();
        
        // Move to patient details and feedback step
        currentVRStep = 7;
        showVRStep(7);
    }
}

// Update patient info display in feedback form
function updatePatientInfoInFeedbackForm() {
    const patientInfoDisplay = document.getElementById('patient-info-display-feedback');
    const patientNameField = document.getElementById('patient-name');
    const patientAgeField = document.getElementById('patient-age');
    
    // Use currentPatientName from doctor flow or from stress detection form
    const name = currentPatientName || window.currentPatientName || '';
    const age = currentPatientAge !== null ? currentPatientAge : (window.currentPatientAge !== null ? window.currentPatientAge : null);
    
    if (patientInfoDisplay) {
        if (name) {
            const ageText = age ? `, Age: ${age}` : '';
            patientInfoDisplay.textContent = `Patient: ${name}${ageText}\n\nThank you for completing your VR therapy session! Please provide feedback:`;
        } else {
            patientInfoDisplay.textContent = 'Thank you for completing your VR therapy session! Please provide feedback:';
        }
    }
    
    // Auto-populate fields if we have the data (but keep them hidden)
    if (patientNameField && name) {
        patientNameField.value = name;
    }
    if (patientAgeField && age !== null) {
        patientAgeField.value = age;
    }
}

function selectRelaxation(status) {
    const buttons = document.querySelectorAll('.relaxation-btn');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.relaxed === status) {
            btn.classList.add('selected');
        }
    });
    const relaxationInput = document.getElementById('relaxation-status');
    if (relaxationInput) {
        relaxationInput.value = status;
    }
}

// Feedback Functions
let selectedStressRating = null;

function selectRating(rating) {
    selectedStressRating = rating;
    const ratingBtns = document.querySelectorAll('.rating-btn');
    ratingBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.rating) === rating) {
            btn.classList.add('selected');
        }
    });
    document.getElementById('stress-rating').value = rating;
}

function updateEffectivenessLabel(value) {
    document.getElementById('effectiveness-value').textContent = value;
}

// Calculate Session Score
function calculateSessionScore(stressBefore, stressAfter, relaxationStatus, effectivenessRating) {
    // Stress level mapping: Normal=1, Mild=2, Moderate=3, High=4, Severe=5
    const stressMap = { 'Normal': 1, 'Mild': 2, 'Moderate': 3, 'High': 4, 'Severe': 5 };
    const stressBeforeValue = stressMap[stressBefore] || 3;
    
    // Stress improvement (lower is better, so improvement = before - after)
    const stressImprovement = stressBeforeValue - parseInt(stressAfter);
    
    // Relaxation score (yes=3, somewhat=2, no=1)
    const relaxationScore = relaxationStatus === 'yes' ? 3 : relaxationStatus === 'somewhat' ? 2 : 1;
    
    // Effectiveness rating (1-5)
    const effectivenessScore = parseInt(effectivenessRating) || 3;
    
    // Calculate overall score (0-100 scale)
    // Stress improvement: 0-40 points (max improvement = 4 points * 10)
    // Relaxation: 0-30 points (max = 3 * 10)
    // Effectiveness: 0-30 points (max = 5 * 6)
    const score = Math.max(0, Math.min(100, 
        (stressImprovement * 10) + // Up to 40 points
        (relaxationScore * 10) +   // Up to 30 points
        (effectivenessScore * 6)    // Up to 30 points
    ));
    
    return Math.round(score);
}

async function submitSessionFeedback(event) {
    event.preventDefault();
    
    // Use currentPatientName from doctor flow or stress detection form
    const patientName = currentPatientName || window.currentPatientName || document.getElementById('patient-name')?.value;
    const patientAge = currentPatientAge !== null ? currentPatientAge : (window.currentPatientAge !== null ? window.currentPatientAge : (document.getElementById('patient-age')?.value || null));
    const relaxationStatus = document.getElementById('relaxation-status').value;
    const stressRating = document.getElementById('stress-rating').value;
    const effectivenessRating = document.getElementById('effectiveness-rating').value;
    const comments = document.getElementById('feedback-comments').value;
    
    if (!patientName) {
        showNotification('Please enter patient name first in the stress detection form.', 'error', 4000);
        return;
    }
    
    if (!relaxationStatus) {
        alert('Please indicate if patient feels more relaxed');
        return;
    }
    
    if (!stressRating) {
        alert('Please select a stress level rating');
        return;
    }
    
    try {
        if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
            const sessionDuration = Math.floor((Date.now() - window.sessionStartTime) / 1000);
            
            // Get initial stress level (from stress detection)
            const initialStressLevel = currentPatientStressLevel || window.currentPatientStressLevel || 'Moderate';
            
            // Determine recovery status based on relaxation
            const recoveryStatus = relaxationStatus === 'yes' ? 'improved' : 
                                  relaxationStatus === 'somewhat' ? 'slightly_improved' : 'no_change';
            
            // Calculate session score
            const sessionScore = calculateSessionScore(initialStressLevel, stressRating, relaxationStatus, effectivenessRating);
            
            // Create timestamp for session ID
            const sessionTimestamp = firebase.firestore.Timestamp.now();
            
            // Get patient email
            const patientEmail = currentPatientEmail || window.currentPatientEmail || '';
            
            // Save session with patient details
            const sessionData = {
                patientName: patientName,
                patientEmail: patientEmail,
                patientAge: patientAge ? parseInt(patientAge) : null,
                environment: selectedEnvironment,
                duration: sessionDuration,
                startTime: firebase.firestore.Timestamp.fromDate(new Date(window.sessionStartTime)),
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                userId: auth.currentUser.uid,
                doctorId: auth.currentUser.uid,
                status: 'completed',
                recoveryStatus: recoveryStatus,
                stressLevelBefore: initialStressLevel,
                stressRatingAfter: parseInt(stressRating),
                effectivenessRating: parseInt(effectivenessRating),
                relaxationStatus: relaxationStatus,
                sessionScore: sessionScore,
                comments: comments,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const sessionRef = await db.collection('therapySessions').add(sessionData);
            
            // Save feedback separately
            const feedbackData = {
                patientName: patientName,
                patientEmail: patientEmail,
                sessionId: sessionRef.id,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                environment: selectedEnvironment,
                stressLevelBefore: initialStressLevel,
                stressRatingAfter: parseInt(stressRating),
                effectivenessRating: parseInt(effectivenessRating),
                relaxationStatus: relaxationStatus,
                recoveryStatus: recoveryStatus,
                sessionScore: sessionScore,
                comments: comments,
                sessionDuration: sessionDuration,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('sessionFeedback').add(feedbackData);
            
            // Check for existing patient record by email (preferred) or name
            let patientDocId;
            if (patientEmail) {
                // Use email as unique identifier (normalize email)
                patientDocId = patientEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
            } else {
                // Fallback to name-based ID
                patientDocId = patientName.toLowerCase().replace(/\s+/g, '_');
            }
            const patientRef = db.collection('patients').doc(patientDocId);
            const patientDoc = await patientRef.get();
            
            const sessionEntry = {
                sessionId: sessionRef.id,
                environment: selectedEnvironment,
                duration: sessionDuration,
                stressLevelBefore: initialStressLevel,
                stressRatingAfter: parseInt(stressRating),
                recoveryStatus: recoveryStatus,
                sessionScore: sessionScore,
                timestamp: sessionTimestamp
            };
            
            // Check if document exists (compat with both v8 and v9+ syntax)
            const patientDocExists = patientDoc.exists ? (typeof patientDoc.exists === 'function' ? patientDoc.exists() : patientDoc.exists) : (patientDoc.data() !== undefined);
            
            if (patientDocExists) {
                // Update existing patient record
                const existingData = patientDoc.data();
                const existingSessions = existingData.sessions || [];
                const totalSessions = (existingData.totalSessions || 0) + 1;
                
                // Calculate average score
                const allScores = [...existingSessions.map(s => s.sessionScore || 0), sessionScore];
                const averageScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
                
                // Calculate progress (compare latest score with first score)
                const firstScore = existingSessions.length > 0 ? (existingSessions[0].sessionScore || 0) : sessionScore;
                const progress = sessionScore - firstScore;
                
                await patientRef.update({
                    patientName: patientName,
                    patientEmail: patientEmail || existingData.patientEmail,
                    patientAge: patientAge ? parseInt(patientAge) : existingData.patientAge,
                    latestStressLevel: initialStressLevel,
                    sessions: firebase.firestore.FieldValue.arrayUnion(sessionEntry),
                    totalSessions: totalSessions,
                    latestScore: sessionScore,
                    averageScore: averageScore,
                    progress: progress,
                    lastSession: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Create new patient record
                await patientRef.set({
                    patientName: patientName,
                    patientEmail: patientEmail,
                    patientAge: patientAge ? parseInt(patientAge) : null,
                    latestStressLevel: initialStressLevel,
                    sessions: [sessionEntry],
                    totalSessions: 1,
                    latestScore: sessionScore,
                    averageScore: sessionScore,
                    progress: 0,
                    firstSession: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSession: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            showNotification('Session data saved successfully! Patient information and feedback have been recorded.', 'success', 4000);
            closeVRSetupModal();
            
            // Reset patient data
            currentPatientName = '';
            currentPatientEmail = '';
            currentPatientAge = null;
            currentPatientStressLevel = null;
            window.currentPatientName = '';
            window.currentPatientEmail = '';
            window.currentPatientAge = null;
            window.currentPatientStressLevel = null;
            
            // Redirect based on user role
            setTimeout(() => {
                if (typeof auth !== 'undefined' && auth.currentUser) {
                    db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
                        const docExists = doc.exists ? (typeof doc.exists === 'function' ? doc.exists() : doc.exists) : (doc.data() !== undefined);
                        if (docExists && doc.data().role === 'doctor') {
                            window.location.href = 'doctor-dashboard.html';
                        } else {
                            window.location.href = 'patient-dashboard.html';
                        }
                    });
                } else {
                    window.location.href = 'index.html';
                }
            }, 2000);
        } else {
            showNotification('Session data system not available. Please configure Firebase.', 'error', 4000);
        }
    } catch (error) {
        console.error('Error submitting session data:', error);
        showNotification('Error submitting session data: ' + error.message, 'error', 5000);
    }
}

function resetVRSteps() {
    const checkboxes = document.querySelectorAll('.ready-checklist input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    const startBtn = document.getElementById('start-therapy-btn');
    if (startBtn) startBtn.disabled = true;
    const timerEl = document.getElementById('session-time');
    if (timerEl) timerEl.textContent = '00:00';
}

// ======= DOCTOR VR FLOW FUNCTIONS =======

// Global variables for doctor VR flow
let currentPatientName = '';
let currentPatientEmail = '';
let currentPatientAge = null;
let currentPatientStressLevel = null;

// Start Doctor VR Flow
function startDoctorVRFlow() {
    // Check if user is doctor
    if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
        db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
            const docExists = doc.exists ? (typeof doc.exists === 'function' ? doc.exists() : doc.exists) : (doc.data() !== undefined);
            if (docExists && doc.data().role === 'doctor') {
                const modal = document.getElementById('doctor-vr-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    // Reset form
                    document.getElementById('doctor-patient-name').value = '';
                    document.getElementById('doctor-patient-email').value = '';
                    document.getElementById('doctor-patient-age').value = '';
                    currentPatientName = '';
                    currentPatientEmail = '';
                    currentPatientAge = null;
                    currentPatientStressLevel = null;
                    
                    // Hide stress level display
                    const stressDisplay = document.getElementById('doctor-stress-level-display');
                    if (stressDisplay) {
                        stressDisplay.classList.add('hidden');
                    }
                    
                    // Show step 0
                    showDoctorStep(0);
                }
            } else {
                alert('Only doctors can start VR therapy sessions. Please log in as a doctor.');
            }
        }).catch(error => {
            console.error('Error checking doctor status:', error);
            alert('Error verifying doctor status. Please try again.');
        });
    } else {
        alert('Please log in as a doctor to start VR therapy sessions.');
    }
}

// Close Doctor VR Modal
function closeDoctorVRModal() {
    const modal = document.getElementById('doctor-vr-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset all steps
        document.querySelectorAll('.doctor-vr-step').forEach(step => {
            step.classList.add('hidden');
            step.classList.remove('active');
        });
    }
}

// Show Doctor Step
function showDoctorStep(step) {
    document.querySelectorAll('.doctor-vr-step').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    const stepEl = document.getElementById(`doctor-step-${step}`);
    if (stepEl) {
        stepEl.classList.remove('hidden');
        stepEl.classList.add('active');
    }
}

// Proceed to VR Session (skipping stress detection)
async function proceedToVRSession() {
    const patientName = document.getElementById('doctor-patient-name').value.trim();
    const patientEmail = document.getElementById('doctor-patient-email').value.trim().toLowerCase();
    const patientAge = document.getElementById('doctor-patient-age').value;
    
    if (!patientName) {
        showNotification('Please enter patient name', 'error', 3000);
        return;
    }
    
    if (!patientEmail || !patientEmail.includes('@')) {
        showNotification('Please enter a valid patient email', 'error', 3000);
        return;
    }
    
    // Store patient details
    currentPatientName = patientName;
    currentPatientEmail = patientEmail;
    currentPatientAge = patientAge ? parseInt(patientAge) : null;
    
    // Check if stress level was detected from homepage
    const stressFromHomepage = window.currentPatientStressLevel || currentPatientStressLevel;
    
    if (stressFromHomepage) {
        // Use stress level from homepage
        currentPatientStressLevel = stressFromHomepage;
        
        // Display stress level info
        const stressDisplay = document.getElementById('doctor-stress-level-display');
        const stressLevelSpan = document.getElementById('doctor-detected-stress-level');
        if (stressDisplay && stressLevelSpan) {
            stressLevelSpan.textContent = stressFromHomepage;
            stressDisplay.classList.remove('hidden');
        }
        
        // Check for existing patient record by email
        await checkExistingPatient(patientEmail);
        
        // Start VR session directly
        startVRSessionForPatient();
    } else {
        // No stress level detected - show error
        showNotification('Please detect stress level from homepage first', 'error', 4000);
        closeDoctorVRModal();
    }
}

// Check existing patient by email
async function checkExistingPatient(patientEmail) {
    if (typeof db === 'undefined') return;
    
    try {
        // Use email as unique identifier (normalize email)
        const patientDocId = patientEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const patientRef = db.collection('patients').doc(patientDocId);
        const patientDoc = await patientRef.get();
        
        const docExists = patientDoc.exists ? (typeof patientDoc.exists === 'function' ? patientDoc.exists() : patientDoc.exists) : (patientDoc.data() !== undefined);
        
        if (docExists) {
            const patientData = patientDoc.data();
            // Update current patient data with existing info
            if (patientData.patientName && !currentPatientName) {
                currentPatientName = patientData.patientName;
            }
            if (patientData.patientAge && !currentPatientAge) {
                currentPatientAge = patientData.patientAge;
            }
            if (patientData.latestStressLevel && !currentPatientStressLevel) {
                currentPatientStressLevel = patientData.latestStressLevel;
            }
            
            console.log('Found existing patient record:', patientData);
        }
    } catch (error) {
        console.error('Error checking existing patient:', error);
    }
}

// Detect Stress for Patient
async function detectStressForPatient() {
    let beta = parseFloat(document.getElementById("doctor-beta").value);
    let gamma = parseFloat(document.getElementById("doctor-gamma").value);
    let delta = parseFloat(document.getElementById("doctor-delta").value);
    let alpha = parseFloat(document.getElementById("doctor-alpha").value);
    let theta = parseFloat(document.getElementById("doctor-theta").value);

    if (isNaN(beta) || isNaN(gamma) || isNaN(delta) || isNaN(alpha) || isNaN(theta)) {
        alert("Please enter all EEG values!");
        return;
    }

    // Show loading
    document.getElementById("doctor-stress-loading").classList.remove("hidden");
    document.getElementById("doctor-stress-result").classList.add("hidden");

    try {
        const response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ beta, gamma, delta, alpha, theta })
        });

        const data = await response.json();
        
        // Hide loading
        document.getElementById("doctor-stress-loading").classList.add("hidden");

        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        // Store stress level (for both flows)
        currentPatientStressLevel = data.prediction;
        window.currentPatientStressLevel = data.prediction;
        
        // Display result
        displayDoctorStressResult(data.prediction);
        
        // Store patient stress data in Firestore
        await storePatientStressData(data.prediction);
        
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("doctor-stress-loading").classList.add("hidden");
        alert("Error connecting to the server. Please try again.");
    }
}

// Display Doctor Stress Result
function displayDoctorStressResult(prediction) {
    const predictionText = document.getElementById("doctor-predictionText");
    const stressDescription = document.getElementById("doctor-stress-description");
    const stressBar = document.getElementById("doctor-stress-bar");
    
    const stressLevels = {
        'Normal': { level: 1, color: '#87C5A4', description: 'Normal stress level detected.' },
        'Mild': { level: 2, color: '#A8D5BA', description: 'Mild stress level detected.' },
        'Moderate': { level: 3, color: '#FFC107', description: 'Moderate stress level detected.' },
        'High': { level: 4, color: '#FF9800', description: 'High stress level detected.' },
        'Severe': { level: 5, color: '#F44336', description: 'Severe stress level detected.' }
    };
    
    const stressInfo = stressLevels[prediction] || stressLevels['Moderate'];
    
    predictionText.textContent = `Stress Level: ${prediction}`;
    predictionText.style.color = stressInfo.color;
    stressDescription.textContent = stressInfo.description;
    
    // Animate stress bar
    stressBar.style.width = '0%';
    stressBar.style.backgroundColor = stressInfo.color;
    setTimeout(() => {
        stressBar.style.width = (stressInfo.level * 20) + '%';
    }, 100);
    
    document.getElementById("doctor-stress-result").classList.remove("hidden");
}

// Store Patient Stress Data
async function storePatientStressData(stressLevel) {
    const patientName = currentPatientName || window.currentPatientName;
    const patientAge = currentPatientAge !== null ? currentPatientAge : window.currentPatientAge;
    
    if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined' && patientName) {
        try {
            // Check for existing patient record
            const patientDocId = patientName.toLowerCase().replace(/\s+/g, '_');
            const patientRef = db.collection('patients').doc(patientDocId);
            const patientDoc = await patientRef.get();
            
            // Check if document exists (compat with both v8 and v9+ syntax)
            const docExists = patientDoc.exists ? (typeof patientDoc.exists === 'function' ? patientDoc.exists() : patientDoc.exists) : (patientDoc.data() !== undefined);
            
            if (docExists) {
                // Update existing patient - only update stress level if not already set
                const existingData = patientDoc.data();
                await patientRef.update({
                    patientName: patientName,
                    patientAge: patientAge !== null ? patientAge : existingData.patientAge,
                    latestStressLevel: stressLevel,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Create new patient record
                await patientRef.set({
                    patientName: patientName,
                    patientAge: patientAge,
                    latestStressLevel: stressLevel,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Also store in stress detection history
            await db.collection('stressDetections').add({
                patientName: patientName,
                patientAge: patientAge,
                stressLevel: stressLevel,
                detectedBy: auth.currentUser.uid,
                doctorEmail: auth.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Patient stress data stored successfully');
        } catch (error) {
            console.error('Error storing patient stress data:', error);
        }
    }
}

// Start VR Session for Patient
function startVRSessionForPatient() {
    // Check both doctor flow and general flow variables
    const patientName = currentPatientName || window.currentPatientName;
    const stressLevel = currentPatientStressLevel || window.currentPatientStressLevel;
    
    if (!patientName || !stressLevel) {
        alert('Please complete stress detection first');
        return;
    }
    
    // Get recommended environment based on stress level
    const recommendations = {
        'Normal': 'beach',
        'Mild': 'beach',
        'Moderate': 'forest',
        'High': 'mountain',
        'Severe': 'zen'
    };
    
    selectedEnvironment = recommendations[stressLevel] || 'zen';
    
    // Close doctor modal
    closeDoctorVRModal();
    
    // Start VR setup flow
    startVRSetupFlow();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('VR Cognitive Therapy Platform Loaded');
    
    // Check if Firebase is properly configured
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded. Authentication features will be limited.');
    }
    
    // Initialize start VR flow button as disabled
    const startBtn = document.querySelector('.start-vr-flow-btn');
    if (startBtn) {
        startBtn.style.opacity = '0.5';
        startBtn.style.pointerEvents = 'none';
    }
    
});
