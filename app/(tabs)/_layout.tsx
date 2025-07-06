import { Tabs, useRouter, useSegments } from 'expo-router';
import { useColorScheme, View, Text, StyleSheet } from 'react-native';
import { 
  Home, 
  User, 
  BarChart3, 
  Camera, 
  Users,
  Building2 
} from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/config/i18n';

const TABS_CONFIG = {
  index: {
    name: 'index',
    title: t('tasks'),
    icon: Home,
  },
  admin: {
    name: 'admin',
    title: t('admin'),
    icon: Building2,
  },
  progress: {
    name: 'progress',
    title: t('progress'),
    icon: BarChart3,
  },
  invites: {
    name: 'invites',
    title: t('invites'),
    icon: Users,
  },
  profile: {
    name: 'profile',
    title: t('profile'),
    icon: User,
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors, isDarkMode } = useTheme();
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderKey, setRenderKey] = useState(0); // Forçar re-render
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const getUserRole = async () => {
      try {
        console.log('=== DEBUG: Obtendo papel do usuário ===');
        
        // Debug do AsyncStorage primeiro
        await AuthService.debugAsyncStorage();
        
        const role = await AuthService.getUserRole();
        console.log('Papel do usuário obtido:', role);
        console.log('Tipo do role:', typeof role);
        console.log('Role é admin?', role === 'admin');
        console.log('Role é worker?', role === 'worker');
        
        setUserRole(role);
        
        // Debug adicional: verificar dados do usuário
        const currentUser = await AuthService.getCurrentUser();
        console.log('Usuário atual:', currentUser);
        if (currentUser) {
          console.log('Role do usuário atual:', currentUser.role);
          console.log('Role do usuário é admin?', currentUser.role === 'admin');
        }
        console.log('=== FIM DEBUG ===');
      } catch (error) {
        console.error('Erro ao obter papel do usuário:', error);
      } finally {
        setIsLoading(false);
      }
    };
    getUserRole();
  }, []);

  // Forçar atualização do role quando o componente montar
  useEffect(() => {
    const forceUpdateRole = async () => {
      if (!isLoading) {
        const role = await AuthService.getUserRole();
        console.log('Forçando atualização do role:', role);
        console.log('Role anterior:', userRole);
        console.log('Role novo:', role);
        console.log('Roles são iguais?', userRole === role);
        
        if (userRole !== role) {
          console.log('Role mudou, atualizando...');
          setUserRole(role);
          setRenderKey(prev => prev + 1); // Forçar re-render
        }
      }
    };
    
    // Aguardar um pouco para garantir que o AsyncStorage foi carregado
    const timer = setTimeout(forceUpdateRole, 100);
    return () => clearTimeout(timer);
  }, [isLoading, userRole]);

  // Redirecionar colaborador se estiver em rota inválida
  useEffect(() => {
    if (userRole === 'worker' && !isLoading) {
      const currentTab = segments[segments.length - 1];
      if (currentTab === 'admin' || currentTab === 'invites') {
        router.replace('/(tabs)');
      }
    }
  }, [userRole, segments, isLoading]);

  console.log('=== RENDERIZAÇÃO DO TAB LAYOUT ===');
  console.log('userRole:', userRole);
  console.log('isLoading:', isLoading);
  console.log('renderKey:', renderKey);
  console.log('userRole === admin:', userRole === 'admin');
  console.log('userRole === worker:', userRole === 'worker');

  // Loading state
  if (isLoading) {
    console.log('Renderizando loading...');
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Se não tem role válido, não renderiza nada
  if (!userRole || (userRole !== 'admin' && userRole !== 'worker')) {
    console.log('userRole inválido:', userRole);
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Erro ao carregar permissões</Text>
      </View>
    );
  }

  // Debug: mostrar quais tabs serão renderizadas
  console.log('Renderizando tabs para role:', userRole);
  console.log('Tabs que serão mostradas:', userRole === 'admin' ? 'index, admin, progress, invites, profile' : 'index, progress, profile');
  console.log('Condição userRole === admin:', userRole === 'admin');
  console.log('Condição userRole === worker:', userRole === 'worker');

  // Definir tabs dinamicamente DENTRO do componente
  const getTabsToRender = () => {
    if (userRole === 'admin') {
      return [TABS_CONFIG.index, TABS_CONFIG.admin, TABS_CONFIG.progress, TABS_CONFIG.invites, TABS_CONFIG.profile];
    }
    // worker
    return [TABS_CONFIG.index, TABS_CONFIG.progress, TABS_CONFIG.profile];
  };
  const tabsToRender = getTabsToRender();

  return (
    <Tabs
      key={`tabs-${userRole}`}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      {/* Tarefas */}
      <Tabs.Screen
        name={TABS_CONFIG.index.name}
        options={{
          title: TABS_CONFIG.index.title,
          tabBarIcon: ({ color, size }) => <TABS_CONFIG.index.icon size={size} color={color} />,
        }}
      />
      {/* Admin - ocultar visualmente para worker */}
      <Tabs.Screen
        name={TABS_CONFIG.admin.name}
        options={{
          title: TABS_CONFIG.admin.title,
          tabBarIcon: ({ color, size }) => <TABS_CONFIG.admin.icon size={size} color={color} />,
          tabBarStyle: userRole === 'worker' ? { display: 'none' } : undefined,
        }}
      />
      {/* Progresso */}
      <Tabs.Screen
        name={TABS_CONFIG.progress.name}
        options={{
          title: TABS_CONFIG.progress.title,
          tabBarIcon: ({ color, size }) => <TABS_CONFIG.progress.icon size={size} color={color} />,
        }}
      />
      {/* Invites - ocultar visualmente para worker */}
      <Tabs.Screen
        name={TABS_CONFIG.invites.name}
        options={{
          title: TABS_CONFIG.invites.title,
          tabBarIcon: ({ color, size }) => <TABS_CONFIG.invites.icon size={size} color={color} />,
          tabBarStyle: userRole === 'worker' ? { display: 'none' } : undefined,
        }}
      />
      {/* Perfil */}
      <Tabs.Screen
        name={TABS_CONFIG.profile.name}
        options={{
          title: TABS_CONFIG.profile.title,
          tabBarIcon: ({ color, size }) => <TABS_CONFIG.profile.icon size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
});
