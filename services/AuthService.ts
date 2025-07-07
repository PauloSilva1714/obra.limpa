import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { isFirestoreOnline, forceReconnectAndCheck, checkFirebaseConfiguration, reinitializeFirestore, testFirestoreConnectivity, tryFirestoreOperation, tryAlternativeFirestoreConfig, diagnoseAndFixFirestoreIssue, simpleFirestoreOperation, fixClientOfflineIssue, tryAlternativeApproach, fixWebClientOfflineIssue, tryWebFirestoreOperation } from '../config/firebase';
// Adicione as importações de tipo apropriadas para auth e db
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Garanta que auth e db sejam tipados corretamente
const typedAuth: Auth = auth;
const typedDb: Firestore = db;
import { EmailService } from './EmailService';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker' | 'pending';
  status: 'active' | 'inactive' | 'pending_invite';
  phone?: string;
  company?: string;
  sites?: string[];
  siteId?: string;
  notifications?: {
    taskCreation?: boolean;
    taskUpdate?: boolean;
    loginConfirmation?: boolean;
  };
  inviteId?: string;
  isSuperAdmin?: boolean;
  funcao?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Invite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  siteId: string;
  role: 'admin' | 'worker';
  createdAt: string;
  invitedBy?: string;
  siteName?: string;
}

export class AuthService {
  private static USER_KEY = 'user';
  static SITE_KEY = 'selectedSite';
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      const userData = await AuthService.getCurrentUser();
      
      // Se temos dados do usuário no AsyncStorage, consideramos autenticado
      // mesmo que o Firebase ainda não tenha restaurado a sessão
      if (userData) {
        return true;
      }
      
      // Se não temos dados no AsyncStorage mas temos usuário no Firebase
      if (currentUser && !userData) {
        await AuthService.clearAuthData();
        return false;
      }
      
      // Se não temos nem no Firebase nem no AsyncStorage
      if (!currentUser && !userData) {
        return false;
      }
      
      // Caso padrão: não autenticado
      return false;
    } catch (error) {
      return false;
    }
  }

  static waitForAuthState(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);
      await signOut(auth);
      AuthService.getInstance().currentUser = null;
    } catch (error) {
      throw error;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(AuthService.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  static async getCurrentSite(): Promise<Site | null> {
    try {
      const siteData = await AsyncStorage.getItem(AuthService.SITE_KEY);
      
      if (!siteData) {
        return null;
      }
      
      const parsedSite = JSON.parse(siteData);
      
      if (!parsedSite || typeof parsedSite !== 'object') {
        return null;
      }
      
      if (!parsedSite.id || typeof parsedSite.id !== 'string') {
        return null;
      }
      
      return parsedSite;
    } catch (error) {
      return null;
    }
  }

  static async setCurrentSite(site: Site | null): Promise<void> {
    try {
      if (site) {
        if (!site.id || typeof site.id !== 'string') {
          throw new Error('Site deve ter um id válido');
        }
        
        await AsyncStorage.setItem(AuthService.SITE_KEY, JSON.stringify(site));
      } else {
        await AsyncStorage.removeItem(AuthService.SITE_KEY);
      }
    } catch (error) {
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      let userDoc: any;
      
      try {
        userDoc = await tryWebFirestoreOperation(
          () => getDoc(doc(db, 'users', userCredential.user.uid)),
          5, // 5 tentativas
          3000 // 3 segundos entre tentativas
        );
        
        if (!userDoc || !userDoc.exists()) {
          const basicUserData: User = {
            id: userCredential.user.uid,
            name: userCredential.user.displayName || 'Usuário',
            email: userCredential.user.email || email,
            role: 'pending',
            status: 'pending_invite',
            phone: '',
            company: '',
            sites: [],
            notifications: {
              taskCreation: true,
              taskUpdate: true,
              loginConfirmation: true
            }
          };
          
          await setDoc(doc(db, 'users', userCredential.user.uid), basicUserData);
          await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(basicUserData));
          return false; // Retornar false para indicar que precisa de configuração
        }

        const userData = userDoc.data() as User;
        
        const needsFix = userData.status === 'pending_invite' || userData.role === 'pending';
        if (needsFix) {
          return false;
        } else {
          await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(userData));

          try {
            await EmailService.sendLoginConfirmation(
              userData,
              {
                loginTime: new Date().toLocaleString('pt-BR'),
                deviceInfo: 'Web Browser'
              }
            );
          } catch (emailError) {
            // Ignorar o erro de envio de email
          }
        }

        if (
          userData &&
          userData.role === 'admin' &&
          (!userData.siteId || userData.siteId === '') &&
          Array.isArray(userData.sites) &&
          userData.sites.length === 1
        ) {
          const autoSiteId = userData.sites[0];
          await updateDoc(doc(db, 'users', userData.id), { siteId: autoSiteId });
          userData.siteId = autoSiteId;
          await AuthService.saveUserToStorageStatic(userData);
          const siteObj = await AuthService.getSiteById(autoSiteId);
          if (siteObj) {
            await AuthService.setCurrentSite(siteObj);
          }
        }

        return true;
      } catch (firestoreError: any) {
        if (firestoreError.message.includes('permission') || firestoreError.message.includes('not found')) {
          userDoc = null; // Permitir que continue para criar o documento
        } else {
          throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
        }
      }

      return false;
    } catch (error) {
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);
    } catch (error) {
      throw error;
    }
  }

  static async register(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
    phone?: string;
    company?: string;
    siteName?: string;
    inviteId?: string;
    isSuperAdmin?: boolean;
    funcao?: string;
  }): Promise<boolean> {
    try {
      if (!userData.email || typeof userData.email !== 'string') throw new Error('Email é obrigatório e deve ser uma string');
      if (!userData.password || typeof userData.password !== 'string') throw new Error('Senha é obrigatória e deve ser uma string');
      if (!userData.name || typeof userData.name !== 'string') throw new Error('Nome é obrigatório e deve ser uma string');
      if (!userData.role || !['admin', 'worker'].includes(userData.role)) throw new Error('Role deve ser "admin" ou "worker"');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) throw new Error('Formato de email inválido');
      if (userData.password.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');

      const cleanUserData = {
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        role: userData.role,
        phone: userData.phone?.trim() || '',
        company: userData.company?.trim() || '',
        siteName: userData.siteName?.trim() || '',
        inviteId: userData.inviteId?.trim() || '',
        isSuperAdmin: userData.isSuperAdmin === true,
        funcao: userData.funcao?.trim() || '',
      };

      let user: any = {};
      let siteId = '';

      if (cleanUserData.role === 'admin' && cleanUserData.isSuperAdmin) {
        user = {
          name: cleanUserData.name,
          email: cleanUserData.email,
          role: 'admin',
          phone: cleanUserData.phone,
          company: cleanUserData.company,
          sites: [],
          status: 'active',
          isSuperAdmin: true
        };
      }
      else if (cleanUserData.role === 'admin' && cleanUserData.siteName && !cleanUserData.inviteId) {
        const sitesQuery = query(
          collection(db, 'sites'),
          where('name', '==', cleanUserData.siteName)
        );
        const existingSites = await getDocs(sitesQuery);

        if (!existingSites.empty) {
          const existingSite = existingSites.docs[0];
          siteId = existingSite.id;
          user = {
            name: cleanUserData.name,
            email: cleanUserData.email,
            role: 'admin',
            phone: cleanUserData.phone,
            company: cleanUserData.company,
            sites: [siteId],
            siteId,
            status: 'active'
          };
        } else {
          user = {
            name: cleanUserData.name,
            email: cleanUserData.email,
            role: 'admin',
            phone: cleanUserData.phone,
            company: cleanUserData.company,
            sites: [],
            status: 'active'
          };
        }
      }
      else if (cleanUserData.inviteId) {
        const inviteDoc = await getDoc(doc(db, 'invites', cleanUserData.inviteId));
        if (!inviteDoc.exists()) throw new Error('Convite inválido ou expirado');
        const invite = inviteDoc.data();
        if (
          invite.status !== 'pending' ||
          invite.email !== cleanUserData.email ||
          invite.role !== cleanUserData.role
        ) {
          throw new Error('Convite inválido ou expirado');
        }
        siteId = invite.siteId;
        await updateDoc(doc(db, 'invites', cleanUserData.inviteId), { status: 'accepted' });

        user = {
          name: cleanUserData.name,
          email: cleanUserData.email,
          role: cleanUserData.role,
          phone: cleanUserData.phone,
          company: cleanUserData.company,
          sites: [siteId],
          siteId,
          status: 'active',
          inviteId: cleanUserData.inviteId
        };
      } else {
        throw new Error('Fluxo de cadastro inválido ou convite obrigatório ausente.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, cleanUserData.email, cleanUserData.password);
      
      if (!auth.currentUser || auth.currentUser.uid !== userCredential.user.uid) {
        await signInWithEmailAndPassword(auth, cleanUserData.email, cleanUserData.password);
      }

      user.id = userCredential.user.uid;
      if (cleanUserData.funcao) {
        user.funcao = cleanUserData.funcao;
      }

      const userForFirestore = { ...user };
      delete userForFirestore.siteName;

      await setDoc(doc(db, 'users', user.id), userForFirestore);

      if (
        cleanUserData.role === 'admin' &&
        cleanUserData.siteName &&
        !cleanUserData.inviteId &&
        !siteId
      ) {
        console.log('🏗️ Criando nova obra automaticamente...');
        
        const siteRef = doc(collection(db, 'sites'));
        siteId = siteRef.id;
        const newSite = {
          id: siteId,
          name: cleanUserData.siteName,
          address: '',
          createdBy: userCredential.user.uid,
          creatorId: userCredential.user.uid,
          createdAt: new Date().toISOString(),
          autoCreated: true
        };
        await setDoc(siteRef, newSite);
        
        await updateDoc(doc(db, 'users', user.id), {
          sites: [siteId],
          siteId: siteId
        });
        
        user.sites = [siteId];
        user.siteId = siteId;
      }

      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      AuthService.getInstance().currentUser = user;
      await AuthService.saveUserToStorageStatic(user);

      return true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') throw new Error('Email já está em uso');
      if (error.code === 'auth/invalid-email') throw new Error('Email inválido');
      if (error.code === 'auth/weak-password') throw new Error('Senha muito fraca. Use pelo menos 6 caracteres');
      if (error.code === 'auth/operation-not-allowed') throw new Error('Operação não permitida. Contate o suporte');
      if (error.code === 'auth/network-request-failed') throw new Error('Erro de conexão. Verifique sua internet');
      throw new Error(`Erro no registro: ${error.message || 'Erro desconhecido'}`);
    }
  }

  static async validateInvite(inviteId: string, email: string): Promise<boolean> {
    try {
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) return false;

      const invite = inviteDoc.data() as Invite;
      return invite.status === 'pending' && invite.email === email;
    } catch (error) {
      return false;
    }
  }

  static async validateAdminInvite(inviteId: string, email: string): Promise<boolean> {
    try {
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) {
        return false;
      }

      const invite = inviteDoc.data() as Invite;
      return invite.status === 'pending' && invite.email === email && invite.role === 'admin';
    } catch (error) {
      return false;
    }
  }

  static async testMethod(): Promise<string> {
    return 'AuthService is working';
  }

  static async debugInvites(): Promise<void> {
    try {
      const debugInvitesQuery = query(collection(db, 'invites'));
      const debugInvitesSnapshot = await getDocs(debugInvitesQuery);
      
      debugInvitesSnapshot.docs.forEach((doc, index) => {
        const invite = doc.data() as Invite;
      });
      
    } catch (error) {
    }
  }

  static async checkInvitesCollection(): Promise<void> {
    try {
      const checkInvitesQuery = query(collection(db, 'invites'));
      const checkInvitesSnapshot = await getDocs(checkInvitesQuery);
      
      if (checkInvitesSnapshot.empty) {
        return;
      }
      
      const firstDoc = checkInvitesSnapshot.docs[0];
      const firstInvite = firstDoc.data();
      
      let validInvites = 0;
      let invalidInvites = 0;
      
      checkInvitesSnapshot.docs.forEach((doc, index) => {
        const invite = doc.data();
        const hasRequiredFields = invite.email && invite.role && invite.status && invite.siteId;
        
        if (hasRequiredFields) {
          validInvites++;
        } else {
          invalidInvites++;
        }
      });
      
    } catch (error) {
    }
  }

  async registerInstance(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
    phone?: string;
    company?: string;
    siteName?: string;
    inviteId?: string;
    isSuperAdmin?: boolean;
    funcao?: string;
  }): Promise<boolean> {
    return AuthService.register(userData);
  }

  async validateInviteInstance(inviteId: string, email: string): Promise<boolean> {
    return AuthService.validateInvite(inviteId, email);
  }

  private async saveUserToStorage(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    } catch (error) {
      throw error;
    }
  }

  async createInvite(email: string, siteId: string): Promise<Invite> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem criar convites');
      }

      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', email),
        where('siteId', '==', siteId),
        where('status', '==', 'pending')
      );
      const existingInvites = await getDocs(invitesQuery);

      if (!existingInvites.empty) {
        throw new Error('Já existe um convite pendente para este email nesta obra');
      }

      const site = await AuthService.getSiteById(siteId);
      if (!site) {
        throw new Error('Obra não encontrada');
      }

      const invite: Invite = {
        id: doc(collection(db, 'invites')).id,
        email,
        siteId,
        siteName: site.name,
        createdAt: new Date().toISOString(),
        status: 'pending',
        role: 'worker',
        invitedBy: currentUser.id,
      };

      await setDoc(doc(db, 'invites', invite.id), invite);

      try {
        await EmailService.sendWorkerInvite({
          email: invite.email,
          siteName: site.name,
          invitedBy: currentUser.name,
          inviteId: invite.id,
        });
      } catch (emailError) {
      }

      return invite;
    } catch (error) {
      throw error;
    }
  }

  async getInvites(): Promise<Invite[]> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) return [];

      let invitesQuery;
      if (currentUser.role === 'admin') {
        invitesQuery = collection(db, 'invites');
      } else {
        invitesQuery = query(
          collection(db, 'invites'),
          where('email', '==', currentUser.email)
        );
      }

      const invitesSnapshot = await getDocs(invitesQuery);
      return invitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Invite);
    } catch (error) {
      return [];
    }
  }

  static async registerStatic(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
    phone?: string;
    company?: string;
    siteName?: string;
    inviteId?: string;
    isSuperAdmin?: boolean;
    funcao?: string;
  }): Promise<boolean> {
    const instance = AuthService.getInstance();
    return AuthService.register(userData);
  }

  static async registerCompletelyStatic(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
    phone?: string;
    company?: string;
    siteName?: string;
    inviteId?: string;
    isSuperAdmin?: boolean;
    funcao?: string;
  }): Promise<boolean> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;

      const user: User = {
        id: firebaseUser.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        company: userData.company,
        sites: [],
        status: 'active',
        inviteId: userData.inviteId,
        isSuperAdmin: userData.isSuperAdmin === true,
        funcao: userData.funcao?.trim() || '',
      };

      await setDoc(doc(db, 'users', user.id), user);

      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      return true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email já está em uso');
      }
      
      if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      }
      
      if (error.code === 'auth/weak-password') {
        throw new Error('Senha muito fraca. Use pelo menos 6 caracteres');
      }
      
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Operação não permitida. Contate o suporte');
      }
      
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Erro de conexão. Verifique sua internet');
      }
      
      throw new Error(`Erro no registro completamente estático: ${error.message || 'Erro desconhecido'}`);
    }
  }

  static async getUserSites(): Promise<Site[]> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return [];

      const userData = userDoc.data() as User;
      const userSiteIds: string[] = userData.sites || [];
      if (userSiteIds.length === 0) return [];

      const allSites: Site[] = [];
      const batchSize = 10;
      for (let i = 0; i < userSiteIds.length; i += batchSize) {
        const batchIds = userSiteIds.slice(i, i + batchSize);
      const sitesQuery = query(
        collection(db, 'sites'),
          where('__name__', 'in', batchIds)
      );
      const sitesSnapshot = await getDocs(sitesQuery);
        allSites.push(...sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
        } as Site)));
      }
      return allSites;
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile() {
    const user = await AuthService.getCurrentUser();
    const site = await AuthService.getCurrentSite();

    if (!user) throw new Error('User not found');

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
      siteName: site?.name || 'Nenhuma obra selecionada',
      joinDate: '2024-01-15',
    };
  }

  static async getUserRole(): Promise<'admin' | 'worker'> {
    try {
      const userData = await AsyncStorage.getItem(AuthService.USER_KEY);
      
      if (!userData) {
        return 'worker';
      }
      
      const user = JSON.parse(userData);
      return user.role;
    } catch (error) {
      return 'worker';
    }
  }

  async getWorkers(): Promise<User[]> {
    try {
      const workersSnapshot = await getDocs(collection(db, 'users'));
      
      const workers = workersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as User;
        })
        .filter(worker => !!worker.inviteId);
      
      return workers;
    } catch (error) {
      throw error;
    }
  }

  async getWorkerById(workerId: string): Promise<User | null> {
    try {
      const workerDoc = await getDoc(doc(db, 'users', workerId));
      if (!workerDoc.exists()) {
        return null;
      }
      return {
        id: workerDoc.id,
        ...workerDoc.data(),
      } as User;
    } catch (error) {
      throw error;
    }
  }

  async updateWorker(workerId: string, updates: Partial<User>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', workerId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  async removeWorker(workerId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', workerId), {
        status: 'inactive',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  async cancelInvite(inviteId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  async getSites(): Promise<Site[]> {
    try {
      const sitesQuery = query(
        collection(db, 'sites'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(sitesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Site));
    } catch (error) {
      throw error;
    }
  }

  async createSite(siteData: {
    name: string;
    address: string;
    status: 'active' | 'inactive';
  }): Promise<Site> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem criar obras');
      }

      const sitesQuery = query(
        collection(db, 'sites'),
        where('name', '==', siteData.name.trim())
      );
      const existingSites = await getDocs(sitesQuery);
      
      if (!existingSites.empty) {
        throw new Error(`Já existe uma obra com o nome "${siteData.name}". Por favor, escolha um nome diferente.`);
      }

      const now = new Date().toISOString();
      const newSite = {
        ...siteData,
        name: siteData.name.trim(),
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser.id,
      };

      const docRef = await addDoc(collection(db, 'sites'), newSite);
      
      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const updatedSites = [...(userData.sites || []), docRef.id];
        await updateDoc(userRef, { sites: updatedSites });
      }

      return {
        id: docRef.id,
        ...newSite,
      } as Site;
    } catch (error) {
      throw error;
    }
  }

  static async getSiteById(siteId: string): Promise<Site | null> {
    try {
      const siteDoc = await getDoc(doc(db, 'sites', siteId));
      if (!siteDoc.exists()) {
        return null;
      }
      return {
        id: siteDoc.id,
        ...siteDoc.data(),
      } as Site;
    } catch (error) {
      throw error;
    }
  }

  static async updateSite(siteId: string, updates: Partial<Site>): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem atualizar obras');
      }

      const siteDoc = await getDoc(doc(db, 'sites', siteId));
      if (!siteDoc.exists()) {
        throw new Error('Obra não encontrada');
      }

      const siteData = siteDoc.data() as Site;
      if (siteData.createdBy !== currentUser.id) {
        throw new Error('Você não tem permissão para atualizar esta obra');
      }

      if (updates.name && updates.name.trim() !== siteData.name) {
        const sitesQuery = query(
          collection(db, 'sites'),
          where('name', '==', updates.name.trim())
        );
        const existingSites = await getDocs(sitesQuery);
        
        const conflictingSites = existingSites.docs.filter(doc => doc.id !== siteId);
        if (conflictingSites.length > 0) {
          throw new Error(`Já existe uma obra com o nome "${updates.name}". Por favor, escolha um nome diferente.`);
        }
      }

      await updateDoc(doc(db, 'sites', siteId), {
        ...updates,
        name: updates.name ? updates.name.trim() : siteData.name,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  static async deleteSite(siteId: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir obras');
      }

      const siteDoc = await getDoc(doc(db, 'sites', siteId));
      if (!siteDoc.exists()) {
        throw new Error('Obra não encontrada');
      }

      const siteData = siteDoc.data() as Site;
      if (siteData.createdBy !== currentUser.id) {
        throw new Error('Você não tem permissão para excluir esta obra');
      }

      await deleteDoc(doc(db, 'sites', siteId));

      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const updatedSites = userData.sites?.filter(id => id !== siteId) || [];
        await updateDoc(userRef, { sites: updatedSites });
      }
    } catch (error) {
      throw error;
    }
  }

  static async updateNotificationSettings(
    userId: string,
    settings: {
      taskCreation?: boolean;
      taskUpdate?: boolean;
      loginConfirmation?: boolean;
    }
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notifications: settings,
      });
    } catch (error) {
      throw error;
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as User;
    } catch (error) {
      return null;
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      return null;
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuário não autenticado');
      }

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      await updatePassword(currentUser, newPassword);

      return true;
    } catch (error) {
      throw error;
    }
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const user = await AuthService.getUserByEmail(email);
      if (!user) {
        throw new Error('Email não encontrado no sistema');
      }

      await sendPasswordResetEmail(auth, email);
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        const user = await AuthService.getUserByEmail(email);
        if (user) {
          throw new Error('Problema de sincronização. Entre em contato com o administrador.');
        } else {
          throw new Error('Email não encontrado no sistema');
        }
      }
      
      throw error;
    }
  }

  static async createAdminInvite(email: string, siteId: string): Promise<Invite> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem convidar outros administradores');
      }

      if (!currentUser.sites?.includes(siteId)) {
        throw new Error('Você não tem permissão para convidar administradores para esta obra');
      }

      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', email),
        where('siteId', '==', siteId),
        where('status', '==', 'pending')
      );
      const existingInvites = await getDocs(invitesQuery);

      if (!existingInvites.empty) {
        throw new Error('Já existe um convite pendente para este email nesta obra');
      }

      const existingUser = await AuthService.getUserByEmail(email);
      if (existingUser) {
        if (existingUser.sites?.includes(siteId)) {
          throw new Error('Este usuário já tem acesso a esta obra');
        }
      }

      const site = await AuthService.getSiteById(siteId);
      if (!site) {
        throw new Error('Obra não encontrada');
      }

      const invite: Invite = {
        id: doc(collection(db, 'invites')).id,
        email,
        siteId,
        siteName: site.name,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'pending',
        invitedBy: currentUser.id,
      };

      await setDoc(doc(db, 'invites', invite.id), invite);
      console.log('Convite salvo no Firestore com ID:', invite.id);

      try {
        const emailResult = await EmailService.sendAdminInvite({
          email: invite.email,
          siteName: site.name,
          invitedBy: currentUser.name,
          inviteId: invite.id,
        });
        
        if (!emailResult.success) {
          throw new Error(`O convite foi salvo, mas o e-mail de notificação falhou: ${emailResult.error}`);
        }

        console.log('Email de convite de administrador enviado com sucesso');
      } catch (emailError) {
        throw emailError;
      }

      return invite;
    } catch (error) {
      throw error;
    }
  }

  static async getAdminInvites(siteId?: string): Promise<Invite[]> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return [];
      }

      let invitesQuery;
      if (siteId) {
        invitesQuery = query(
          collection(db, 'invites'),
          where('siteId', '==', siteId),
          where('role', '==', 'admin')
        );
      } else {
        invitesQuery = query(
          collection(db, 'invites'),
          where('role', '==', 'admin')
        );
      }

      const invitesSnapshot = await getDocs(invitesQuery);
      return invitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Invite));
    } catch (error) {
      return [];
    }
  }

  static async getSiteAdmins(siteId: string): Promise<User[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'admin'),
        where('sites', 'array-contains', siteId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as User));
    } catch (error) {
      return [];
    }
  }

  static async cancelAdminInvite(inviteId: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      if (currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem cancelar convites');
      }

      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      
      if (!inviteDoc.exists()) {
        throw new Error('Convite não encontrado');
      }

      const invite = inviteDoc.data() as Invite;
      
      if (!currentUser.sites || currentUser.sites.length === 0) {
        throw new Error('Usuário não tem acesso a nenhuma obra');
      }
      
      if (!currentUser.sites.includes(invite.siteId)) {
        throw new Error('Você não tem permissão para cancelar este convite');
      }

      if (invite.role !== 'admin') {
        throw new Error('Este não é um convite de administrador');
      }

      if (invite.status !== 'pending') {
        throw new Error('Apenas convites pendentes podem ser cancelados');
      }

      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });
      
    } catch (error) {
      throw error;
    }
  }

  static async deleteAdminInvite(inviteId: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      if (currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir convites');
      }

      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      
      if (!inviteDoc.exists()) {
        throw new Error('Convite não encontrado');
      }

      const invite = inviteDoc.data() as Invite;
      
      if (!currentUser.sites || currentUser.sites.length === 0) {
        throw new Error('Usuário não tem acesso a nenhuma obra');
      }
      
      if (!currentUser.sites.includes(invite.siteId)) {
        throw new Error('Você não tem permissão para excluir este convite');
      }

      if (invite.role !== 'admin') {
        throw new Error('Este não é um convite de administrador');
      }

      if (invite.status === 'pending') {
        throw new Error('Apenas convites rejeitados ou cancelados podem ser excluídos');
      }

      await deleteDoc(doc(db, 'invites', inviteId));
      
    } catch (error) {
      throw error;
    }
  }

  private static async saveUserToStorageStatic(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    } catch (error) {
      throw error;
    }
  }

  static subscribeToUserSites(userId: string, callback: (sites: Site[]) => void) {
    const userDocRef = doc(db, 'users', userId);
    getDoc(userDocRef).then(userDoc => {
      if (!userDoc.exists()) {
        callback([]);
        return;
      }
      const userData = userDoc.data() as any;
      const userSiteIds: string[] = userData.sites || [];
      if (userSiteIds.length === 0) {
        callback([]);
        return;
      }
      const sitesQuery = query(
        collection(db, 'sites'),
        where('id', 'in', userSiteIds)
      );
      return onSnapshot(sitesQuery, (snapshot) => {
        const sites = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Site));
        callback(sites);
      });
    });
  }

  static subscribeToWorkers(siteId: string, callback: (workers: User[]) => void) {
    const workersQuery = query(
      collection(db, 'users'),
      where('sites', 'array-contains', siteId)
    );
    return onSnapshot(workersQuery, (snapshot) => {
      const workers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      callback(workers);
    });
  }

  static subscribeToInvites(siteId: string, callback: (invites: Invite[]) => void) {
    const invitesQuery = query(
      collection(db, 'invites'),
      where('siteId', '==', siteId)
    );
    return onSnapshot(invitesQuery, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invite));
      callback(invites);
    });
  }

  static async fixPendingUser(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data() as any;
      
      const needsFix = userData.status === 'pending_invite' || userData.role === 'pending';
      if (!needsFix) {
        return true;
      }

      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', userData.email),
        where('status', '==', 'pending')
      );
      
      const invitesSnapshot = await getDocs(invitesQuery);
      
      let updatedUser: Partial<User> = {
        status: 'active',
        name: userData.name || 'Nome não fornecido',
        company: userData.company || 'Não informada'
      };

      if (invitesSnapshot.size > 0) {
        const invite = invitesSnapshot.docs[0].data() as Invite;
        updatedUser = {
          ...updatedUser,
          role: invite.role,
          sites: [invite.siteId],
          inviteId: invitesSnapshot.docs[0].id
        };

        if (invite.role === 'admin') {
          updatedUser.siteId = invite.siteId;
        }

        await updateDoc(doc(db, 'invites', invitesSnapshot.docs[0].id), {
          status: 'accepted',
        });
      } else {
        updatedUser = {
          ...updatedUser,
          role: 'admin',
          sites: []
        };
      }

      await updateDoc(doc(db, 'users', userId), updatedUser);

      const currentUser = await AuthService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...updatedUser };
        await AuthService.saveUserToStorageStatic(updatedCurrentUser as User);
      }

      if (
        updatedUser &&
        updatedUser.role === 'admin' &&
        (!updatedUser.siteId || updatedUser.siteId === '') &&
        Array.isArray(updatedUser.sites) &&
        updatedUser.sites.length === 1
      ) {
        const autoSiteId = updatedUser.sites[0];
        if (updatedUser.id && autoSiteId) {
          await updateDoc(doc(db, 'users', updatedUser.id), { siteId: autoSiteId });
          updatedUser.siteId = autoSiteId;
          await AuthService.saveUserToStorageStatic(updatedUser as User);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  static async fixUserWithDefaultData(userId: string, correctData: {
    name: string;
    company: string;
    phone?: string;
    role?: 'admin' | 'worker';
  }): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data() as any;
      
      const hasDefaultData = userData.name === 'Nome não fornecido' || userData.company === 'Não informada';
      if (!hasDefaultData) {
        return true;
      }

      const updatedUser: Partial<User> = {
        name: correctData.name,
        company: correctData.company,
        status: 'active'
      };

      if (correctData.phone) {
        updatedUser.phone = correctData.phone;
      }

      if (correctData.role) {
        updatedUser.role = correctData.role;
      }

      await updateDoc(doc(db, 'users', userId), updatedUser);

      const currentUser = await AuthService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...updatedUser };
        await AuthService.saveUserToStorageStatic(updatedCurrentUser as User);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  static async fixCurrentUserData(correctData: {
    name: string;
    company: string;
    phone?: string;
    role?: 'admin' | 'worker';
  }): Promise<boolean> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        return false;
      }

      const hasDefaultData = currentUser.name === 'Nome não fornecido' || currentUser.company === 'Não informada';
      if (!hasDefaultData) {
        return true;
      }

      const updatedUser: Partial<User> = {
        name: correctData.name,
        company: correctData.company,
        status: 'active'
      };

      if (correctData.phone) {
        updatedUser.phone = correctData.phone;
      }

      if (correctData.role) {
        updatedUser.role = correctData.role;
      }

      await updateDoc(doc(db, 'users', currentUser.id), updatedUser);

      const updatedCurrentUser = { ...currentUser, ...updatedUser };
      await AuthService.saveUserToStorageStatic(updatedCurrentUser as User);

      return true;
    } catch (error) {
      return false;
    }
  }

  static async testAuthOnly(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      if (!auth) {
        return {
          success: false,
          error: 'Auth não está configurado'
        };
      }
      
      if (!auth.app) {
        return {
          success: false,
          error: 'Auth não está inicializado corretamente'
        };
      }
      
      const authConfig = auth.app.options;
      
      if (!authConfig.apiKey) {
        return {
          success: false,
          error: 'API Key não configurada'
        };
      }
      
      return {
        success: true,
        details: {
          auth: !!auth,
          apiKey: authConfig.apiKey ? 'Configurado' : 'Não configurado',
          authDomain: authConfig.authDomain,
          projectId: authConfig.projectId,
          timestamp: new Date().toISOString(),
          test: 'auth_only_test'
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        details: {
          code: error.code,
          stack: error.stack
        }
      };
    }
  }

  static async testFirebaseConnection(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const authTest = await this.testAuthOnly();
      if (!authTest.success) {
        return authTest;
      }
      
      if (!db) {
        return {
          success: false,
          error: 'Firestore não está configurado'
        };
      }
      
      try {
        const testDocRef = doc(db, '_system', 'connection-test');
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 3000);
        });
        
        const getDocPromise = getDoc(testDocRef);
        
        await Promise.race([getDocPromise, timeoutPromise]);
        
        return {
          success: true,
          details: {
            auth: !!auth,
            firestore: !!db,
            timestamp: new Date().toISOString(),
            test: 'firestore_read_success'
          }
        };
        
      } catch (firestoreError: any) {
        const errorMessage = firestoreError.message || '';
        const errorCode = firestoreError.code || '';
        
        if (errorCode === 'permission-denied' || 
            errorCode === 'not-found' ||
            errorMessage.includes('permission') ||
            errorMessage.includes('not found') ||
            errorMessage.includes('Missing or insufficient permissions')) {
          return {
            success: true,
            details: {
              auth: !!auth,
              firestore: !!db,
              timestamp: new Date().toISOString(),
              test: 'firestore_permission_test',
              error: errorMessage
            }
          };
        }
        
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          return {
            success: false,
            error: 'Timeout na conexão com Firebase',
            details: {
              auth: !!auth,
              firestore: !!db,
              error: errorMessage
            }
          };
        }
        
        if (errorCode === '400' || errorMessage.includes('400')) {
          try {
            if (db && db.app) {
              return {
                success: true,
                details: {
                  auth: !!auth,
                  firestore: !!db,
                  timestamp: new Date().toISOString(),
                  test: 'firestore_init_check',
                  warning: 'Erro 400 ignorado - Firestore inicializado'
                }
              };
            } else {
              return {
                success: false,
                error: 'Firestore não está inicializado corretamente',
                details: {
                  auth: !!auth,
                  firestore: !!db,
                  error: errorMessage,
                  code: errorCode
                }
              };
            }
          } catch (altError: any) {
            return {
              success: false,
              error: 'Erro 400 - Problema na configuração do Firebase',
              details: {
                auth: !!auth,
                firestore: !!db,
                error: errorMessage,
                code: errorCode,
                altError: altError.message
              }
            };
          }
        }
        
        return {
          success: false,
          error: `Erro na conexão com Firebase: ${errorMessage}`,
          details: {
            auth: !!auth,
            firestore: !!db,
            error: errorMessage,
            code: errorCode
          }
        };
      }
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
        details: {
          code: error.code,
          stack: error.stack
        }
      };
    }
  }

  static async testRegistration(): Promise<{
    success: boolean;
    error?: string;
    userId?: string;
  }> {
    try {
      const testEmail = `test-${Date.now()}@test.com`;
      const testPassword = '123456';
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      
      await userCredential.user.delete();
      
      return {
        success: true,
        userId: userCredential.user.uid
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  static async diagnoseInviteProblem(email: string): Promise<{
    success: boolean;
    issues: string[];
    details: any;
  }> {
    const issues: string[] = [];
    const details: any = {};

    try {
      const currentUser = await AuthService.getCurrentUser();
      details.currentUser = currentUser;
      
      if (!currentUser) {
        issues.push('❌ Usuário não está autenticado');
        return { success: false, issues, details };
      }
      
      if (currentUser.role !== 'admin') {
        issues.push('❌ Usuário não é administrador (role: ' + currentUser.role + ')');
        return { success: false, issues, details };
      }
      
      const currentSite = await AuthService.getCurrentSite();
      details.currentSite = currentSite;
      
      if (!currentSite) {
        issues.push('❌ Nenhum site selecionado');
        return { success: false, issues, details };
      }
      
      if (!currentUser.sites?.includes(currentSite.id)) {
        issues.push('❌ Usuário não tem acesso ao site atual');
        return { success: false, issues, details };
      }
      
      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', email),
        where('siteId', '==', currentSite.id),
        where('status', '==', 'pending')
      );
      const existingInvites = await getDocs(invitesQuery);
      details.existingInvites = existingInvites.size;
      
      if (!existingInvites.empty) {
        issues.push('❌ Já existe um convite pendente para este email nesta obra');
        return { success: false, issues, details };
      }
      
      const existingUser = await AuthService.getUserByEmail(email);
      details.existingUser = existingUser ? { id: existingUser.id, role: existingUser.role } : null;
      
      if (existingUser && existingUser.sites?.includes(currentSite.id)) {
        issues.push('❌ Este usuário já tem acesso a esta obra');
        return { success: false, issues, details };
      }
      
      const testInvite: Invite = {
        id: doc(collection(db, 'invites')).id,
        email,
        siteId: currentSite.id,
        siteName: currentSite.name,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'pending',
        invitedBy: currentUser.id,
      };
      
      details.testInvite = testInvite;
      
      try {
        const emailResult = await EmailService.sendAdminInvite({
          email: testInvite.email,
          siteName: testInvite.siteName ?? '',
          invitedBy: currentUser.name || 'Admin',
          inviteId: testInvite.id,
        });
        
        details.emailResult = emailResult;
        
        if (!emailResult.success) {
          issues.push('❌ EmailService falhou: ' + emailResult.error);
        } else {
        }
      } catch (emailError) {
        issues.push('❌ EmailService erro: ' + emailError);
        details.emailError = emailError;
      }
      
      return {
        success: issues.length === 0,
        issues,
        details
      };
      
    } catch (error) {
      issues.push('❌ Erro geral no diagnóstico: ' + error);
      return { success: false, issues, details };
    }
  }

  async deleteInvite(inviteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
    } catch (error) {
      throw error;
    }
  }

  static async debugAsyncStorage(): Promise<void> {
    try {
      const userData = await AsyncStorage.getItem(AuthService.USER_KEY);
      
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Usuário parseado:', user);
        console.log('Role:', user.role);
        console.log('Tipo do role:', typeof user.role);
        console.log('Email:', user.email);
        console.log('Nome:', user.name);
      } else {
        console.log('Nenhum dado encontrado no AsyncStorage');
      }
    } catch (error) {
    }
  }

  static async updateUserProfilePhoto(userId: string, photoURL: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), { photoURL });
    } catch (error) {
      throw error;
    }
  }
}
