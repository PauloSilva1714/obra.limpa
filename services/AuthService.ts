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
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  phone?: string;
  company?: string;
  sites?: string[];
}

export interface Site {
  id: string;
  name: string;
  address: string;
}

export interface Invite {
  id: string;
  email: string;
  siteId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
}

export class AuthService {
  private static USER_KEY = 'user';
  static SITE_KEY = 'sua-chave-aqui';

  static async isAuthenticated(): Promise<boolean> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return !!userData;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
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
      // Simulação de autenticação
      if (email === 'admin@construcao.com' && password === 'admin123') {
        const user = {
          id: '1',
          name: 'João Silva',
          email: 'admin@construcao.com',
          role: 'admin',
        };
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
        console.log('Login bem-sucedido:', user);
        return true;
      }
      return false;
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
      };

      await setDoc(doc(db, 'users', user.id), user);

      // Fazer logout para garantir que o usuário faça login novamente
      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

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
        invitedBy: currentUser.id,
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
      sites: ['site1'],
    },
    {
      id: '2',
      name: 'Maria Souza',
      email: 'worker@construcao.com',
      role: 'worker',
      sites: ['site1'],
    },
  ];

  private demoSites: Site[] = [
    {
      id: 'site1',
      name: 'Obra Central',
      address: 'Rua Principal, 123',
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

  static getUserRole(): 'admin' | 'worker' {
    // Replace this with your actual logic to get the user role
    // For example, from AsyncStorage, a global variable, or a user object
    return 'worker'; // or 'admin'
  }
}
