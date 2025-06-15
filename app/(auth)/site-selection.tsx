import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, ChevronRight, MapPin } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';
import { SiteService } from '@/services/SiteService';

interface Site {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  tasksCount: number;
  completedTasks: number;
}

export default function SiteSelectionScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'worker'>('worker');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const role = await AuthService.getUserRole();
      setUserRole(role);
      const userSites = await SiteService.getUserSites();
      setSites(userSites);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar obras disponíveis.');
    } finally {
      setLoading(false);
    }
  };

  const handleSiteSelection = async (site: Site) => {
    try {
      await AuthService.setCurrentSite(site.id);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao selecionar obra.');
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/(auth)/login');
  };

  const renderSiteItem = ({ item }: { item: Site }) => {
    const completionPercentage = item.tasksCount > 0 
      ? Math.round((item.completedTasks / item.tasksCount) * 100) 
      : 0;

    return (
      <TouchableOpacity 
        style={styles.siteCard} 
        onPress={() => handleSiteSelection(item)}
      >
        <View style={styles.siteHeader}>
          <View style={styles.siteIconContainer}>
            <Building2 size={24} color="#F97316" />
          </View>
          <View style={styles.siteInfo}>
            <Text style={styles.siteName}>{item.name}</Text>
            <View style={styles.addressContainer}>
              <MapPin size={14} color="#666666" />
              <Text style={styles.siteAddress}>{item.address}</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#CCCCCC" />
        </View>
        
        <View style={styles.siteStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.tasksCount}</Text>
            <Text style={styles.statLabel}>Tarefas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.completedTasks}</Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{completionPercentage}%</Text>
            <Text style={styles.statLabel}>Progresso</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${completionPercentage}%` }
              ]} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando obras...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Selecionar Obra</Text>
        <Text style={styles.subtitle}>
          {userRole === 'admin' ? 'Administrador' : 'Trabalhador de Campo'}
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sites}
        renderItem={renderSiteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
    color: '#666666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  logoutButton: {
    position: 'absolute',
    right: 24,
    top: 24,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#F97316',
  },
  listContainer: {
    padding: 16,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  siteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  siteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F97316',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
});