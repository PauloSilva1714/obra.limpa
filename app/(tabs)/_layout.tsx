import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors, isDarkMode } = useTheme();
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        console.log('=== DEBUG: Obtendo papel do usuário ===');
        const role = await AuthService.getUserRole();
        console.log('Papel do usuário obtido:', role);
        setUserRole(role);
        
        // Debug adicional: verificar dados do usuário
        const currentUser = await AuthService.getCurrentUser();
        console.log('Usuário atual:', currentUser);
        console.log('=== FIM DEBUG ===');
      } catch (error) {
        console.error('Erro ao obter papel do usuário:', error);
      }
    };
    getUserRole();
  }, []);

  console.log('Renderizando TabLayout com userRole:', userRole);

  return (
    <Tabs
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
      <Tabs.Screen
        name="index"
        options={{
          title: t('tasks'),
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      
      {userRole === 'admin' && (
        <Tabs.Screen
          name="admin"
          options={{
            title: t('admin'),
            tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
          }}
        />
      )}
      
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress'),
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="invites"
        options={{
          title: t('invites'),
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
