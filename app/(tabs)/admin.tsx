import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  Users,
  BarChart3,
  Settings,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  FileText,
  Shield,
  Loader,
} from 'lucide-react-native';
import { AuthService, User } from '@/services/AuthService';
import { AdminService } from '@/services/AdminService';

interface AdminStats {
  totalSites: number;
  totalWorkers: number;
  totalTasks: number;
  completedTasks: number;
}

export default function AdminScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalSites: 0,
    totalWorkers: 0,
    totalTasks: 0,
    completedTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      if (!currentUser || currentUser.role !== 'admin') {
        setLoading(false);
        return;
      }
      
      loadAdminStats();
    };

    checkUserAndLoadData();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminStats = await AdminService.getAdminStats();
      setStats(adminStats);
    } catch (err) {
      setError('Falha ao carregar as estatísticas. Tente novamente mais tarde.');
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Loader size={48} color="#F97316" className="animate-spin" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Shield size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Acesso Negado</Text>
        <Text style={styles.errorText}>
          Você não tem permissão para acessar esta página.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryButtonText}>Voltar para o Início</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const AdminCard = ({ 
    title, 
    subtitle, 
    icon, 
    onPress, 
    color = '#F97316' 
  }: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.adminCard} onPress={onPress}>
      <View style={[styles.cardIcon, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = '#F97316' 
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel Administrativo</Text>
        <Text style={styles.subtitle}>Gerencie suas obras e trabalhadores</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estatísticas */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Visão Geral</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Obras"
              value={stats.totalSites}
              icon={<Building2 size={20} color="#F97316" />}
              color="#F97316"
            />
            <StatCard
              title="Trabalhadores"
              value={stats.totalWorkers}
              icon={<Users size={20} color="#10B981" />}
              color="#10B981"
            />
            <StatCard
              title="Tarefas"
              value={stats.totalTasks}
              icon={<FileText size={20} color="#3B82F6" />}
              color="#3B82F6"
            />
            <StatCard
              title="Concluídas"
              value={stats.completedTasks}
              icon={<BarChart3 size={20} color="#8B5CF6" />}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Gerenciamento de Obras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gerenciamento de Obras</Text>
          <AdminCard
            title="Gerenciar Obras"
            subtitle="Criar, editar e visualizar obras"
            icon={<Building2 size={24} color="#F97316" />}
            onPress={() => router.push('/admin/sites')}
            color="#F97316"
          />
          <AdminCard
            title="Criar Nova Obra"
            subtitle="Adicionar uma nova obra ao sistema"
            icon={<Plus size={24} color="#10B981" />}
            onPress={() => router.push('/admin/sites/create')}
            color="#10B981"
          />
        </View>

        {/* Gerenciamento de Trabalhadores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gerenciamento de Trabalhadores</Text>
          <AdminCard
            title="Gerenciar Trabalhadores"
            subtitle="Visualizar e gerenciar trabalhadores"
            icon={<Users size={24} color="#3B82F6" />}
            onPress={() => router.push('/admin/workers')}
            color="#3B82F6"
          />
          <AdminCard
            title="Convidar Trabalhador"
            subtitle="Enviar convite para novo trabalhador"
            icon={<UserPlus size={24} color="#8B5CF6" />}
            onPress={() => router.push('/admin/workers/invite')}
            color="#8B5CF6"
          />
        </View>

        {/* Relatórios e Estatísticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relatórios e Estatísticas</Text>
          <AdminCard
            title="Estatísticas Gerais"
            subtitle="Visualizar métricas e relatórios"
            icon={<BarChart3 size={24} color="#F59E0B" />}
            onPress={() => router.push('/admin/stats')}
            color="#F59E0B"
          />
        </View>

        {/* Configurações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          <AdminCard
            title="Configurações do Sistema"
            subtitle="Configurações gerais e permissões"
            icon={<Settings size={24} color="#6B7280" />}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento.')}
            color="#6B7280"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  statsSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
  },
  statTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  adminCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#6B7280',
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
