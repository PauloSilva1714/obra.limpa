import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
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
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  status: 'active' | 'inactive';
  phone?: string;
  company?: string;
  sites?: string[];
  siteId?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  siteId: string;
  createdAt: string;
}

export class AuthService {
  private static USER_KEY = 'user';
  static SITE_KEY = 'sua-chave-aqui';
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
      // Verificar se há um usuário autenticado no Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // Se não houver usuário no Firebase, limpar dados locais
        await this.clearAuthData();
        return false;
      }

      // Verificar se há dados do usuário no AsyncStorage
      const userData = await this.getCurrentUser();
      return !!userData;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  }

  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_KEY);
      await AsyncStorage.removeItem(this.SITE_KEY);
      await signOut(auth);
      this.getInstance().currentUser = null;
    } catch (error) {
      console.error('Erro ao limpar dados de autenticação:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      console.log('Obtendo usuário atual...');
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      console.log('Dados do usuário:', userData);

      if (!userData) {
        console.log('Nenhum usuário encontrado');
        return null;
      }

      const user = JSON.parse(userData);
      console.log('Usuário carregado:', user);
      return user;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  static async getCurrentSite(): Promise<Site | null> {
    try {
      const siteData = await AsyncStorage.getItem(this.SITE_KEY);
      return siteData ? JSON.parse(siteData) : null;
    } catch (error) {
      console.error('Erro ao obter canteiro atual:', error);
      return null;
    }
  }

  static async setCurrentSite(site: Site | null): Promise<void> {
    try {
      if (site) {
        await AsyncStorage.setItem(this.SITE_KEY, JSON.stringify(site));
      } else {
        await AsyncStorage.removeItem(AuthService.SITE_KEY);
      }
    } catch (error) {
      console.error('Erro ao definir canteiro atual:', error);
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<boolean> {
    try {
      console.log('Tentando login com:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Buscar dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data() as User;
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(userData));
      console.log('Login bem-sucedido:', userData);
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  }

  static async logout(): Promise<void> {
    try {
      console.log('Fazendo logout...');
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);
      console.log('Logout concluído');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
    phone?: string;
    company?: string;
    siteName?: string;
    inviteId?: string;
  }): Promise<boolean> {
    try {
      let invite: Invite | undefined;

      // Se for trabalhador, verificar convite
      if (userData.role === 'worker') {
        if (!userData.inviteId) {
          throw new Error('Convite necessário para cadastro de trabalhador');
        }

        const inviteDoc = await getDoc(doc(db, 'invites', userData.inviteId));
        if (!inviteDoc.exists()) {
          throw new Error('Convite inválido ou expirado');
        }

        invite = inviteDoc.data() as Invite;
        if (invite.status !== 'pending' || invite.email !== userData.email) {
          throw new Error('Convite inválido ou expirado');
        }

        // Marcar convite como aceito
        await updateDoc(doc(db, 'invites', userData.inviteId), {
          status: 'accepted',
        });
      }

      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Se for admin, criar a obra
      let siteId = '';
      if (userData.role === 'admin' && userData.siteName) {
        const siteRef = doc(collection(db, 'sites'));
        siteId = siteRef.id;
        await setDoc(siteRef, {
          id: siteId,
          name: userData.siteName,
          address: '',
          createdBy: userCredential.user.uid,
          createdAt: new Date().toISOString(),
        });
      }

      // Criar documento do usuário no Firestore
      const user: User = {
        id: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        company: userData.company,
        sites: userData.role === 'admin' ? [siteId] : [invite?.siteId || ''],
        status: 'active',
        siteId: userData.role === 'admin' ? siteId : undefined,
      };

      await setDoc(doc(db, 'users', user.id), user);

      // Fazer logout para garantir que o usuário faça login novamente
      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      AuthService.getInstance().currentUser = user;
      await this.saveUserToStorage(user);

      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email já está em uso');
      }
      throw error;
    }
  }

  async createInvite(email: string, siteId: string): Promise<Invite> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem criar convites');
      }

      // Verificar se já existe um convite pendente
      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', email),
        where('status', '==', 'pending')
      );
      const existingInvites = await getDocs(invitesQuery);

      if (!existingInvites.empty) {
        throw new Error('Já existe um convite pendente para este email');
      }

      const invite: Invite = {
        id: doc(collection(db, 'invites')).id,
        email,
        siteId,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      await setDoc(doc(db, 'invites', invite.id), invite);
      return invite;
    } catch (error) {
      console.error('Create invite error:', error);
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
      return invitesSnapshot.docs.map((doc) => doc.data() as Invite);
    } catch (error) {
      console.error('Get invites error:', error);
      return [];
    }
  }

  async validateInvite(inviteId: string, email: string): Promise<boolean> {
    try {
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) return false;

      const invite = inviteDoc.data() as Invite;
      return invite.status === 'pending' && invite.email === email;
    } catch (error) {
      console.error('Validate invite error:', error);
      return false;
    }
  }

  // Demo users and sites for testing purposes
  private demoUsers: User[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'admin@construcao.com',
      role: 'admin',
      status: 'active',
      sites: ['site1'],
    },
    {
      id: '2',
      name: 'Maria Souza',
      email: 'worker@construcao.com',
      role: 'worker',
      status: 'active',
      sites: ['site1'],
    },
  ];

  private demoSites: Site[] = [
    {
      id: 'site1',
      name: 'Obra Central',
      address: 'Rua Principal, 123',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  static async getUserSites(): Promise<
    { id: string; name: string; address: string }[]
  > {
    // Exemplo de retorno fake
    return [
      { id: '1', name: 'Obra Centro', address: 'Rua A, 123' },
      { id: '2', name: 'Obra Norte', address: 'Av. B, 456' },
      { id: '3', name: 'Obra Sul', address: 'Rua C, 789' },
    ];
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
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      if (!userData) return 'worker';
      
      const user = JSON.parse(userData);
      return user.role;
    } catch (error) {
      console.error('Erro ao obter papel do usuário:', error);
      return 'worker';
    }
  }

  private async saveUserToStorage(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao salvar usuário no storage:', error);
      throw error;
    }
  }

  async getWorkers(): Promise<User[]> {
    try {
      const workersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'worker')
      );
      const snapshot = await getDocs(workersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Erro ao buscar trabalhadores:', error);
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
      console.error('Erro ao obter trabalhador:', error);
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
      console.error('Erro ao atualizar trabalhador:', error);
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
      console.error('Erro ao remover trabalhador:', error);
      throw error;
    }
  }

  async sendInvite(email: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      await addDoc(collection(db, 'invites'), {
        email,
        status: 'pending',
        siteId: currentUser.siteId,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
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
      console.error('Erro ao cancelar convite:', error);
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
      console.error('Erro ao obter obras:', error);
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
      console.error('Erro ao obter canteiro:', error);
      throw error;
    }
  }

  static async updateSite(siteId: string, updates: Partial<Site>): Promise<void> {
    try {
      await updateDoc(doc(db, 'sites', siteId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao atualizar canteiro:', error);
      throw error;
    }
  }

  static async deleteSite(siteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'sites', siteId));
    } catch (error) {
      console.error('Erro ao deletar canteiro:', error);
      throw error;
    }
  }
}

export default AuthService.getInstance();
