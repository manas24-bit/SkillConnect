// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

// Your web app's Firebase configuration - USE YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDOb9wgBLl70cT4KN9f0YGUsE_7_bQyNT8",
  authDomain: "skill-connect-app-ef1a8.firebaseapp.com",
  projectId: "skill-connect-app-ef1a8",
  storageBucket: "skill-connect-app-ef1a8.firebasestorage.app",
  messagingSenderId: "977454966441",
  appId: "1:977454966441:web:2669120f8f1e9dc134abb8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Get form and elements
const registrationForm = document.getElementById('registrationForm');
const loadingSpinner = document.getElementById('loadingSpinner');

// Form submission handler
registrationForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    
    // Validate skill level
    const skillLevel = document.querySelector('input[name="skillLevel"]:checked');
    if (!skillLevel) {
        alert('Please select your skill level!');
        return;
    }

    const submitBtn = document.querySelector('.btn-submit');
    
    // Show loading
    loadingSpinner.style.display = 'inline-block';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    
    // Collect form data
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        education: document.getElementById('education').value,
        branch: document.getElementById('branch').value,
        college: document.getElementById('college').value,
        linkedin: document.getElementById('linkedin').value,
        careerGoal: document.getElementById('careerGoal').value,
        skills: document.getElementById('skills').value,
        skillLevel: skillLevel.value,
        userType: 'student',
        registeredAt: new Date().toISOString()
    };
    
    try {
        let user;
        
        // Try to create user, if email exists, try to login instead
        try {
            // First try to create a new user
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            user = userCredential.user;
            console.log('New user created:', user.uid);
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                // Email already exists, try to login with the provided password
                console.log('Email already exists, attempting login...');
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                user = userCredential.user;
                console.log('Logged into existing user:', user.uid);
            } else {
                // Re-throw other authentication errors
                throw authError;
            }
        }

        // Update user profile with display name
        await updateProfile(user, {
            displayName: formData.fullName
        });

        // Check if student data already exists for this user
        const studentsQuery = query(
            collection(db, 'students'), 
            where('uid', '==', user.uid)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (!studentsSnapshot.empty) {
            throw new Error('STUDENT_ALREADY_EXISTS');
        }

        // Remove password before storing in Firestore
        const { password, ...userData } = formData;
        
        // Store additional user data in Firestore
        await addDoc(collection(db, 'students'), {
            ...userData,
            uid: user.uid,
            createdAt: new Date().toISOString()
        });
        
        // Reset loading state
        loadingSpinner.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        
        // Success message
        alert(`🎉 Welcome to SKILLCONNECT, ${formData.fullName}!\n\n✅ Registration Successful!\n✅ Education: ${formData.education} - ${formData.branch}\n✅ Skill Level: ${formData.skillLevel}\n✅ Career Goal: ${formData.careerGoal}\n\n🎯 We're now matching you with suitable mentors!\n\nYou will be redirected to login page.`);
        
        // Reset form
        registrationForm.reset();
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        // Reset loading state
        loadingSpinner.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        
        // Handle errors
        const errorCode = error.code;
        const errorMessage = error.message;
        
        let userFriendlyMessage = "Registration failed. ";
        
        switch (errorCode || error.message) {
            case 'auth/email-already-in-use':
                userFriendlyMessage = "This email is already registered. Please use a different password or login directly.";
                break;
            case 'auth/invalid-email':
                userFriendlyMessage += "Invalid email address.";
                break;
            case 'auth/wrong-password':
                userFriendlyMessage = "This email is already registered with a different password. Please use the correct password or use a different email.";
                break;
            case 'auth/weak-password':
                userFriendlyMessage += "Password is too weak.";
                break;
            case 'auth/network-request-failed':
                userFriendlyMessage += "Network error. Please check your connection.";
                break;
            case 'STUDENT_ALREADY_EXISTS':
                userFriendlyMessage = "✅ Student profile already exists for this account!\n\nYou can login directly with your email and password.";
                break;
            default:
                userFriendlyMessage += errorMessage;
        }
        
        alert(userFriendlyMessage);
        console.error("Registration error:", error);
    }
});