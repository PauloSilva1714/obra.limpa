import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartBar as BarChart3, TrendingUp, Clock, CircleCheck as CheckCircle, RefreshCw } from 'lucide-react-native';
import { ProgressService, ProgressData } from '@/services/ProgressService';

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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      console.log('[ProgressScreen] Carregando dados de progresso...');
      const data = await ProgressService.getInstance().getProgressData();
      console.log('[ProgressScreen] Dados carregados:', data);
      setProgressData(data);
    } catch (error) {
      console.error('[ProgressScreen] Erro ao carregar dados de progresso:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProgressData();
  };

  const renderPieChart = () => {
    const chartData = [
      {
        name: 'Concluídas',
        population: progressData.completedTasks,
        color: '#10B981',
      },
      {
        name: 'Em Andamento',
        population: progressData.inProgressTasks,
        color: '#F59E0B',
      },
      {
        name: 'Pendentes',
        population: progressData.pendingTasks,
        color: '#EF4444',
      },
    ].filter(item => item.population > 0); // Filtrar apenas itens com dados

    if (chartData.length === 0) {
      return (
        <View style={styles.pieChartContainer}>
          <Text style={styles.chartTitle}>Distribuição das Tarefas</Text>
          <View style={styles.emptyChartContainer}>
            <Text style={styles.emptyChartText}>Nenhuma tarefa encontrada</Text>
          </View>
        </View>
      );
    }

    const total = chartData.reduce((sum, item) => sum + item.population, 0);

    return (
      <View style={styles.pieChartContainer}>
        <Text style={styles.chartTitle}>Distribuição das Tarefas</Text>
        
        {/* Gráfico de pizza simples usando círculos coloridos lado a lado */}
        <View style={styles.pieChartWrapper}>
          <View style={styles.pieChart}>
            {chartData.map((item, index) => {
              const percentage = (item.population / total) * 100;
              
              return (
                <View key={index} style={styles.pieSliceContainer}>
                  <View
                    style={[
                      styles.pieSlice,
                      {
                        backgroundColor: item.color,
                        flex: item.population,
                      }
                    ]}
                  />
                </View>
              );
            })}
          </View>
          
          {/* Informações centrais */}
          <View style={styles.pieChartCenter}>
            <Text style={styles.pieChartTotal}>{total}</Text>
            <Text style={styles.pieChartLabel}>Total</Text>
          </View>
        </View>

        {/* Legenda */}
        <View style={styles.legendContainer}>
          {chartData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendText}>{item.name}</Text>
                <Text style={styles.legendValue}>{item.population} tarefas</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWeeklyChart = () => {
    const maxValue = Math.max(...progressData.weeklyProgress.map(item => item.completed), 1);
    const chartHeight = 120;
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Progresso Semanal</Text>
        <View style={styles.chart}>
          {progressData.weeklyProgress.map((item) => {
            const barHeight = (item.completed / maxValue) * chartHeight;
            return (
              <View key={item.day} style={styles.chartBar}>
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
        <View style={styles.headerContent}>
          <Text style={styles.title}>Progresso da Obra</Text>
          <View style={styles.completionContainer}>
            <Text style={styles.completionRate}>{progressData.completionRate}%</Text>
            <Text style={styles.completionLabel}>Concluído</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={20} color="#6B7280" style={refreshing ? { opacity: 0.5 } : undefined} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
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
              <BarChart3 size={24} color="#EF4444" />
            </View>
            <Text style={styles.statNumber}>{progressData.pendingTasks}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color="#F97316" />
            </View>
            <Text style={styles.statNumber}>{progressData.totalTasks}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {renderPieChart()}
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  completionContainer: {
    alignItems: 'flex-end',
  },
  completionRate: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F97316',
  },
  completionLabel: {
    fontSize: 12,
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
    flexWrap: 'wrap',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 8,
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  chartContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#111827',
  },
  areaPercentage: {
    fontSize: 14,
    fontWeight: '700',
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
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginLeft: 16,
  },
  pieChartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  emptyChartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#6B7280',
  },
  pieChartWrapper: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  pieChart: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  pieSliceContainer: {
    flex: 1,
  },
  pieSlice: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  pieChartCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -20 }],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    width: 60,
    height: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pieChartTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pieChartLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    minWidth: 120,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  legendValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});