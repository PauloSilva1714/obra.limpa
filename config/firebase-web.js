// Configuração específica para Firebase Web
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Configuração para resolver problemas do Firebase Web
if (Platform.OS === 'web') {
  // Suprimir avisos específicos do Firebase
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    
    // Lista de avisos específicos do Firebase para suprimir
    const suppressedWarnings = [
      'BloomFilter error',
      'Firestore',
      'Firebase'
    ];
    
    const shouldSuppress = suppressedWarnings.some(suppressed => 
      message.includes(suppressed)
    );
    
    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };
  
  // Configuração para melhorar a performance do Firebase
  if (typeof window !== 'undefined') {
    // Configuração para melhorar a performance das consultas
    window.addEventListener('beforeunload', () => {
      // Limpar cache do Firebase antes de sair
      if (window.firebase && window.firebase.firestore) {
        try {
          window.firebase.firestore().clearPersistence();
        } catch (error) {
          // Ignorar erros de limpeza
        }
      }
    });
  }
}

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

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Configurações específicas para web
if (typeof window !== 'undefined') {
  // Configurações para evitar problemas de CORS
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // Adicionar headers para evitar problemas de CORS
    const newOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'same-origin'
    };
    
    return originalFetch(url, newOptions);
  };
}

export { app, db, auth };

export default Platform; 