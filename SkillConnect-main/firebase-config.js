// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    signInWithPopup, 
    GoogleAuthProvider, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";

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
const googleProvider = new GoogleAuthProvider();

export { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    signInWithPopup, 
    GoogleAuthProvider, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    doc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc 
};
  
