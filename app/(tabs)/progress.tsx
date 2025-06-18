import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartBar as BarChart3, TrendingUp, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';
import { ProgressService } from '@/services/ProgressService';

interface ProgressData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  weeklyProgress: Array<{
    day: string;
    completed: number;
  }>;
  areaProgress: Array<{
    area: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
}

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const [progressData, setProgressData] = useState<ProgressData>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    completionRate: 0,
    weeklyProgress: [],
    areaProgress: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const data = await ProgressService.getProgressData();
      setProgressData(data);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderWeeklyChart = () => {
    const maxValue = Math.max(...progressData.weeklyProgress.map(item => item.completed), 1);
    const chartHeight = 120;
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Progresso Semanal</Text>
        <View style={styles.chart}>
          {progressData.weeklyProgress.map((item, index) => {
            const barHeight = (item.completed / maxValue) * chartHeight;
            return (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: barHeight,
                        backgroundColor: item.completed > 0 ? '#F97316' : '#E5E7EB'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.chartLabel}>{item.day}</Text>
                <Text style={styles.chartValue}>{item.completed}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAreaProgress = () => {
    return (
      <View style={styles.areaContainer}>
        <Text style={styles.sectionTitle}>Progresso por Área</Text>
        {progressData.areaProgress.map((area, index) => (
          <View key={index} style={styles.areaItem}>
            <View style={styles.areaHeader}>
              <Text style={styles.areaName}>{area.area}</Text>
              <Text style={styles.areaPercentage}>{area.percentage}%</Text>
            </View>
            <View style={styles.areaProgressBar}>
              <View 
                style={[
                  styles.areaProgressFill, 
                  { width: `${area.percentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.areaStats}>
              {area.completed} de {area.total} tarefas concluídas
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progresso da Obra</Text>
        <View style={styles.completionContainer}>
          <Text style={styles.completionRate}>{progressData.completionRate}%</Text>
          <Text style={styles.completionLabel}>Concluído</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <CheckCircle size={24} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{progressData.completedTasks}</Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Clock size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{progressData.inProgressTasks}</Text>
            <Text style={styles.statLabel}>Em Andamento</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <BarChart3 size={24} color="#F97316" />
            </View>
            <Text style={styles.statNumber}>{progressData.totalTasks}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {renderWeeklyChart()}
        {renderAreaProgress()}

        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightCard}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={styles.insightText}>
              {progressData.completedTasks > 0 
                ? `Excelente progresso! ${progressData.completedTasks} tarefas foram concluídas.`
                : 'Comece completando as tarefas pendentes para ver o progresso.'
              }
            </Text>
          </View>
          
          {progressData.completionRate > 75 && (
            <View style={styles.insightCard}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.insightText}>
                Parabéns! A obra está quase concluída com {progressData.completionRate}% de progresso.
              </Text>
            </View>
          )}
          
          {progressData.pendingTasks > 5 && (
            <View style={styles.insightCard}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.insightText}>
                Há {progressData.pendingTasks} tarefas pendentes. Considere redistribuir as prioridades.
              </Text>
            </View>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  completionContainer: {
    alignItems: 'flex-end',
  },
  completionRate: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F97316',
  },
  completionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  areaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  areaItem: {
    marginBottom: 20,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  areaPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#F97316',
  },
  areaProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  areaProgressFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 4,
  },
  areaStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  insightsContainer: {
    marginHorizontal: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  areaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
});