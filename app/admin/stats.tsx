import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useColorScheme } from 'react-native';
import TaskService from '@/services/TaskService';
import { AuthService } from '@/services/AuthService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
    averageCompletionTime: number;
  };
  workers: {
    total: number;
    active: number;
  };
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const loadStats = async () => {
    try {
      setLoading(true);
      // Carrega todas as tarefas
      const tasks = await TaskService.getTasks();
      const workers = await AuthService.getInstance().getWorkers();

      // Calcula estatísticas de tarefas
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = tasks.filter(task => task.status === 'pending').length;
      const overdueTasks = tasks.filter(task => {
        if (task.status === 'completed' || !task.dueDate) return false;
        return new Date(task.dueDate) < new Date();
      }).length;

      // Calcula taxa de conclusão
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calcula tempo médio de conclusão
      const completionTimes = tasks
        .filter(task => !!task.completedAt && !!task.createdAt)
        .map(task => {
          const start = new Date(task.createdAt as string);
          const end = new Date(task.completedAt as string);
          return end.getTime() - start.getTime();
        });

      const averageCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

      // Calcula estatísticas de trabalhadores
      const totalWorkers = workers.length;
      const activeWorkers = workers.filter(worker => worker.status === 'active').length;

      setStats({
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          overdue: overdueTasks,
          completionRate,
          averageCompletionTime,
        },
        workers: {
          total: totalWorkers,
          active: activeWorkers,
        },
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as estatísticas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <View style={[styles.card, isDark && styles.cardDark]}>
      <Text style={[styles.cardTitle, isDark && styles.textDark]}>{title}</Text>
      <Text style={[styles.cardValue, isDark && styles.textDark]}>{value}</Text>
      {subtitle && <Text style={[styles.cardSubtitle, isDark && styles.textDark]}>{subtitle}</Text>}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Estatísticas de Tarefas</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total de Tarefas"
            value={stats?.tasks.total || 0}
          />
          <StatCard
            title="Tarefas Concluídas"
            value={stats?.tasks.completed || 0}
          />
          <StatCard
            title="Tarefas Pendentes"
            value={stats?.tasks.pending || 0}
          />
          <StatCard
            title="Tarefas Atrasadas"
            value={stats?.tasks.overdue || 0}
          />
        </View>

        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Métricas de Desempenho</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Taxa de Conclusão"
            value={`${stats?.tasks.completionRate.toFixed(1)}%`}
          />
          <StatCard
            title="Tempo Médio"
            value={stats?.tasks.averageCompletionTime ? formatDistanceToNow(
              new Date(stats.tasks.averageCompletionTime),
              { locale: ptBR }
            ) : 'N/A'}
          />
        </View>

        <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Estatísticas de Trabalhadores</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total de Trabalhadores"
            value={stats?.workers.total || 0}
          />
          <StatCard
            title="Trabalhadores Ativos"
            value={stats?.workers.active || 0}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    color: '#1F2937',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  cardDark: {
    backgroundColor: '#1F2937',
  },
  cardTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  textDark: {
    color: '#F3F4F6',
  },
}); 