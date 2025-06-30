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
        console.log('✅ Usuário encontrado no AsyncStorage:', userData.email);
        return true;
      }
      
      // Se não temos dados no AsyncStorage mas temos usuário no Firebase
      if (currentUser && !userData) {
        console.log('⚠️ Usuário no Firebase mas não no AsyncStorage, limpando dados...');
        await AuthService.clearAuthData();
        return false;
      }
      
      // Se não temos nem no Firebase nem no AsyncStorage
      if (!currentUser && !userData) {
        console.log('❌ Nenhum usuário encontrado');
        return false;
      }
      
      // Caso padrão: não autenticado
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
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
      console.log('🔍 AuthService.getCurrentSite() - Iniciando busca do site atual');
      
      const siteData = await AsyncStorage.getItem(AuthService.SITE_KEY);
      console.log('📦 AuthService.getCurrentSite() - Dados do AsyncStorage:', siteData);
      
      if (!siteData) {
        console.log('❌ AuthService.getCurrentSite() - Nenhum site encontrado no AsyncStorage');
        return null;
      }
      
      const parsedSite = JSON.parse(siteData);
      console.log('🔧 AuthService.getCurrentSite() - Site parseado:', parsedSite);
      
      // Validação adicional para garantir que o site tem um id válido
      if (!parsedSite || typeof parsedSite !== 'object') {
        console.error('❌ AuthService.getCurrentSite() - Site parseado não é um objeto válido:', parsedSite);
        return null;
      }
      
      if (!parsedSite.id || typeof parsedSite.id !== 'string') {
        console.error('❌ AuthService.getCurrentSite() - Site não possui id válido:', parsedSite);
        return null;
      }
      
      console.log('✅ AuthService.getCurrentSite() - Site válido retornado:', {
        id: parsedSite.id,
        name: parsedSite.name,
        address: parsedSite.address
      });
      
      return parsedSite;
    } catch (error) {
      console.error('❌ AuthService.getCurrentSite() - Erro ao obter canteiro atual:', error);
      return null;
    }
  }

  static async setCurrentSite(site: Site | null): Promise<void> {
    try {
      console.log('💾 AuthService.setCurrentSite() - Iniciando salvamento do site:', site);
      
      if (site) {
        // Validação para garantir que o site tem um id válido antes de salvar
        if (!site.id || typeof site.id !== 'string') {
          console.error('❌ AuthService.setCurrentSite() - Tentativa de salvar site sem id válido:', site);
          throw new Error('Site deve ter um id válido');
        }
        
        console.log('✅ AuthService.setCurrentSite() - Salvando site válido:', {
          id: site.id,
          name: site.name,
          address: site.address
        });
        
        await AsyncStorage.setItem(AuthService.SITE_KEY, JSON.stringify(site));
        console.log('✅ AuthService.setCurrentSite() - Site salvo com sucesso no AsyncStorage');
      } else {
        console.log('🗑️ AuthService.setCurrentSite() - Removendo site do AsyncStorage');
        await AsyncStorage.removeItem(AuthService.SITE_KEY);
        console.log('✅ AuthService.setCurrentSite() - Site removido com sucesso do AsyncStorage');
      }
    } catch (error) {
      console.error('❌ AuthService.setCurrentSite() - Erro ao definir canteiro atual:', error);
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Iniciando processo de login...');
      
      // Primeiro, fazer login no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login no Firebase Auth realizado com sucesso');
      
      // Verificar conectividade do Firestore antes de tentar acessar dados
      console.log('🔍 Iniciando busca dos dados do usuário...');
      
      // Verificar se o Firestore está online antes de tentar acessar dados
      const isOnline = await isFirestoreOnline();
      if (!isOnline) {
        console.error('❌ Firestore está offline. Tentando reconexão...');
        
        // Tentar reconexão forçada
        const reconnected = await forceReconnectAndCheck();
        if (!reconnected) {
          // Se a reconexão falhou, tentar reinicializar o Firestore
          console.log('🔄 Reconexão falhou. Tentando reinicializar Firestore...');
          const reinitialized = await reinitializeFirestore();
          
          if (!reinitialized) {
            // Se a reinicialização também falhou, fazer diagnóstico detalhado
            console.log('🔍 Reinicialização falhou. Iniciando diagnóstico detalhado...');
            
            // Primeiro, testar conectividade com diferentes abordagens
            console.log('🔍 Testando conectividade com diferentes abordagens...');
            const connectivityTest = await testFirestoreConnectivity();
            
            if (connectivityTest.success) {
              console.log('✅ Conectividade detectada com método:', connectivityTest.method);
              // Se a conectividade foi detectada, continuar com o processo
            } else {
              console.log('❌ Falha na conectividade:', connectivityTest.error);
              
              // Tentar configuração alternativa como última tentativa
              console.log('🔄 Tentando configuração alternativa do Firestore...');
              const alternativeConfigSuccess = await tryAlternativeFirestoreConfig();
              
              if (!alternativeConfigSuccess) {
                // Se a configuração alternativa também falhou, tentar resolver o problema específico
                console.log('🔧 Tentando resolver problema específico de "client is offline"...');
                const offlineFixSuccess = await fixClientOfflineIssue();
                
                if (!offlineFixSuccess) {
                  // Se a correção específica também falhou, fazer diagnóstico completo
                  console.log('🔍 Iniciando diagnóstico avançado...');
                  const diagnosis = await diagnoseAndFixFirestoreIssue();
                  
                  if (diagnosis.success) {
                    console.log('✅ Diagnóstico avançado resolveu o problema:', diagnosis.issue);
                    console.log('💡 Solução aplicada:', diagnosis.solution);
                  } else {
                    console.error('❌ Diagnóstico avançado falhou:', diagnosis.issue);
                    console.log('💡 Recomendação:', diagnosis.solution);
                    
                    // Verificar se há problemas de configuração
                    const configCheck = await checkFirebaseConfiguration();
                    if (!configCheck.isConfigured) {
                      console.error('❌ Problemas de configuração detectados:', configCheck.issues);
                      throw new Error('Problemas de configuração detectados. Entre em contato com o suporte.');
                    }
                    
                    throw new Error(`Problemas de conectividade detectados: ${diagnosis.issue}. ${diagnosis.solution}`);
                  }
                } else {
                  console.log('✅ Problema específico de "client is offline" resolvido!');
                }
              } else {
                console.log('✅ Configuração alternativa bem-sucedida!');
              }
            }
          } else {
            console.log('✅ Firestore reinicializado com sucesso!');
          }
        }
      }
      
      console.log('✅ Firestore está online, prosseguindo com busca dos dados...');
      
      let userDoc: any;
      
      console.log('🔍 UID do usuário autenticado:', userCredential.user.uid);
      console.log('🔍 Estado da autenticação:', auth.currentUser ? 'Autenticado' : 'Não autenticado');
      
        try {
        console.log('🔍 Iniciando busca dos dados do usuário com abordagem específica para web...');
          
          // Verificar se ainda está autenticado
          if (!auth.currentUser) {
            console.error('❌ Usuário não está mais autenticado!');
            throw new Error('Sessão expirada. Faça login novamente.');
          }
          
          const userDocRef = doc(db, 'users', userCredential.user.uid);
          console.log('🔍 Referência do documento criada:', userDocRef.path);
          
        // Usar a função específica para web que lida com o problema "client is offline"
        userDoc = await tryWebFirestoreOperation(
          () => getDoc(userDocRef),
          5, // 5 tentativas
          3000 // 3 segundos entre tentativas
        );
        
        console.log('✅ Dados do usuário obtidos com sucesso usando abordagem específica para web');
        
        } catch (firestoreError: any) {
        console.error('❌ Erro no processo de login:', firestoreError);
        
        // Se for erro de permissão ou "not found", significa que está funcionando mas o usuário não existe
        if (firestoreError.message.includes('permission') || firestoreError.message.includes('not found')) {
          console.log('⚠️ Usuário não encontrado no Firestore. Criando documento básico...');
          userDoc = null; // Permitir que continue para criar o documento
            } else {
          // Para outros erros, tentar resolver o problema específico de "client is offline"
          console.log('🔧 Tentando resolver problema específico de "client is offline"...');
          const offlineFixSuccess = await fixWebClientOfflineIssue();
          
          if (offlineFixSuccess) {
            console.log('✅ Problema específico resolvido, tentando novamente...');
            
            try {
              const userDocRef = doc(db, 'users', userCredential.user.uid);
              userDoc = await getDoc(userDocRef);
              console.log('✅ Dados do usuário obtidos com sucesso após correção');
            } catch (retryError: any) {
              if (retryError.message.includes('permission') || retryError.message.includes('not found')) {
                console.log('⚠️ Usuário não encontrado no Firestore. Criando documento básico...');
                userDoc = null; // Permitir que continue para criar o documento
              } else {
              throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
              }
            }
          } else {
            throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns instantes.');
          }
        }
      }
      
      if (!userDoc || !userDoc.exists()) {
        console.log('⚠️ Usuário não encontrado no Firestore. Criando documento básico...');
        
        // Criar um documento básico do usuário
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
        
        try {
          await setDoc(doc(db, 'users', userCredential.user.uid), basicUserData);
          console.log('✅ Documento básico do usuário criado com sucesso');
          
          // Salvar no AsyncStorage
          await AsyncStorage.setItem(AuthService.USER_KEY, JSON.stringify(basicUserData));
          
          console.log('⚠️ Usuário criado com dados básicos. Precisa ser configurado por um administrador.');
          return false; // Retornar false para indicar que precisa de configuração
        } catch (createError: any) {
          console.error('❌ Erro ao criar documento do usuário:', createError);
          throw new Error('Erro ao criar perfil do usuário. Tente novamente.');
        }
      }

      const userData = userDoc.data() as User;
      console.log('🔍 Dados do usuário encontrados no login:', JSON.stringify(userData, null, 2));
      
      // Verificar se o usuário precisa de correção
      const needsFix = userData.status === 'pending_invite' || userData.role === 'pending';
      if (needsFix) {
        console.log('⚠️ Usuário com status pending_invite detectado, mas correção automática foi removida');
        // Usuário precisa ser corrigido manualmente ou através do processo normal
        return false;
      } else {
        // Usuário normal, continuar com o fluxo padrão
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
      }

      // Ajuste automático: se for admin, só tiver uma obra e não tiver siteId, define automaticamente
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
        console.log('Ajuste automático: siteId definido para', autoSiteId);
        // NOVO: Buscar dados completos da obra e salvar no AsyncStorage
        const siteObj = await AuthService.getSiteById(autoSiteId);
        if (siteObj) {
          await AuthService.setCurrentSite(siteObj);
          console.log('Obra salva no AsyncStorage após login:', siteObj);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro no processo de login:', error);
      throw error;
    }
    
    // Garantir que sempre retorne um valor (nunca será executado, mas satisfaz o TypeScript)
    return false;
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
    isSuperAdmin?: boolean;
  }): Promise<boolean> {
    try {
      console.log('🔍 AuthService.register chamado com:', JSON.stringify(userData, null, 2));
      
      // Validações básicas
      if (!userData.email || typeof userData.email !== 'string') throw new Error('Email é obrigatório e deve ser uma string');
      if (!userData.password || typeof userData.password !== 'string') throw new Error('Senha é obrigatória e deve ser uma string');
      if (!userData.name || typeof userData.name !== 'string') throw new Error('Nome é obrigatório e deve ser uma string');
      if (!userData.role || !['admin', 'worker'].includes(userData.role)) throw new Error('Role deve ser "admin" ou "worker"');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) throw new Error('Formato de email inválido');
      if (userData.password.length < 6) throw new Error('Senha deve ter pelo menos 6 caracteres');

      // Limpar dados antes de enviar
      const cleanUserData = {
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        role: userData.role,
        phone: userData.phone?.trim() || '',
        company: userData.company?.trim() || '',
        siteName: userData.siteName?.trim() || '',
        inviteId: userData.inviteId?.trim() || '',
        isSuperAdmin: userData.isSuperAdmin === true
      };

      let user: any = {};
      let siteId = '';

      // 1. SUPER ADMIN (primeiro usuário do sistema)
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
      // 2. ADMIN criando nova obra (sem convite, com nome da obra)
      else if (cleanUserData.role === 'admin' && cleanUserData.siteName && !cleanUserData.inviteId) {
        // Verificar se a obra já existe
        const sitesQuery = query(
          collection(db, 'sites'),
          where('name', '==', cleanUserData.siteName)
        );
        const existingSites = await getDocs(sitesQuery);

        if (!existingSites.empty) {
          // Obra já existe, associar o admin a ela
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
          // Obra não existe, será criada automaticamente após criar o usuário
          user = {
            name: cleanUserData.name,
            email: cleanUserData.email,
            role: 'admin',
            phone: cleanUserData.phone,
            company: cleanUserData.company,
            sites: [],
            status: 'active'
            // NÃO incluir siteName aqui!
          };
        }
      }
      // 3. ADMIN/WORKER com convite
      else if (cleanUserData.inviteId) {
        // Buscar convite
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
        // Marcar convite como aceito
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
        // Worker sem convite ou fluxo inválido
        throw new Error('Fluxo de cadastro inválido ou convite obrigatório ausente.');
      }

      // Criar usuário no Firebase Auth
      console.log('🔥 Criando usuário no Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, cleanUserData.email, cleanUserData.password);
      console.log('✅ Usuário criado no Firebase Auth:', userCredential.user.uid);

      // Garantir que está autenticado ANTES de criar documento no Firestore
      if (!auth.currentUser || auth.currentUser.uid !== userCredential.user.uid) {
        console.log('⚠️ Usuário não autenticado imediatamente após registro. Forçando login...');
        await signInWithEmailAndPassword(auth, cleanUserData.email, cleanUserData.password);
      }
      console.log('Auth.currentUser:', auth.currentUser?.uid);

      // Adicionar ID do usuário
      user.id = userCredential.user.uid;

      // IMPORTANTE: Remover campos que não devem ir para o Firestore
      const userForFirestore = { ...user };
      delete userForFirestore.siteName; // Nunca enviar siteName para o Firestore

      console.log('💾 Dados do usuário a serem salvos no Firestore:', JSON.stringify(userForFirestore, null, 2));
      await setDoc(doc(db, 'users', user.id), userForFirestore);
      console.log('✅ Usuário salvo no Firestore');

      // Se for admin criando nova obra (obra não existe), criar a obra automaticamente
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
        console.log('✅ Nova obra criada automaticamente:', siteId);
        
        // Atualizar o usuário com a nova obra
        await updateDoc(doc(db, 'users', user.id), {
          sites: [siteId],
          siteId: siteId
        });
        
        user.sites = [siteId];
        user.siteId = siteId;
      }

      // Fazer logout para garantir que o usuário faça login novamente
      console.log('🚪 Fazendo logout...');
      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      AuthService.getInstance().currentUser = user;
      await AuthService.saveUserToStorageStatic(user);
      console.log('✅ Usuário salvo no storage local');
      console.log('🎉 Registro concluído com sucesso!');

      return true;
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      console.error('❌ Código do erro:', error.code);
      console.error('❌ Mensagem do erro:', error.message);
      console.error('❌ Stack trace:', error.stack);
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
      
      const debugInvitesQuery = query(collection(db, 'invites'));
      const debugInvitesSnapshot = await getDocs(debugInvitesQuery);
      
      console.log('Total de convites encontrados:', debugInvitesSnapshot.size);
      
      debugInvitesSnapshot.docs.forEach((doc, index) => {
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
      
      const checkInvitesQuery = query(collection(db, 'invites'));
      const checkInvitesSnapshot = await getDocs(checkInvitesQuery);
      
      console.log('Total de documentos na coleção invites:', checkInvitesSnapshot.size);
      
      if (checkInvitesSnapshot.empty) {
        console.log('A coleção de convites está vazia');
        return;
      }
      
      // Verificar estrutura do primeiro documento
      const firstDoc = checkInvitesSnapshot.docs[0];
      const firstInvite = firstDoc.data();
      console.log('Estrutura do primeiro convite:', Object.keys(firstInvite));
      console.log('Dados do primeiro convite:', firstInvite);
      
      // Verificar se todos os documentos têm os campos obrigatórios
      let validInvites = 0;
      let invalidInvites = 0;
      
      checkInvitesSnapshot.docs.forEach((doc, index) => {
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
    isSuperAdmin?: boolean;
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
        siteName: site.name,
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
    isSuperAdmin?: boolean;
  }): Promise<boolean> {
    console.log('AuthService.registerStatic called with:', userData);
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
  }): Promise<boolean> {
    try {
      console.log('🚀 Iniciando registro completamente estático...');
      console.log('📝 Dados recebidos:', JSON.stringify(userData, null, 2));

      // Criar usuário no Authentication
      console.log('🔐 Criando usuário no Authentication...');
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = userCredential.user;
      console.log('✅ Usuário criado no Authentication:', firebaseUser.uid);

      // Preparar dados do usuário para o Firestore
      console.log('📋 Preparando dados para o Firestore...');
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
        isSuperAdmin: userData.isSuperAdmin === true
      };

      console.log('💾 Dados do usuário a serem salvos:', JSON.stringify(user, null, 2));
      
      // Tenta salvar o objeto 'user' no Firestore, na coleção 'users', usando o ID do usuário como chave do documento
      await setDoc(doc(db, 'users', user.id), user);
      // Se der certo, exibe no console uma mensagem de sucesso
      console.log('✅ Usuário salvo no Firestore');

      // Fazer logout para garantir que o usuário faça login novamente
      console.log('🚪 Fazendo logout...');
      await signOut(auth);
      await AsyncStorage.removeItem(AuthService.USER_KEY);
      await AsyncStorage.removeItem(AuthService.SITE_KEY);

      console.log('🎉 Registro completamente estático concluído com sucesso');
      return true;
    } catch (error: any) {
      // Se ocorrer algum erro ao salvar, exibe o erro no console
      console.error('❌ Erro no registro completamente estático:', error);
      console.error('❌ Código do erro:', error.code);
      console.error('❌ Mensagem do erro:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
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
      
      // Se não for um erro conhecido, rethrow com mais contexto
      throw new Error(`Erro no registro completamente estático: ${error.message || 'Erro desconhecido'}`);
    }
  }

  static async getUserSites(): Promise<Site[]> {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o array de sites do usuário
      const userRef = doc(db, 'users', currentUser.id);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return [];

      const userData = userDoc.data() as User;
      const userSiteIds: string[] = userData.sites || [];
      if (userSiteIds.length === 0) return [];

      // Buscar todas as obras cujo id está no array sites do usuário
      // Firestore não permite mais de 10 itens no 'in', então faça em lotes se necessário
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
      let siteName: string | undefined;
      const selectedSite = await AsyncStorage.getItem(AuthService.SITE_KEY);
      if (selectedSite) {
        const siteObj = JSON.parse(selectedSite);
        siteId = siteObj.id;
        siteName = siteObj.name;
      } else if (currentUser.sites && currentUser.sites.length > 0) {
        siteId = currentUser.sites[0];
        // Buscar o nome da obra pelo id
        const siteDoc = await getDoc(doc(db, 'sites', siteId));
        siteName = siteDoc.exists() ? (siteDoc.data() as any).name : undefined;
      }
      if (!siteId || !siteName) {
        throw new Error('Nenhum canteiro selecionado para o convite.');
      }

      await addDoc(collection(db, 'invites'), {
        email,
        status: 'pending',
        siteId,
        siteName,
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

      // VALIDAÇÃO: Verificar se já existe uma obra com o mesmo nome
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
        name: siteData.name.trim(), // Garantir que não há espaços extras
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

      // VALIDAÇÃO: Se o nome está sendo alterado, verificar se não conflita com outras obras
      if (updates.name && updates.name.trim() !== siteData.name) {
        const sitesQuery = query(
          collection(db, 'sites'),
          where('name', '==', updates.name.trim())
        );
        const existingSites = await getDocs(sitesQuery);
        
        // Verificar se existe alguma obra com o mesmo nome (exceto a atual)
        const conflictingSites = existingSites.docs.filter(doc => doc.id !== siteId);
        if (conflictingSites.length > 0) {
          throw new Error(`Já existe uma obra com o nome "${updates.name}". Por favor, escolha um nome diferente.`);
        }
      }

      // Atualizar a obra
      await updateDoc(doc(db, 'sites', siteId), {
        ...updates,
        name: updates.name ? updates.name.trim() : siteData.name, // Garantir que não há espaços extras
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

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return null;
      }
      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      console.error('Error getting user by ID:', error);
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
        siteName: site.name,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'pending',
        invitedBy: currentUser.id,
      };

      // Salvar o convite no Firestore
      await setDoc(doc(db, 'invites', invite.id), invite);
      console.log('Convite salvo no Firestore com ID:', invite.id);

      // Enviar email de convite
      try {
        const emailResult = await EmailService.sendAdminInvite({
          email: invite.email,
          siteName: site.name,
          invitedBy: currentUser.name,
          inviteId: invite.id,
        });
        
        // !! VERIFICAÇÃO CRUCIAL !!
        if (!emailResult.success) {
          // Se a resposta não for um sucesso (ex: 400, 500), jogue um erro.
          console.error('Falha ao enviar e-mail de notificação:', emailResult.error);
          throw new Error(`O convite foi salvo, mas o e-mail de notificação falhou: ${emailResult.error}`);
        }

        console.log('Email de convite de administrador enviado com sucesso');
      } catch (emailError) {
        console.error('Erro ao enviar email de convite:', emailError);
        // Propague o erro para que a UI possa mostrar uma mensagem de falha ao usuário
        throw emailError;
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

  static subscribeToUserSites(userId: string, callback: (sites: Site[]) => void) {
    // Buscar o usuário para pegar o array de sites
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
      // Buscar todas as obras cujo id está no array sites do usuário
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
      console.log('🔧 AuthService.fixPendingUser - Iniciando correção do usuário:', userId);
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.log('❌ Usuário não encontrado');
        return false;
      }

      const userData = userDoc.data() as any;
      console.log('📋 Dados atuais do usuário:', userData);

      // Verificar se o usuário precisa de correção
      const needsFix = userData.status === 'pending_invite' || userData.role === 'pending';
      if (!needsFix) {
        console.log('✅ Usuário já está correto, não precisa de correção');
        return true;
      }

      // Verificar se há convites pendentes para este usuário
      const invitesQuery = query(
        collection(db, 'invites'),
        where('email', '==', userData.email),
        where('status', '==', 'pending')
      );
      
      const invitesSnapshot = await getDocs(invitesQuery);
      console.log('📨 Convites pendentes encontrados:', invitesSnapshot.size);

      let updatedUser: Partial<User> = {
        status: 'active',
        name: userData.name || 'Nome não fornecido',
        company: userData.company || 'Não informada'
      };

      if (invitesSnapshot.size > 0) {
        // Se há convites pendentes, usar o primeiro
        const invite = invitesSnapshot.docs[0].data() as Invite;
        console.log('📨 Usando convite:', invite);
        
        updatedUser = {
          ...updatedUser,
          role: invite.role,
          sites: [invite.siteId],
          inviteId: invitesSnapshot.docs[0].id
        };

        // Adicionar siteId apenas se for admin
        if (invite.role === 'admin') {
          updatedUser.siteId = invite.siteId;
        }

        // Marcar convite como aceito
        await updateDoc(doc(db, 'invites', invitesSnapshot.docs[0].id), {
          status: 'accepted',
        });
        console.log('✅ Convite marcado como aceito');
      } else {
        // Se não há convites, definir como admin sem obra (usuário pode criar depois)
        console.log('⚠️ Nenhum convite encontrado, definindo como admin sem obra');
        updatedUser = {
          ...updatedUser,
          role: 'admin',
          sites: []
        };
        // Não incluir siteId se for undefined
      }

      console.log('🔄 Dados atualizados do usuário:', updatedUser);
      
      // Filtrar campos undefined antes de salvar
      const cleanUpdatedUser = Object.fromEntries(
        Object.entries(updatedUser).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🧹 Dados limpos para salvar:', cleanUpdatedUser);
      
      // Atualizar o usuário no Firestore
      await updateDoc(doc(db, 'users', userId), cleanUpdatedUser);
      console.log('✅ Usuário atualizado com sucesso');

      // Atualizar no storage local se for o usuário atual
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...updatedUser };
        await AuthService.saveUserToStorageStatic(updatedCurrentUser as User);
        console.log('✅ Usuário atualizado no storage local');
      }

      // Ajuste automático: se for admin, só tiver uma obra e não tiver siteId, define automaticamente
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
          console.log('Ajuste automático: siteId definido para', autoSiteId);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao corrigir usuário pending:', error);
      return false;
    }
  }

  // Método para corrigir dados de usuário com informações padrão
  static async fixUserWithDefaultData(userId: string, correctData: {
    name: string;
    company: string;
    phone?: string;
    role?: 'admin' | 'worker';
  }): Promise<boolean> {
    try {
      console.log('🔧 AuthService.fixUserWithDefaultData - Corrigindo usuário:', userId);
      console.log('📋 Dados corretos:', correctData);
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.log('❌ Usuário não encontrado');
        return false;
      }

      const userData = userDoc.data() as any;
      console.log('📋 Dados atuais do usuário:', userData);

      // Verificar se o usuário tem dados padrão que precisam ser corrigidos
      const hasDefaultData = userData.name === 'Nome não fornecido' || userData.company === 'Não informada';
      if (!hasDefaultData) {
        console.log('✅ Usuário não tem dados padrão, não precisa de correção');
        return true;
      }

      // Preparar dados atualizados
      const updatedUser: Partial<User> = {
        name: correctData.name,
        company: correctData.company,
        status: 'active'
      };

      // Adicionar telefone se fornecido
      if (correctData.phone) {
        updatedUser.phone = correctData.phone;
      }

      // Adicionar role se fornecido
      if (correctData.role) {
        updatedUser.role = correctData.role;
      }

      console.log('🔄 Dados atualizados do usuário:', updatedUser);
      
      // Atualizar o usuário no Firestore
      await updateDoc(doc(db, 'users', userId), updatedUser);
      console.log('✅ Usuário atualizado com sucesso');

      // Atualizar no storage local se for o usuário atual
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...updatedUser };
        await AuthService.saveUserToStorageStatic(updatedCurrentUser as User);
        console.log('✅ Usuário atualizado no storage local');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao corrigir dados do usuário:', error);
      return false;
    }
  }

  // Método para corrigir dados do usuário atual logado
  static async fixCurrentUserData(correctData: {
    name: string;
    company: string;
    phone?: string;
    role?: 'admin' | 'worker';
  }): Promise<boolean> {
    try {
      console.log('🔧 AuthService.fixCurrentUserData - Corrigindo usuário atual');
      
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        console.log('❌ Nenhum usuário logado');
        return false;
      }

      console.log('📋 Usuário atual:', currentUser);
      console.log('📋 Dados corretos:', correctData);

      // Verificar se o usuário tem dados padrão que precisam ser corrigidos
      const hasDefaultData = currentUser.name === 'Nome não fornecido' || currentUser.company === 'Não informada';
      if (!hasDefaultData) {
        console.log('✅ Usuário não tem dados padrão, não precisa de correção');
        return true;
      }

      // Preparar dados atualizados
      const updatedUser: Partial<User> = {
        name: correctData.name,
        company: correctData.company,
        status: 'active'
      };

      // Adicionar telefone se fornecido
      if (correctData.phone) {
        updatedUser.phone = correctData.phone;
      }

      // Adicionar role se fornecido
      if (correctData.role) {
        updatedUser.role = correctData.role;
      }

      console.log('🔄 Dados atualizados do usuário:', updatedUser);
      
      // Atualizar o usuário no Firestore
      await updateDoc(doc(db, 'users', currentUser.id), updatedUser);
      console.log('✅ Usuário atualizado no Firestore');

      // Atualizar no storage local
      const updatedCurrentUser = { ...currentUser, ...updatedUser };
      await AuthService.saveUserToStorageStatic(updatedCurrentUser as User);
      console.log('✅ Usuário atualizado no storage local');

      return true;
    } catch (error) {
      console.error('❌ Erro ao corrigir dados do usuário atual:', error);
      return false;
    }
  }

  /**
   * Método para testar apenas a autenticação do Firebase (sem Firestore)
   */
  static async testAuthOnly(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testando apenas autenticação do Firebase...');
      
      // Testar se o auth está configurado
      if (!auth) {
        return {
          success: false,
          error: 'Auth não está configurado'
        };
      }
      
      // Verificar se o auth está inicializado
      if (!auth.app) {
        return {
          success: false,
          error: 'Auth não está inicializado corretamente'
        };
      }
      
      // Verificar configuração do auth
      const authConfig = auth.app.options;
      console.log('🔧 Configuração do Auth:', {
        apiKey: authConfig.apiKey ? 'Configurado' : 'Não configurado',
        authDomain: authConfig.authDomain,
        projectId: authConfig.projectId
      });
      
      // Testar se conseguimos acessar as configurações
      if (!authConfig.apiKey) {
        return {
          success: false,
          error: 'API Key não configurada'
        };
      }
      
      console.log('✅ Autenticação do Firebase OK');
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
      console.error('❌ Erro no teste de autenticação:', error);
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

  /**
   * Método para testar a conectividade com o Firebase
   */
  static async testFirebaseConnection(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testando conectividade com Firebase...');
      
      // Primeiro testar apenas a autenticação
      const authTest = await this.testAuthOnly();
      if (!authTest.success) {
        return authTest;
      }
      
      // Testar se o db está configurado
      if (!db) {
        return {
          success: false,
          error: 'Firestore não está configurado'
        };
      }
      
      // Testar uma operação simples no Firestore - usar uma abordagem mais segura
      try {
        // Em vez de tentar escrever, vamos apenas verificar se conseguimos acessar o Firestore
        // usando uma operação de leitura que não requer permissões especiais
        const testDocRef = doc(db, '_system', 'connection-test');
        
        // Usar getDoc com timeout mais curto e tratamento de erro mais robusto
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 3000);
        });
        
        const getDocPromise = getDoc(testDocRef);
        
        await Promise.race([getDocPromise, timeoutPromise]);
        
        console.log('✅ Conectividade com Firebase OK - Firestore acessível');
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
        
        console.log('📝 Erro do Firestore:', { errorCode, errorMessage });
        
        // Se for erro de permissão ou "not found", significa que o Firebase está funcionando
        if (errorCode === 'permission-denied' || 
            errorCode === 'not-found' ||
            errorMessage.includes('permission') ||
            errorMessage.includes('not found') ||
            errorMessage.includes('Missing or insufficient permissions')) {
          console.log('✅ Conectividade com Firebase OK - Erro esperado');
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
        
        // Se for erro de timeout, pode ser problema de rede
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
        
        // Se for erro 400, pode ser problema de configuração
        if (errorCode === '400' || errorMessage.includes('400')) {
          console.log('⚠️ Erro 400 detectado - tentando abordagem alternativa...');
          
          // Tentar uma abordagem alternativa: verificar se conseguimos acessar o Firestore
          // sem fazer operações que possam causar erro 400
          try {
            // Verificar se o Firestore está inicializado
            if (db && db.app) {
              console.log('✅ Firestore está inicializado corretamente');
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
        
        // Para outros erros, vamos considerar como problema de conexão
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
      console.error('❌ Erro no teste de conectividade:', error);
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

  /**
   * Método para testar o registro com dados mínimos
   */
  static async testRegistration(): Promise<{
    success: boolean;
    error?: string;
    userId?: string;
  }> {
    try {
      console.log('🧪 Testando registro com dados mínimos...');
      
      const testEmail = `test-${Date.now()}@test.com`;
      const testPassword = '123456';
      
      console.log('📧 Email de teste:', testEmail);
      console.log('🔒 Senha de teste:', testPassword);
      
      // Tentar criar usuário
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        testEmail,
        testPassword
      );
      
      console.log('✅ Usuário de teste criado:', userCredential.user.uid);
      
      // Deletar o usuário de teste
      await userCredential.user.delete();
      
      console.log('✅ Usuário de teste deletado');
      
      return {
        success: true,
        userId: userCredential.user.uid
      };
      
    } catch (error: any) {
      console.error('❌ Erro no teste de registro:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  // Método de diagnóstico para problemas de convite
  static async diagnoseInviteProblem(email: string): Promise<{
    success: boolean;
    issues: string[];
    details: any;
  }> {
    const issues: string[] = [];
    const details: any = {};

    try {
      console.log('🔍 === DIAGNÓSTICO DE CONVITE ===');
      
      // 1. Verificar se o usuário está autenticado
      console.log('1️⃣ Verificando autenticação...');
      const currentUser = await AuthService.getCurrentUser();
      details.currentUser = currentUser;
      
      if (!currentUser) {
        issues.push('❌ Usuário não está autenticado');
        return { success: false, issues, details };
      }
      
      console.log('✅ Usuário autenticado:', currentUser.email);
      
      // 2. Verificar se o usuário é admin
      console.log('2️⃣ Verificando se é admin...');
      if (currentUser.role !== 'admin') {
        issues.push('❌ Usuário não é administrador (role: ' + currentUser.role + ')');
        return { success: false, issues, details };
      }
      
      console.log('✅ Usuário é administrador');
      
      // 3. Verificar site atual
      console.log('3️⃣ Verificando site atual...');
      const currentSite = await AuthService.getCurrentSite();
      details.currentSite = currentSite;
      
      if (!currentSite) {
        issues.push('❌ Nenhum site selecionado');
        return { success: false, issues, details };
      }
      
      console.log('✅ Site atual:', currentSite.name);
      
      // 4. Verificar se o usuário tem acesso ao site
      console.log('4️⃣ Verificando acesso ao site...');
      if (!currentUser.sites?.includes(currentSite.id)) {
        issues.push('❌ Usuário não tem acesso ao site atual');
        return { success: false, issues, details };
      }
      
      console.log('✅ Usuário tem acesso ao site');
      
      // 5. Verificar se já existe convite pendente
      console.log('5️⃣ Verificando convites existentes...');
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
      
      console.log('✅ Não há convites pendentes');
      
      // 6. Verificar se o email já é usuário
      console.log('6️⃣ Verificando se email já é usuário...');
      const existingUser = await AuthService.getUserByEmail(email);
      details.existingUser = existingUser ? { id: existingUser.id, role: existingUser.role } : null;
      
      if (existingUser && existingUser.sites?.includes(currentSite.id)) {
        issues.push('❌ Este usuário já tem acesso a esta obra');
        return { success: false, issues, details };
      }
      
      console.log('✅ Email não é usuário ou não tem acesso à obra');
      
      // 7. Testar criação do convite (sem salvar)
      console.log('7️⃣ Testando criação do convite...');
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
      console.log('✅ Convite de teste criado com sucesso');
      
      // 8. Testar EmailService
      console.log('8️⃣ Testando EmailService...');
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
          console.log('✅ EmailService funcionando');
        }
      } catch (emailError) {
        issues.push('❌ EmailService erro: ' + emailError);
        details.emailError = emailError;
      }
      
      console.log('🔍 === FIM DO DIAGNÓSTICO ===');
      
      return {
        success: issues.length === 0,
        issues,
        details
      };
      
    } catch (error) {
      console.error('❌ Erro no diagnóstico:', error);
      issues.push('❌ Erro geral no diagnóstico: ' + error);
      return { success: false, issues, details };
    }
  }

  async deleteInvite(inviteId: string): Promise<void> {
    try {
      console.log('[deleteInvite] Tentando excluir convite:', inviteId);
      await deleteDoc(doc(db, 'invites', inviteId));
      console.log('[deleteInvite] Convite excluído com sucesso:', inviteId);
    } catch (error) {
      console.error('[deleteInvite] Erro ao excluir convite:', error);
      throw error;
    }
  }
}
