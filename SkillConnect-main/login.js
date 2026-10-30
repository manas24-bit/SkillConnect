// login.js - UPDATED VERSION
import { 
    auth, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    sendPasswordResetEmail,
    onAuthStateChanged 
} from './firebase-config.js';
import { 
    db,
    collection,
    query,
    where,
    getDocs
} from './firebase-config.js';

const firebaseConfig = {
  apiKey: "AIzaSyDOb9wgBLl70cT4KN9f0YGUsE_7_bQyNT8",
  authDomain: "skill-connect-app-ef1a8.firebaseapp.com",
  projectId: "skill-connect-app-ef1a8",
  storageBucket: "skill-connect-app-ef1a8.firebasestorage.app",
  messagingSenderId: "977454966441",
  appId: "1:977454966441:web:2669120f8f1e9dc134abb8"
};

let currentUserType = 'student';

// Tab switching
const tabs = document.querySelectorAll('.tab');
const loginText = document.getElementById('loginText');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentUserType = tab.dataset.type;
        loginText.textContent = `Login as ${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}`;
    });
});

// Password toggle
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggle = document.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggle.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggle.textContent = '👁️';
    }
}

// Form submission - Firebase Login
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const spinner = document.getElementById('loadingSpinner');
    const loginBtn = document.querySelector('.login-btn');
    
    // Show loading
    spinner.style.display = 'inline-block';
    loginBtn.disabled = true;
    loginBtn.style.opacity = '0.7';
    
    try {
        console.log('Attempting login with:', email);
        
        // Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Login successful, user:', user.email);
        
        // Check if user exists in the selected collection (mentors or students)
        let userFound = false;
        let userData = null;
        
        if (currentUserType === 'mentor') {
            // Check mentors collection
            const mentorsQuery = query(
                collection(db, 'mentors'), 
                where('email', '==', email)
            );
            const mentorsSnapshot = await getDocs(mentorsQuery);
            
            if (!mentorsSnapshot.empty) {
                userFound = true;
                mentorsSnapshot.forEach((doc) => {
                    userData = doc.data();
                    console.log('Mentor data found:', userData);
                });
            } else {
                throw new Error('MENTOR_NOT_FOUND');
            }
        } else { // student login
            // Check students collection
            const studentsQuery = query(
                collection(db, 'students'), 
                where('email', '==', email)
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            
            if (!studentsSnapshot.empty) {
                userFound = true;
                studentsSnapshot.forEach((doc) => {
                    userData = doc.data();
                    console.log('Student data found:', userData);
                });
            } else {
                throw new Error('STUDENT_NOT_FOUND');
            }
        }
        
        if (userFound && userData) {
            // Store user data in localStorage for dashboard use
            localStorage.setItem('currentUser', JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: userData.fullName,
                userType: currentUserType,
                ...userData
            }));
            
            // Show success message
            alert(`✅ Welcome back, ${userData.fullName}!\n\nSuccessfully logged in as ${currentUserType}.`);
            
            // Redirect based on user type
            setTimeout(() => {
                if (currentUserType === 'mentor') {
                    window.location.href = 'mentor-dashboard.html';
                } else {
                    window.location.href = 'student-dashboard.html';
                }
            }, 2000);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Reset loading state
        spinner.style.display = 'none';
        loginBtn.disabled = false;
        loginBtn.style.opacity = '1';
        
        // Handle specific errors
        let userFriendlyMessage = "Login failed. ";
        
        switch (error.code || error.message) {
            case 'auth/invalid-email':
                userFriendlyMessage += "Invalid email address.";
                break;
            case 'auth/user-disabled':
                userFriendlyMessage += "This account has been disabled.";
                break;
            case 'auth/user-not-found':
                userFriendlyMessage += "No account found with this email. Please sign up first.";
                break;
            case 'auth/wrong-password':
                userFriendlyMessage += "Incorrect password.";
                break;
            case 'auth/network-request-failed':
                userFriendlyMessage += "Network error. Please check your connection.";
                break;
            case 'auth/too-many-requests':
                userFriendlyMessage += "Too many failed attempts. Please try again later.";
                break;
            case 'MENTOR_NOT_FOUND':
                userFriendlyMessage = "🔒 No mentor account found with this email.\n\nPlease sign up as a mentor first or check if you selected the correct user type.";
                break;
            case 'STUDENT_NOT_FOUND':
                userFriendlyMessage = "🔒 No student account found with this email.\n\nPlease sign up as a student first or check if you selected the correct user type.";
                break;
            default:
                userFriendlyMessage += error.message;
        }
        
        alert(userFriendlyMessage);
    }
});

// Forgot password - Firebase
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    
    if (!email) {
        alert('Please enter your email address first.');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        alert(`📧 Password reset email sent to ${email}\n\nPlease check your inbox and follow the instructions.`);
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Error sending password reset email: ' + error.message);
    }
}

// Google Login - Firebase
async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        console.log('Google login successful:', user);
        
        // For Google login, we need to check which type they are
        // This is a simplified version - you might want to handle this differently
        alert(`✅ Google login successful!\n\nWelcome, ${user.displayName || user.email}\n\nPlease complete your profile setup.`);
        
        // Redirect based on selected type
        setTimeout(() => {
            if (currentUserType === 'student') {
                window.location.href = 'student-dashboard.html';
            } else {
                window.location.href = 'mentor-dashboard.html';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Google login error:', error);
        
        if (error.code === 'auth/popup-blocked') {
            alert('Popup was blocked by your browser. Please allow popups for this site.');
        } else if (error.code === 'auth/popup-closed-by-user') {
            alert('Login popup was closed. Please try again.');
        } else {
            alert('Google login failed: ' + error.message);
        }
    }
}

// LinkedIn Login (Placeholder - would need additional setup)
function handleLinkedInLogin() {
    alert(`🔐 LinkedIn Login\n\nNote: LinkedIn integration requires additional OAuth setup. Currently using demo mode.\n\nConnecting your LinkedIn account as ${currentUserType}...`);
}

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User is already logged in:', user.email);
        // You might want to automatically redirect based on stored user type
        // const storedUser = localStorage.getItem('currentUser');
        // if (storedUser) {
        //     const userData = JSON.parse(storedUser);
        //     if (userData.userType === 'mentor') {
        //         window.location.href = 'mentor-dashboard.html';
        //     } else {
        //         window.location.href = 'student-dashboard.html';
        //     }
        // }
    } else {
        console.log('No user is currently logged in');
    }
});

// Make functions globally available
window.togglePassword = togglePassword;
window.handleForgotPassword = handleForgotPassword;
window.handleGoogleLogin = handleGoogleLogin;
window.handleLinkedInLogin = handleLinkedInLogin;
