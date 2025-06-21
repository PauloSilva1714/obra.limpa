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
  Eye,
} from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import taskService, { Task } from '@/services/TaskService';
import { AuthService } from '@/services/AuthService';
import { EmailService } from '@/services/EmailService';
import { TaskModal } from '@/components/TaskModal';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/config/i18n';

export default function TasksScreen() {
  const { colors } = useTheme();
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
      Alert.alert(t('error'), 'Erro ao carregar tarefas.');
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
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert(t('error'), 'Usuário não encontrado.');
        return;
      }

      if (selectedTask) {
        // Atualizando tarefa existente
        await taskService.updateTask(selectedTask.id, taskData);
        
        // Enviar confirmação de atualização por email
        const changes = [];
        if (taskData.title && taskData.title !== selectedTask.title) {
          changes.push(`Título alterado de "${selectedTask.title}" para "${taskData.title}"`);
        }
        if (taskData.description && taskData.description !== selectedTask.description) {
          changes.push('Descrição atualizada');
        }
        if (taskData.assignedTo && taskData.assignedTo !== selectedTask.assignedTo) {
          changes.push(`Designado de "${selectedTask.assignedTo}" para "${taskData.assignedTo}"`);
        }
        if (taskData.status && taskData.status !== selectedTask.status) {
          const statusText = {
            'pending': t('pending'),
            'in_progress': t('inProgress'),
            'completed': t('completed')
          }[taskData.status] || taskData.status;
          changes.push(`Status alterado para "${statusText}"`);
        }
        if (taskData.priority && taskData.priority !== selectedTask.priority) {
          const priorityText = {
            'high': t('high'),
            'medium': t('medium'),
            'low': t('low')
          }[taskData.priority] || taskData.priority;
          changes.push(`Prioridade alterada para "${priorityText}"`);
        }

        if (changes.length > 0) {
          await EmailService.sendTaskUpdateConfirmation(
            currentUser,
            {
              title: taskData.title || selectedTask.title,
              status: taskData.status || selectedTask.status,
              updatedBy: currentUser.name,
              changes
            }
          );
        }
      } else {
        // Criando nova tarefa
        const currentSite = await AuthService.getCurrentSite();
        if (!currentSite) {
          Alert.alert(t('error'), 'Nenhum canteiro selecionado.');
          return;
        }
        
        const newTask = await taskService.createTask({
          ...taskData,
          siteId: currentSite.id,
        } as Omit<Task, 'id' | 'createdAt'>);

        // Enviar confirmação de criação por email
        await EmailService.sendTaskCreationConfirmation(
          currentUser,
          {
            title: taskData.title || '',
            description: taskData.description || '',
            assignedTo: taskData.assignedTo || '',
            dueDate: taskData.dueDate,
            area: taskData.area || '',
            priority: taskData.priority || 'low'
          }
        );
      }
      
      setModalVisible(false);
      await loadTasks();
      
      // Mostrar mensagem de sucesso
      Alert.alert(
        t('success'), 
        selectedTask ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!'
      );
      
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert(t('error'), 'Erro ao salvar tarefa.');
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
        t('error'),
        'Erro ao excluir tarefa. Por favor, tente novamente.'
      );
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      await taskService.deleteTask(taskToDelete);
      setDeleteModalVisible(false);
      setTaskToDelete(null);
      await loadTasks();
      Alert.alert(t('success'), 'Tarefa excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar exclusão:', error);
      Alert.alert(t('error'), 'Erro ao excluir tarefa.');
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setTaskToDelete(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'in_progress':
        return <Clock size={16} color={colors.warning} />;
      default:
        return <AlertCircle size={16} color={colors.error} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('completed');
      case 'in_progress':
        return t('inProgress');
      default:
        return t('pending');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.priorityHigh;
      case 'medium':
        return colors.priorityMedium;
      default:
        return colors.priorityLow;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskItemContainer}>
      <TouchableOpacity
        style={[styles.taskItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleTaskPress(item)}
        onLongPress={() => handleTaskDetails(item)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.taskStatus}>
              {getStatusIcon(item.status)}
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          <View style={styles.taskHeaderActions}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority === 'high' ? t('high') : item.priority === 'medium' ? t('medium') : t('low')}
              </Text>
            </View>
            {userRole === 'admin' && (
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
                onPress={() => handleDeleteTask(item.id)}
              >
                <Trash2 size={14} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {item.description && (
          <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.taskFooter}>
          {item.assignedTo && (
            <View style={styles.taskInfo}>
              <User size={14} color={colors.textMuted} />
              <Text style={[styles.taskInfoText, { color: colors.textMuted }]} numberOfLines={1}>
                {item.assignedTo}
              </Text>
            </View>
          )}
          
          {item.dueDate && (
            <View style={styles.taskInfo}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.taskInfoText, { color: colors.textMuted }]}>
                {new Date(item.dueDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.detailsButton, { 
          backgroundColor: colors.primary + '20',
          borderColor: colors.primary + '40'
        }]}
        onPress={() => handleTaskDetails(item)}
      >
        <Eye size={16} color={colors.primary} />
        <Text style={[styles.detailsButtonText, { color: colors.primary }]}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Carregando tarefas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('tasks')}</Text>
        {userRole === 'admin' && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateTask}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma tarefa encontrada
            </Text>
            {userRole === 'admin' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateTask}
              >
                <Text style={styles.emptyButtonText}>Criar primeira tarefa</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Task Modal */}
      <TaskModal
        visible={modalVisible}
        task={selectedTask}
        userRole={userRole}
        onClose={() => setModalVisible(false)}
        onSave={handleTaskSave}
        detailsMode={detailsMode}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModal, { backgroundColor: colors.surface }]}>
            <View style={styles.deleteModalHeader}>
              <Text style={[styles.deleteModalTitle, { color: colors.text }]}>Confirmar Exclusão</Text>
              <TouchableOpacity onPress={cancelDelete}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.deleteModalText, { color: colors.textSecondary }]}>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={cancelDelete}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  taskItemContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  taskItem: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  deleteModalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  taskHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    alignSelf: 'flex-end',
  },
  detailsButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
