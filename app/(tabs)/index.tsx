import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Clock,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
  User,
  Calendar,
  Trash2,
  X,
} from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import taskService, { Task } from '@/services/TaskService';
import { AuthService } from '@/services/AuthService';
import { TaskModal } from '@/components/TaskModal';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'worker' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [detailsMode, setDetailsMode] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    const initializeScreen = async () => {
      try {
        console.log('Inicializando tela de tarefas...');
        const role = await AuthService.getUserRole();
        console.log('Papel do usuário na tela de tarefas:', role);

        setUserRole(role);
        await loadTasks();
        setIsInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar tela de tarefas:', error);
      }
    };

    initializeScreen();
  }, [isInitialized]);

  const loadTasks = async () => {
    try {
      console.log('Carregando tarefas...');
      const siteTasks = await taskService.getTasks();
      console.log('Tarefas carregadas:', siteTasks);
      setTasks(siteTasks);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert('Erro', 'Erro ao carregar tarefas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailsMode(true);
    setModalVisible(true);
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setDetailsMode(false);
    setModalVisible(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setModalVisible(true);
  };

  const handleTaskSave = async (taskData: Partial<Task>) => {
    try {
      if (selectedTask) {
        await taskService.updateTask(selectedTask.id, taskData);
      } else {
        const currentSite = await AuthService.getCurrentSite();
        if (!currentSite) {
          Alert.alert('Erro', 'Nenhum canteiro selecionado.');
          return;
        }
        await taskService.createTask({
          ...taskData,
          siteId: currentSite.id,
        } as Omit<Task, 'id' | 'createdAt'>);
      }
      setModalVisible(false);
      await loadTasks();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar tarefa.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log('Tentando excluir tarefa:', taskId);
      setTaskToDelete(taskId);
      setDeleteModalVisible(true);
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      Alert.alert(
        'Erro',
        'Erro ao excluir tarefa. Por favor, tente novamente.'
      );
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      console.log('Confirmada exclusão da tarefa:', taskToDelete);
      await taskService.deleteTask(taskToDelete);
      console.log('Tarefa excluída com sucesso');
      await loadTasks();
      setDeleteModalVisible(false);
      setTaskToDelete(null);
      Alert.alert('Sucesso', 'Tarefa excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      Alert.alert(
        'Erro',
        'Erro ao excluir tarefa. Por favor, tente novamente.'
      );
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setTaskToDelete(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color="#10B981" />;
      case 'in_progress':
        return <Clock size={20} color="#F59E0B" />;
      default:
        return <AlertCircle size={20} color="#EF4444" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'in_progress':
        return 'Em Andamento';
      default:
        return 'Pendente';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => handleTaskPress(item)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            />
          </View>
          <View style={styles.taskActions}>
            <View style={styles.statusContainer}>
              {getStatusIcon(item.status)}
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
            {userRole === 'admin' && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(item.id);
                }}
                style={styles.deleteIconButton}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.taskMeta}>
          <View style={styles.metaItem}>
            <User size={14} color="#6B7280" />
            <Text style={styles.metaText}>{item.assignedTo}</Text>
          </View>
          <View style={styles.metaItem}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              {item.dueDate
                ? new Date(item.dueDate).toLocaleDateString('pt-BR')
                : 'Sem data'}
            </Text>
          </View>
          {item.status === 'completed' && item.completedAt && (
            <View style={styles.metaItem}>
              <Calendar size={14} color="#10B981" />
              <Text style={[styles.metaText, { color: '#10B981' }]}>
                Finalizada: {(() => {
                  try {
                    return new Date(item.completedAt).toLocaleDateString('pt-BR');
                  } catch (error) {
                    console.error('Erro ao formatar data de finalização:', error);
                    return 'Data inválida';
                  }
                })()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.taskFooter}>
          <Text style={styles.areaTag}>{item.area}</Text>
          {item.photos.length > 0 && (
            <Text style={styles.photoCount}>{item.photos.length} foto(s)</Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => handleTaskDetails(item)}
      >
        <Text style={styles.detailsButtonText}>Ver detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  const pendingTasks = tasks.filter((task) => task.status === 'pending');
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress');
  const completedTasks = tasks.filter((task) => task.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tarefas</Text>
        {userRole === 'admin' && (
          <TouchableOpacity style={styles.addButton} onPress={handleCreateTask}>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingTasks.length}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{inProgressTasks.length}</Text>
          <Text style={styles.statLabel}>Em Andamento</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedTasks.length}</Text>
          <Text style={styles.statLabel}>Concluídas</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar exclusão</Text>
              <TouchableOpacity
                onPress={cancelDelete}
                style={styles.closeButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              Tem certeza que deseja excluir esta tarefa?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        userRole={userRole}
        onSave={handleTaskSave}
        onClose={() => setModalVisible(false)}
        detailsMode={detailsMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F97316',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 0px 6px rgba(0,0,0,0.1)',
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaTag: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F97316',
    backgroundColor: '#FEF3F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  detailsButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
});
