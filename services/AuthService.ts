import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

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

class AuthenticationService {
  private readonly AUTH_KEY = '@auth_token';
  private readonly USER_KEY = '@user_data';
  private readonly SITE_KEY = '@current_site';

  // Demo users data
  private demoUsers = [
    {
      id: '1',
      name: 'João Silva',
      email: 'admin@construcao.com',
      password: 'admin123',
      role: 'admin' as const,
      sites: ['1', '2', '3'],
      company: 'Construtora Silva'
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'campo@construcao.com',
      password: 'campo123',
      role: 'worker' as const,
      sites: ['1'],
      phone: '(11) 98765-4321'
    }
  ];

  private demoSites = [
    {
      id: '1',
      name: 'Edifício Residencial Vila Nova',
      address: 'Rua das Flores, 123 - Centro'
    },
    {
      id: '2',
      name: 'Complexo Comercial Plaza',
      address: 'Av. Paulista, 456 - Bela Vista'
    },
    {
      id: '3',
      name: 'Condomínio Jardim Primavera',
      address: 'Rua dos Pinheiros, 789 - Jardins'
    }
  ];

  private demoInvites: Invite[] = [];

  async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Buscar dados adicionais do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data() as User;
      
      await AsyncStorage.setItem(this.AUTH_KEY, 'authenticated');
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
    phone?: string;
    company?: string;
    inviteId?: string;
  }): Promise<boolean> {
    try {
      // Se for trabalhador, verificar convite
      if (userData.role === 'worker') {
        if (!userData.inviteId) {
          throw new Error('Convite necessário para cadastro de trabalhador');
        }

        const inviteDoc = await getDoc(doc(db, 'invites', userData.inviteId));
        if (!inviteDoc.exists()) {
          throw new Error('Convite inválido ou expirado');
        }

        const invite = inviteDoc.data() as Invite;
        if (invite.status !== 'pending' || invite.email !== userData.email) {
          throw new Error('Convite inválido ou expirado');
        }

        // Marcar convite como aceito
        await updateDoc(doc(db, 'invites', userData.inviteId), {
          status: 'accepted'
        });
      }

      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      // Criar documento do usuário no Firestore
      const user: User = {
        id: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        company: userData.company,
        sites: userData.role === 'admin' ? [] : [invite?.siteId || '']
      };

      await setDoc(doc(db, 'users', user.id), user);

      // Fazer login automático
      await AsyncStorage.setItem(this.AUTH_KEY, 'authenticated');
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async createInvite(email: string, siteId: string): Promise<Invite> {
    try {
      const currentUser = await this.getCurrentUser();
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
        invitedBy: currentUser.id
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
      const currentUser = await this.getCurrentUser();
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
      return invitesSnapshot.docs.map(doc => doc.data() as Invite);
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

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(this.AUTH_KEY);
      await AsyncStorage.removeItem(this.USER_KEY);
      await AsyncStorage.removeItem(this.SITE_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(this.AUTH_KEY);
      return token === 'authenticated';
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getUserRole(): Promise<'admin' | 'worker' | null> {
    try {
      const user = await this.getCurrentUser();
      return user?.role || null;
    } catch (error) {
      console.error('Get user role error:', error);
      return null;
    }
  }

  async setCurrentSite(site: { id: string; name: string }): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SITE_KEY, JSON.stringify(site));
    } catch (error) {
      console.error('Set current site error:', error);
      throw error;
    }
  }

  async getCurrentSite(): Promise<{ id: string; name: string } | null> {
    try {
      const siteJson = await AsyncStorage.getItem(this.SITE_KEY);
      return siteJson ? JSON.parse(siteJson) : null;
    } catch (error) {
      console.error('Get current site error:', error);
      return null;
    }
  }

  async getUserSites(): Promise<Site[]> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      const demoUser = this.demoUsers.find(u => u.id === user.id);
      if (!demoUser) return [];

      return this.demoSites.filter(site => demoUser.sites.includes(site.id));
    } catch (error) {
      return [];
    }
  }

  async getUserProfile() {
    const user = await this.getCurrentUser();
    const site = await this.getCurrentSite();
    
    if (!user) throw new Error('User not found');

    return {
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company,
      siteName: site?.name || 'Nenhuma obra selecionada',
      joinDate: '2024-01-15'
    };
  }
}

export const AuthService = new AuthenticationService();