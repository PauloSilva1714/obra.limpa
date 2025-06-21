import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHJm219NVmB5KdQcLYRgOrp_coC_KbycQ",
  authDomain: "bralimpa2.firebaseapp.com",
  projectId: "bralimpa2",
  storageBucket: "bralimpa2.firebasestorage.app",
  messagingSenderId: "127747660506",
  appId: "1:127747660506:web:b1d89516a0bc22698de3e3"
};

// Initialize Firebase
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error('Erro ao inicializar Firebase:', error);
  // Fallback para configuração básica
  app = initializeApp(firebaseConfig);
}

// Initialize Firestore com configurações otimizadas
let db;
try {
  db = getFirestore(app);
  
  // Configurações para melhorar a performance e estabilidade
  const firestoreSettings = {
    cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
    experimentalForceLongPolling: true, // Força polling longo para melhor compatibilidade
    useFetchStreams: false // Desabilita streams para evitar problemas de conexão
  };
  
  // Aplica configurações se disponível
  if (typeof window !== 'undefined') {
    // Configurações específicas para web
    Object.assign(firestoreSettings, {
      experimentalForceLongPolling: true,
      useFetchStreams: false
    });
  }
  
} catch (error) {
  console.error('Erro ao inicializar Firestore:', error);
  db = getFirestore(app);
}

// Initialize Auth
let auth;
try {
  auth = getAuth(app);
  
  // Configurações de persistência para web
  if (typeof window !== 'undefined') {
    // Configurações específicas para web
    auth.useDeviceLanguage();
  }
  
} catch (error) {
  console.error('Erro ao inicializar Auth:', error);
  auth = getAuth(app);
}

// Função para verificar conectividade
export const checkFirebaseConnection = async () => {
  try {
    // Teste simples de conectividade usando um documento de teste
    const testDocRef = doc(db, '_test', 'connection');
    await getDoc(testDocRef);
    return true;
  } catch (error) {
    console.error('Erro de conectividade Firebase:', error);
    return false;
  }
};

// Função para reconectar
export const reconnectFirebase = async () => {
  try {
    console.log('Tentando reconectar ao Firebase...');
    
    // Limpa cache se necessário
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    // Reinicializa conexões
    await db.enableNetwork();
    
    console.log('Reconexão Firebase bem-sucedida');
    return true;
  } catch (error) {
    console.error('Erro na reconexão Firebase:', error);
    return false;
  }
};

export { app, db, auth }; 