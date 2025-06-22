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
import { auth, db } from '@/config/firebase';
import { EmailService } from './EmailService';

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
  notifications?: {
    taskCreation?: boolean;
    taskUpdate?: boolean;
    loginConfirmation?: boolean;
  };
  inviteId?: string;
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
      if (!currentUser) {
        await AuthService.clearAuthData();
        return false;
      }
      const userData = await AuthService.getCurrentUser();
      return !!userData;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  }

  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);
      await signOut(auth);
      AuthService.getInstance().currentUser = null;
    } catch (error) {
      console.error('Erro ao limpar dados de autenticação:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(AuthService.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return null;
    }
  }

  static async getCurrentSite(): Promise<Site | null> {
    try {
      const siteData = await AsyncStorage.getItem(AuthService.SITE_KEY);
      return siteData ? JSON.parse(siteData) : null;
    } catch (error) {
      console.error('Erro ao obter canteiro atual:', error);
      return null;
    }
  }

  static async setCurrentSite(site: Site | null): Promise<void> {
    try {
      if (site) {
        await AsyncStorage.setItem(AuthService.SITE_KEY, JSON.stringify(site));
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data() as User;
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
        console.error('Erro ao enviar confirmação de login por email:', emailError);
      }

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  }

  static async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
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
  }): Promise<boolean> {
    console.log('AuthService.register called with:', userData);
    console.log('Role:', userData.role);
    console.log('InviteId:', userData.inviteId);
    console.log('SiteName:', userData.siteName);
    
    try {
      let invite: Invite | undefined;
      let siteId = '';

      // Se for colaborador, verificar convite
      if (userData.role === 'worker') {
        console.log('Processando registro de colaborador...');
        if (!userData.inviteId) {
          throw new Error('Convite necessário para cadastro de colaborador');
        }

        const inviteDoc = await getDoc(doc(db, 'invites', userData.inviteId));
        if (!inviteDoc.exists()) {
          throw new Error('Convite inválido ou expirado');
        }

        invite = inviteDoc.data() as Invite;
        console.log('Convite de colaborador encontrado:', invite);
        
        if (invite.status !== 'pending' || invite.email !== userData.email || invite.role !== 'worker') {
          throw new Error('Convite inválido ou expirado');
        }

        siteId = invite.siteId;
        console.log('SiteId do convite de colaborador:', siteId);

        // Marcar convite como aceito
        await updateDoc(doc(db, 'invites', userData.inviteId), {
          status: 'accepted',
        });
        console.log('Convite de colaborador marcado como aceito');
      }

      // Se for administrador com convite, verificar convite de admin
      if (userData.role === 'admin' && userData.inviteId) {
        console.log('Processando registro de administrador com convite...');
        const inviteDoc = await getDoc(doc(db, 'invites', userData.inviteId));
        if (!inviteDoc.exists()) {
          throw new Error('Convite inválido ou expirado');
        }

        invite = inviteDoc.data() as Invite;
        console.log('Convite de administrador encontrado:', invite);
        
        if (invite.status !== 'pending' || invite.email !== userData.email || invite.role !== 'admin') {
          console.log('Validação do convite falhou:');
          console.log('- Status esperado: pending, atual:', invite.status);
          console.log('- Email esperado:', userData.email, 'atual:', invite.email);
          console.log('- Role esperado: admin, atual:', invite.role);
          throw new Error('Convite inválido ou expirado');
        }

        siteId = invite.siteId;
        console.log('SiteId do convite de administrador:', siteId);

        // Marcar convite como aceito
        await updateDoc(doc(db, 'invites', userData.inviteId), {
          status: 'accepted',
        });
        console.log('Convite de administrador marcado como aceito');
      }

      // Criar usuário no Firebase Auth
      console.log('Criando usuário no Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      console.log('Usuário criado no Firebase Auth:', userCredential.user.uid);

      // Se for admin sem convite, criar nova obra
      if (userData.role === 'admin' && !userData.inviteId && userData.siteName) {
        console.log('Criando nova obra para administrador sem convite...');
        const siteRef = doc(collection(db, 'sites'));
        siteId = siteRef.id;
        await setDoc(siteRef, {
          id: siteId,
          name: userData.siteName,
          address: '',
          createdBy: userCredential.user.uid,
          createdAt: new Date().toISOString(),
        });
        console.log('Nova obra criada:', siteId);
      }

      // Criar documento do usuário no Firestore
      console.log('Criando documento do usuário no Firestore...');
      const user: User = {
        id: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        company: userData.company,
        sites: [siteId],
        status: 'active',
        siteId: userData.role === 'admin' ? siteId : undefined,
        inviteId: userData.inviteId,
      };
      console.log('Dados do usuário a serem salvos:', user);

      await setDoc(doc(db, 'users', user.id), user);
      console.log('Usuário salvo no Firestore');

      // Fazer logout para garantir que o usuário faça login novamente
      console.log('Fazendo logout...');
      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      AuthService.getInstance().currentUser = user;
      await AuthService.saveUserToStorageStatic(user);
      console.log('Usuário salvo no storage local');

      console.log('Registro concluído com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email já está em uso');
      }
      throw error;
    }
  }

  static async validateInvite(inviteId: string, email: string): Promise<boolean> {
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

  static async validateAdminInvite(inviteId: string, email: string): Promise<boolean> {
    try {
      console.log('Validando convite de administrador...');
      console.log('InviteId:', inviteId);
      console.log('Email:', email);
      
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) {
        console.log('Convite não encontrado no Firestore');
        return false;
      }

      const invite = inviteDoc.data() as Invite;
      console.log('Convite encontrado:', invite);
      
      const isValid = invite.status === 'pending' && invite.email === email && invite.role === 'admin';
      console.log('Validação do convite:');
      console.log('- Status é pending:', invite.status === 'pending');
      console.log('- Email corresponde:', invite.email === email);
      console.log('- Role é admin:', invite.role === 'admin');
      console.log('- Resultado final:', isValid);
      
      return isValid;
    } catch (error) {
      console.error('Validate admin invite error:', error);
      return false;
    }
  }

  static async testMethod(): Promise<string> {
    console.log('AuthService.testMethod called');
    return 'AuthService is working';
  }

  // Método de teste para verificar convites existentes
  static async debugInvites(): Promise<void> {
    try {
      console.log('=== DEBUG: Verificando convites existentes ===');
      
      const invitesQuery = query(collection(db, 'invites'));
      const invitesSnapshot = await getDocs(invitesQuery);
      
      console.log('Total de convites encontrados:', invitesSnapshot.size);
      
      invitesSnapshot.docs.forEach((doc, index) => {
        const invite = doc.data() as Invite;
        console.log(`Convite ${index + 1}:`, {
          id: doc.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          siteId: invite.siteId,
          createdAt: invite.createdAt
        });
      });
      
      console.log('=== FIM DEBUG ===');
    } catch (error) {
      console.error('Erro ao debugar convites:', error);
    }
  }

  // Método para verificar estrutura da coleção de convites
  static async checkInvitesCollection(): Promise<void> {
    try {
      console.log('=== VERIFICANDO ESTRUTURA DA COLEÇÃO DE CONVITES ===');
      
      const invitesQuery = query(collection(db, 'invites'));
      const invitesSnapshot = await getDocs(invitesQuery);
      
      console.log('Total de documentos na coleção invites:', invitesSnapshot.size);
      
      if (invitesSnapshot.empty) {
        console.log('A coleção de convites está vazia');
        return;
      }
      
      // Verificar estrutura do primeiro documento
      const firstDoc = invitesSnapshot.docs[0];
      const firstInvite = firstDoc.data();
      console.log('Estrutura do primeiro convite:', Object.keys(firstInvite));
      console.log('Dados do primeiro convite:', firstInvite);
      
      // Verificar se todos os documentos têm os campos obrigatórios
      let validInvites = 0;
      let invalidInvites = 0;
      
      invitesSnapshot.docs.forEach((doc, index) => {
        const invite = doc.data();
        const hasRequiredFields = invite.email && invite.role && invite.status && invite.siteId;
        
        if (hasRequiredFields) {
          validInvites++;
        } else {
          invalidInvites++;
          console.log(`Convite inválido ${index + 1}:`, invite);
        }
      });
      
      console.log(`Convites válidos: ${validInvites}`);
      console.log(`Convites inválidos: ${invalidInvites}`);
      console.log('=== FIM VERIFICAÇÃO ===');
    } catch (error) {
      console.error('Erro ao verificar coleção de convites:', error);
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
      console.error('Erro ao salvar usuário no storage:', error);
      throw error;
    }
  }

  async createInvite(email: string, siteId: string): Promise<Invite> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem criar convites');
      }

      // Verificar se já existe um convite pendente para este email nesta obra
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

      // Obter informações da obra
      const site = await AuthService.getSiteById(siteId);
      if (!site) {
        throw new Error('Obra não encontrada');
      }

      const invite: Invite = {
        id: doc(collection(db, 'invites')).id,
        email,
        siteId,
        createdAt: new Date().toISOString(),
        status: 'pending',
        role: 'worker',
        invitedBy: currentUser.id,
      };

      // Salvar o convite no Firestore
      await setDoc(doc(db, 'invites', invite.id), invite);

      // Enviar email de convite
      try {
        await EmailService.sendWorkerInvite({
          email: invite.email,
          siteName: site.name,
          invitedBy: currentUser.name,
          inviteId: invite.id,
        });
        console.log('Email de convite de colaborador enviado com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email de convite:', emailError);
        // Não falhar o processo se o email não for enviado
        // O convite ainda é criado no banco
      }

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
      return invitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Invite);
    } catch (error) {
      console.error('Get invites error:', error);
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
  }): Promise<boolean> {
    console.log('AuthService.registerStatic called with:', userData);
    const instance = AuthService.getInstance();
    return instance.register(userData);
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
  }): Promise<boolean> {
    console.log('AuthService.registerCompletelyStatic called with:', userData);
    
    try {
      // Implementação simplificada para teste
      console.log('Tentando criar usuário no Firebase Auth...');
      
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      
      console.log('Usuário criado no Firebase Auth:', userCredential.user.uid);
      
      // Criar documento do usuário no Firestore
      const user: User = {
        id: userCredential.user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        company: userData.company,
        sites: [],
        status: 'active',
        inviteId: userData.inviteId,
      };

      await setDoc(doc(db, 'users', user.id), user);
      console.log('Usuário salvo no Firestore');

      // Fazer logout para garantir que o usuário faça login novamente
      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      console.log('Registro concluído com sucesso');
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email já está em uso');
      }
      throw error;
    }
  }

  static async getUserSites(): Promise<Site[]> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const sitesQuery = query(
        collection(db, 'sites'),
        where('createdBy', '==', currentUser.id)
      );
      const sitesSnapshot = await getDocs(sitesQuery);
      
      return sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Site));
    } catch (error) {
      console.error('Erro ao obter obras do usuário:', error);
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
      console.log('=== DEBUG: getUserRole ===');
      const userData = await AsyncStorage.getItem(AuthService.USER_KEY);
      console.log('Dados do usuário no AsyncStorage:', userData);
      
      if (!userData) {
        console.log('Nenhum usuário encontrado, retornando worker');
        return 'worker';
      }
      
      const user = JSON.parse(userData);
      console.log('Usuário parseado:', user);
      console.log('Role do usuário:', user.role);
      console.log('=== FIM DEBUG getUserRole ===');
      return user.role;
    } catch (error) {
      console.error('Erro ao obter papel do usuário:', error);
      return 'worker';
    }
  }

  async getWorkers(): Promise<User[]> {
    try {
      console.log('[getWorkers] Iniciando busca de colaboradores...');
      const workersSnapshot = await getDocs(collection(db, 'users'));
      console.log('[getWorkers] Total de usuários encontrados:', workersSnapshot.size);
      
      const workers = workersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('[getWorkers] Colaborador encontrado:', { id: doc.id, name: data.name, email: data.email, inviteId: data.inviteId });
          return {
            id: doc.id,
            ...data
          } as User;
        })
        .filter(worker => !!worker.inviteId); // Filtrar apenas quem veio de convite
      
      console.log('[getWorkers] Lista final de colaboradores (apenas convidados):', workers.map(w => ({ id: w.id, name: w.name, email: w.email })));
      return workers;
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
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
      console.error('Erro ao obter colaborador:', error);
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
      console.error('Erro ao atualizar colaborador:', error);
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
      console.error('Erro ao remover colaborador:', error);
      throw error;
    }
  }

  async sendInvite(email: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o site selecionado no AsyncStorage ou usar o primeiro da lista
      let siteId: string | undefined;
      const selectedSite = await AsyncStorage.getItem(AuthService.SITE_KEY);
      if (selectedSite) {
        siteId = JSON.parse(selectedSite).id;
      } else if (currentUser.sites && currentUser.sites.length > 0) {
        siteId = currentUser.sites[0];
      }
      if (!siteId) {
        throw new Error('Nenhum canteiro selecionado para o convite.');
      }

      await addDoc(collection(db, 'invites'), {
        email,
        status: 'pending',
        siteId,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      throw error;
    }
  }

  async cancelInvite(inviteId: string): Promise<void> {
    try {
      console.log('[cancelInvite] Tentando cancelar convite:', inviteId);
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      console.log('[cancelInvite] Convite cancelado com sucesso:', inviteId);
    } catch (error) {
      console.error('[cancelInvite] Erro ao cancelar convite:', error);
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

      const now = new Date().toISOString();
      const newSite = {
        ...siteData,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser.id,
      };

      const docRef = await addDoc(collection(db, 'sites'), newSite);
      
      // Adicionar a obra à lista de obras do usuário
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
      console.error('Erro ao criar obra:', error);
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
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem atualizar obras');
      }

      // Verificar se a obra pertence ao usuário
      const siteDoc = await getDoc(doc(db, 'sites', siteId));
      if (!siteDoc.exists()) {
        throw new Error('Obra não encontrada');
      }

      const siteData = siteDoc.data() as Site;
      if (siteData.createdBy !== currentUser.id) {
        throw new Error('Você não tem permissão para atualizar esta obra');
      }

      // Atualizar a obra
      await updateDoc(doc(db, 'sites', siteId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      throw error;
    }
  }

  static async deleteSite(siteId: string): Promise<void> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir obras');
      }

      // Verificar se a obra pertence ao usuário
      const siteDoc = await getDoc(doc(db, 'sites', siteId));
      if (!siteDoc.exists()) {
        throw new Error('Obra não encontrada');
      }

      const siteData = siteDoc.data() as Site;
      if (siteData.createdBy !== currentUser.id) {
        throw new Error('Você não tem permissão para excluir esta obra');
      }

      // Excluir a obra
      await deleteDoc(doc(db, 'sites', siteId));

      // Atualizar a lista de obras do usuário
      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const updatedSites = userData.sites?.filter(id => id !== siteId) || [];
        await updateDoc(userRef, { sites: updatedSites });
      }
    } catch (error) {
      console.error('Erro ao excluir obra:', error);
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

      // Update local user data
      const instance = AuthService.getInstance();
      if (instance.currentUser && instance.currentUser.id === userId) {
        instance.currentUser.notifications = settings;
        await instance.saveUserToStorage(instance.currentUser);
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
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
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuário não autenticado');
      }

      // Reautenticar o usuário antes de alterar a senha
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Alterar a senha
      await updatePassword(currentUser, newPassword);

      console.log('Senha alterada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // Verificar se o email existe no sistema
      const user = await AuthService.getUserByEmail(email);
      if (!user) {
        throw new Error('Email não encontrado no sistema');
      }

      // Enviar email de redefinição de senha
      await sendPasswordResetEmail(auth, email);
      
      console.log('Email de redefinição de senha enviado com sucesso');
    } catch (error: any) {
      console.error('Erro ao enviar email de redefinição de senha:', error);
      
      // Se o erro for do Firebase Auth sobre email não encontrado, mas temos o usuário no Firestore
      if (error.code === 'auth/user-not-found') {
        // Verificar novamente no Firestore
        const user = await AuthService.getUserByEmail(email);
        if (user) {
          // Se o usuário existe no Firestore mas não no Firebase Auth, pode ser um problema de sincronização
          throw new Error('Problema de sincronização. Entre em contato com o administrador.');
        } else {
          throw new Error('Email não encontrado no sistema');
        }
      }
      
      throw error;
    }
  }

  // Métodos para gerenciar convites de administradores
  static async createAdminInvite(email: string, siteId: string): Promise<Invite> {
    try {
      console.log('Criando convite de administrador...');
      console.log('Email:', email);
      console.log('SiteId:', siteId);
      
      const currentUser = await AuthService.getCurrentUser();
      console.log('Usuário atual:', currentUser);
      
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem convidar outros administradores');
      }

      // Verificar se o usuário tem acesso à obra
      if (!currentUser.sites?.includes(siteId)) {
        throw new Error('Você não tem permissão para convidar administradores para esta obra');
      }

      // Verificar se já existe um convite pendente para este email nesta obra
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

      // Verificar se o email já é um usuário no sistema
      const existingUser = await AuthService.getUserByEmail(email);
      if (existingUser) {
        // Verificar se o usuário já tem acesso a esta obra
        if (existingUser.sites?.includes(siteId)) {
          throw new Error('Este usuário já tem acesso a esta obra');
        }
      }

      // Obter informações da obra
      const site = await AuthService.getSiteById(siteId);
      if (!site) {
        throw new Error('Obra não encontrada');
      }

      const invite: Invite = {
        id: doc(collection(db, 'invites')).id,
        email,
        siteId,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'pending',
        invitedBy: currentUser.id,
      };

      console.log('Convite a ser criado:', invite);

      // Salvar o convite no Firestore
      await setDoc(doc(db, 'invites', invite.id), invite);
      console.log('Convite salvo no Firestore com ID:', invite.id);

      // Enviar email de convite
      try {
        await EmailService.sendAdminInvite({
          email: invite.email,
          siteName: site.name,
          invitedBy: currentUser.name,
          inviteId: invite.id,
        });
        console.log('Email de convite de administrador enviado com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email de convite:', emailError);
        // Não falhar o processo se o email não for enviado
        // O convite ainda é criado no banco
      }

      return invite;
    } catch (error) {
      console.error('Create admin invite error:', error);
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
      console.error('Get admin invites error:', error);
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
      console.error('Error getting site admins:', error);
      return [];
    }
  }

  static async cancelAdminInvite(inviteId: string): Promise<void> {
    try {
      console.log('Iniciando cancelamento do convite:', inviteId);
      
      const currentUser = await AuthService.getCurrentUser();
      console.log('Usuário atual:', currentUser);
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      if (currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem cancelar convites');
      }

      console.log('Buscando convite no Firestore...');
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      
      if (!inviteDoc.exists()) {
        throw new Error('Convite não encontrado');
      }

      const invite = inviteDoc.data() as Invite;
      console.log('Convite encontrado:', invite);
      
      // Verificar se o usuário tem permissão para cancelar este convite
      console.log('Verificando permissões...');
      console.log('Sites do usuário:', currentUser.sites);
      console.log('Site do convite:', invite.siteId);
      
      if (!currentUser.sites || currentUser.sites.length === 0) {
        throw new Error('Usuário não tem acesso a nenhuma obra');
      }
      
      if (!currentUser.sites.includes(invite.siteId)) {
        throw new Error('Você não tem permissão para cancelar este convite');
      }

      // Verificar se é um convite de administrador
      if (invite.role !== 'admin') {
        throw new Error('Este não é um convite de administrador');
      }

      // Verificar se o convite ainda está pendente
      if (invite.status !== 'pending') {
        throw new Error('Apenas convites pendentes podem ser cancelados');
      }

      console.log('Atualizando status do convite para rejected...');
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });
      
      console.log('Convite cancelado com sucesso');
    } catch (error) {
      console.error('Cancel admin invite error:', error);
      throw error;
    }
  }

  static async deleteAdminInvite(inviteId: string): Promise<void> {
    try {
      console.log('Iniciando exclusão do convite:', inviteId);
      
      const currentUser = await AuthService.getCurrentUser();
      console.log('Usuário atual:', currentUser);
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      if (currentUser.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir convites');
      }

      console.log('Buscando convite no Firestore...');
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      
      if (!inviteDoc.exists()) {
        throw new Error('Convite não encontrado');
      }

      const invite = inviteDoc.data() as Invite;
      console.log('Convite encontrado:', invite);
      
      // Verificar se o usuário tem permissão para excluir este convite
      console.log('Verificando permissões...');
      console.log('Sites do usuário:', currentUser.sites);
      console.log('Site do convite:', invite.siteId);
      
      if (!currentUser.sites || currentUser.sites.length === 0) {
        throw new Error('Usuário não tem acesso a nenhuma obra');
      }
      
      if (!currentUser.sites.includes(invite.siteId)) {
        throw new Error('Você não tem permissão para excluir este convite');
      }

      // Verificar se é um convite de administrador
      if (invite.role !== 'admin') {
        throw new Error('Este não é um convite de administrador');
      }

      // Verificar se o convite está rejeitado ou cancelado
      if (invite.status === 'pending') {
        throw new Error('Apenas convites rejeitados ou cancelados podem ser excluídos');
      }

      console.log('Excluindo convite do Firestore...');
      await deleteDoc(doc(db, 'invites', inviteId));
      
      console.log('Convite excluído com sucesso');
    } catch (error) {
      console.error('Delete admin invite error:', error);
      throw error;
    }
  }

  // Método estático para salvar usuário no storage
  private static async saveUserToStorageStatic(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao salvar usuário no storage:', error);
      throw error;
    }
  }
}
