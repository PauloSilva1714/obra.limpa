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
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  MessageCircle,
  Send,
  MapPin,
} from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import taskService, { Task, Comment } from '@/services/TaskService';
import { AuthService } from '@/services/AuthService';
import { EmailService } from '@/services/EmailService';
import { TaskModal } from '@/components/TaskModal';
import { useTheme } from '@/contexts/ThemeContext';
import { t } from '@/config/i18n';

export default function TasksFeedScreen() {
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
  
  // Estados para comentários
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isInitialized) return;

    const initializeScreen = async () => {
      try {
        console.log('Inicializando tela de tarefas...');
        const role = await AuthService.getUserRole();
        const user = await AuthService.getCurrentUser();
        console.log('Papel do usuário na tela de tarefas:', role);

        setUserRole(role);
        setCurrentUser(user);
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
        await taskService.updateTask(selectedTask.id, taskData);
        
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
            'completed': t('completed'),
            'delayed': t('delayed'),
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
        const currentSite = await AuthService.getCurrentSite();
        if (!currentSite) {
          Alert.alert(t('error'), 'Nenhum canteiro selecionado.');
          return;
        }
        
        const newTask = await taskService.addTask({
          ...taskData,
          siteId: currentSite.id,
        } as Omit<Task, 'id' | 'createdAt'>);

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
      await taskService.deleteTask(taskId);
      console.log('Tarefa excluída com sucesso');
      await loadTasks();
      Alert.alert(t('success'), 'Tarefa excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      Alert.alert(t('error'), 'Erro ao excluir tarefa.');
    }
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await handleDeleteTask(taskToDelete);
      setDeleteModalVisible(false);
      setTaskToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setTaskToDelete(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#10B981" />;
      case 'in_progress':
        return <Clock size={16} color="#F59E0B" />;
      case 'delayed':
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('pending');
      case 'in_progress':
        return t('inProgress');
      case 'completed':
        return t('completed');
      case 'delayed':
        return t('delayed');
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const handleOpenComments = (task: Task) => {
    setSelectedTaskForComments(task);
    setCommentModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTaskForComments || !currentUser) return;

    try {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
      };

      await taskService.addComment(selectedTaskForComments.id, comment);
      
      // Atualizar a lista de tarefas
      await loadTasks();
      
      setNewComment('');
      Alert.alert('Sucesso', 'Comentário adicionado!');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      Alert.alert('Erro', 'Erro ao adicionar comentário.');
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header do Card */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <User size={16} color={colors.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {item.assignedTo || 'Não designado'}
            </Text>
            <Text style={[styles.taskDate, { color: colors.textMuted }]}>
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {/* Foto Principal */}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.photos[0] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Informações da Tarefa */}
      <View style={styles.taskInfo}>
        <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        
        {item.description && (
          <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        <View style={styles.taskDetails}>
          {item.area && (
            <View style={styles.detailItem}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]} numberOfLines={1}>
                {item.area}
              </Text>
            </View>
          )}
          
          {item.dueDate && (
            <View style={styles.detailItem}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>
                {new Date(item.dueDate).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority === 'high' ? t('high') : item.priority === 'medium' ? t('medium') : t('low')}
          </Text>
        </View>
      </View>

      {/* Seção de Comentários */}
      <View style={styles.commentsSection}>
        <View style={styles.commentsHeader}>
          <Text style={[styles.commentsTitle, { color: colors.text }]}>
            Comentários ({item.comments?.length || 0})
          </Text>
          <TouchableOpacity onPress={() => handleOpenComments(item)}>
            <MessageCircle size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsPreview}>
            {item.comments.slice(0, 2).map((comment, index) => (
              <View key={comment.id} style={styles.commentItem}>
                <Text style={[styles.commentUserName, { color: colors.text }]}>
                  {comment.userName}
                </Text>
                <Text style={[styles.commentText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {comment.text}
                </Text>
              </View>
            ))}
            {item.comments.length > 2 && (
              <TouchableOpacity onPress={() => handleOpenComments(item)}>
                <Text style={[styles.viewMoreComments, { color: colors.primary }]}>
                  Ver mais {item.comments.length - 2} comentários
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Ações do Card */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
          onPress={() => handleTaskDetails(item)}
        >
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>Ver Detalhes</Text>
        </TouchableOpacity>
        
        {userRole === 'admin' && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => {
              setTaskToDelete(item.id);
              setDeleteModalVisible(true);
            }}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
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

      {/* Feed de Tarefas */}
      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        style={styles.feedList}
        contentContainerStyle={styles.feedContent}
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

      {/* Comments Modal */}
      <Modal
        visible={commentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.commentsModal, { backgroundColor: colors.surface }]}>
            <View style={styles.commentsModalHeader}>
              <Text style={[styles.commentsModalTitle, { color: colors.text }]}>
                Comentários
              </Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.commentsList}>
              {selectedTaskForComments?.comments?.map((comment) => (
                <View key={comment.id} style={styles.commentItemFull}>
                  <View style={styles.commentHeader}>
                    <Text style={[styles.commentUserName, { color: colors.text }]}>
                      {comment.userName}
                    </Text>
                    <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                      {new Date(comment.timestamp).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <Text style={[styles.commentTextFull, { color: colors.textSecondary }]}>
                    {comment.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.commentInputContainer}>
              <TextInput
                style={[styles.commentInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="Adicionar comentário..."
                placeholderTextColor={colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  feedList: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  taskCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  taskDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  imageContainer: {
    width: '100%',
    height: 200,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  taskInfo: {
    padding: 16,
    paddingTop: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  commentsPreview: {
    gap: 4,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentUserName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  commentText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  viewMoreComments: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  commentsModal: {
    width: '90%',
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  commentsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  commentsModalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItemFull: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  commentTextFull: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 80,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
}); 