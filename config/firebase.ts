import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHJm219NVmB5KdQcLYRgOrp_coC_KbycQ",
  authDomain: "bralimpa2.firebaseapp.com",
  projectId: "bralimpa2",
  storageBucket: "bralimpa2.firebasestorage.app",
  messagingSenderId: "127747660506",
  appId: "1:127747660506:web:b1d89516a0bc22698de3e3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with persistent cache
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth }; 