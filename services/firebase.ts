import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHJm219NVmB5KdQcLYRgOrp_coC_KbycQ",
  authDomain: "bralimpa2.firebaseapp.com",
  projectId: "bralimpa2",
  storageBucket: "bralimpa2.appspot.com",
  messagingSenderId: "127747660506",
  appId: "1:127747660506:web:b1d89516a0bc22698de3e3"
};

// Inicializa o Firebase apenas se não houver uma instância já existente
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Auth
export const auth = getAuth(app);

// Inicializa o Firestore
export const db = getFirestore(app);

export default app; 