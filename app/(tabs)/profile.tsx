import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Building2, LogOut, Settings, Bell, Shield, CircleHelp as HelpCircle } from 'lucide-react-native';
import { AuthService, User as UserData } from '@/services/AuthService';

interface UserProfile {
  name: string;
  email: string;
  role: 'admin' | 'worker';
  siteName: string;
  joinDate: string;
  notifications: {
    taskCreation: boolean;
    taskUpdate: boolean;
    loginConfirmation: boolean;
  };
}

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await AuthService.getCurrentUser();
      setUserData(user);
    };
    fetchUser();
  }, []);

  const handleNotificationChange = (key: 'taskCreation' | 'taskUpdate' | 'loginConfirmation', value: boolean) => {
    setUserData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: value,
        },
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!userData) return;
    setIsSaving(true);
    try {
      await AuthService.updateNotificationSettings(userData.id, userData.notifications || {});
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
      console.error('Failed to save notification settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/login');
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

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <User size={40} color="#111827" />
          <View>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={24} color="#111827" />
            <Text style={styles.sectionTitle}>Notificações por Email</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Confirmação de Login</Text>
            <Switch
              value={userData.notifications?.loginConfirmation ?? true}
              onValueChange={(value) => handleNotificationChange('loginConfirmation', value)}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Criação de Tarefas</Text>
            <Switch
              value={userData.notifications?.taskCreation ?? true}
              onValueChange={(value) => handleNotificationChange('taskCreation', value)}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Atualização de Tarefas</Text>
            <Switch
              value={userData.notifications?.taskUpdate ?? true}
              onValueChange={(value) => handleNotificationChange('taskUpdate', value)}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#dc2626" />
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>

        <View style={styles.menuContainer}>
          {userData.role === 'admin' && (
            <>
              <MenuSection title="Administração">
                <MenuItem
                  icon={<Building2 size={20} color="#6B7280" />}
                  title="Gerenciar Obras"
                  subtitle="Criar, editar e visualizar obras"
                  onPress={() => router.push('/admin/sites')}
                />
                <MenuItem
                  icon={<User size={20} color="#6B7280" />}
                  title="Gerenciar Trabalhadores"
                  subtitle="Criar convites e gerenciar permissões"
                  onPress={() => router.push('/admin/workers')}
                />
                <MenuItem
                  icon={<Shield size={20} color="#6B7280" />}
                  title="Estatísticas"
                  subtitle="Visualizar métricas e relatórios"
                  onPress={() => router.push('/admin/stats')}
                />
              </MenuSection>
            </>
          )}

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
    paddingTop: 24,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  menuSection: {
    marginBottom: 24,
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