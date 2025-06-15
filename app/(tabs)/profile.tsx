import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Building2, LogOut, Settings, Bell, Shield, CircleHelp as HelpCircle } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';

interface UserProfile {
  name: string;
  email: string;
  role: 'admin' | 'worker';
  siteName: string;
  joinDate: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    role: 'worker',
    siteName: '',
    joinDate: '',
  });
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await AuthService.getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar perfil do usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleSwitchSite = () => {
    router.replace('/(auth)/site-selection');
  };

  const MenuSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showSwitch = false, 
    switchValue = false, 
    onSwitchChange 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
  }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemIcon}>
          {icon}
        </View>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showSwitch && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E5E7EB', true: '#F97316' }}
          thumbColor={switchValue ? '#FFFFFF' : '#FFFFFF'}
        />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <User size={32} color="#F97316" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.profileMeta}>
            <Text style={styles.profileRole}>
              {profile.role === 'admin' ? 'Administrador' : 'Trabalhador de Campo'}
            </Text>
            <Text style={styles.profileSite}>{profile.siteName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <MenuSection title="Obra">
          <MenuItem
            icon={<Building2 size={20} color="#6B7280" />}
            title="Trocar de Obra"
            subtitle="Selecionar outra obra ativa"
            onPress={handleSwitchSite}
          />
        </MenuSection>

        <MenuSection title="Configurações">
          <MenuItem
            icon={<Bell size={20} color="#6B7280" />}
            title="Notificações"
            subtitle="Receber alertas de novas tarefas"
            showSwitch
            switchValue={notifications}
            onSwitchChange={setNotifications}
          />
          <MenuItem
            icon={<Shield size={20} color="#6B7280" />}
            title="Privacidade"
            subtitle="Configurações de privacidade"
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento.')}
          />
        </MenuSection>

        <MenuSection title="Suporte">
          <MenuItem
            icon={<HelpCircle size={20} color="#6B7280" />}
            title="Ajuda"
            subtitle="Central de ajuda e suporte"
            onPress={() => Alert.alert('Ajuda', 'Entre em contato com o suporte através do email: suporte@gestaoobras.com')}
          />
          <MenuItem
            icon={<Settings size={20} color="#6B7280" />}
            title="Sobre"
            subtitle="Versão 1.0.0"
            onPress={() => Alert.alert('Sobre', 'Gestão de Obras v1.0.0\nSistema de limpeza e organização para construtoras.')}
          />
        </MenuSection>

        <MenuSection title="Conta">
          <MenuItem
            icon={<LogOut size={20} color="#EF4444" />}
            title="Sair da Conta"
            subtitle="Encerrar sessão atual"
            onPress={handleLogout}
          />
        </MenuSection>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileRole: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F97316',
    backgroundColor: '#FEF3F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  profileSite: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});