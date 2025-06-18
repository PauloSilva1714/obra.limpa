import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Plus, Edit, Trash2, ArrowLeft, Mail } from 'lucide-react-native';
import AuthService from '@/services/AuthService';
import TaskService from '@/services/TaskService';

interface Worker {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  tasksCount: number;
  completedTasks: number;
}

interface Invite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export default function WorkersScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workersData, invitesData] = await Promise.all([
        AuthService.getWorkers(),
        AuthService.getInvites(),
      ]);

      const workersWithStats = await Promise.all(
        workersData.map(async (worker) => {
          const tasks = await TaskService.getTasksByWorker(worker.id);
          const completedTasks = tasks.filter((task) => task.status === 'completed');
          return {
            ...worker,
            tasksCount: tasks.length,
            completedTasks: completedTasks.length,
          };
        })
      );

      setWorkers(workersWithStats);
      setInvites(invitesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = () => {
    router.push('/admin/workers/invite');
  };

  const handleEditWorker = (workerId: string) => {
    router.push({
      pathname: '/admin/workers',
      params: { id: workerId },
    });
  };

  const handleDeleteWorker = async (workerId: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja remover este trabalhador?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.removeWorker(workerId);
              await loadData();
              Alert.alert('Sucesso', 'Trabalhador removido com sucesso');
            } catch (error) {
              console.error('Erro ao remover trabalhador:', error);
              Alert.alert('Erro', 'Não foi possível remover o trabalhador');
            }
          },
        },
      ]
    );
  };

  const handleCancelInvite = async (inviteId: string) => {
    Alert.alert(
      'Confirmar cancelamento',
      'Tem certeza que deseja cancelar este convite?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.cancelInvite(inviteId);
              await loadData();
              Alert.alert('Sucesso', 'Convite cancelado com sucesso');
            } catch (error) {
              console.error('Erro ao cancelar convite:', error);
              Alert.alert('Erro', 'Não foi possível cancelar o convite');
            }
          },
        },
      ]
    );
  };

  const renderWorkerItem = ({ item }: { item: Worker }) => (
    <View style={styles.workerCard}>
      <View style={styles.workerHeader}>
        <View>
          <Text style={styles.workerName}>{item.name}</Text>
          <Text style={styles.workerEmail}>{item.email}</Text>
        </View>
        <View style={styles.workerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditWorker(item.id)}
          >
            <Edit size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteWorker(item.id)}
          >
            <Trash2 size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.workerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.tasksCount}</Text>
          <Text style={styles.statLabel}>Total de tarefas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.completedTasks}</Text>
          <Text style={styles.statLabel}>Tarefas concluídas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {item.tasksCount > 0
              ? Math.round((item.completedTasks / item.tasksCount) * 100)
              : 0}
            %
          </Text>
          <Text style={styles.statLabel}>Taxa de conclusão</Text>
        </View>
      </View>
    </View>
  );

  const renderInviteItem = ({ item }: { item: Invite }) => (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <View style={styles.inviteInfo}>
          <Mail size={20} color="#666" style={styles.inviteIcon} />
          <Text style={styles.inviteEmail}>{item.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelInvite(item.id)}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.inviteDate}>
        Enviado em {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Trabalhadores</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateInvite}
        >
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Carregando dados...</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...workers,
            ...invites.map((invite) => ({
              type: 'invite',
              ...invite,
            })),
          ]}
          renderItem={({ item }) =>
            'type' in item
              ? renderInviteItem({ item: item as Invite })
              : renderWorkerItem({ item: item as Worker })
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhum trabalhador encontrado. Clique no botão + para enviar um convite.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  list: {
    padding: 16,
  },
  workerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workerEmail: {
    fontSize: 14,
    color: '#666',
  },
  workerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  workerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteIcon: {
    marginRight: 8,
  },
  inviteEmail: {
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  inviteDate: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
}); 