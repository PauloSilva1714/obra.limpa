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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const role = await AuthService.getUserRole();
        setUserRole(role);
      } catch (error) {
        console.error('Erro ao obter papel do usuário:', error);
      }
    };
    getUserRole();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
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
          title: 'Tarefas',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      
      {userRole === 'admin' && (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
          }}
        />
      )}
      
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progresso',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="invites"
        options={{
          title: 'Convites',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
