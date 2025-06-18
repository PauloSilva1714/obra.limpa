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
import { Plus, Edit, Trash2, ArrowLeft, UserPlus } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';

interface Worker {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  phone?: string;
  company?: string;
  siteId?: string;
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
        AuthService.getInstance().getWorkers(),
        AuthService.getInstance().getInvites(),
      ]);
      setWorkers(workersData);
      setInvites(invitesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
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
              await AuthService.getInstance().removeWorker(workerId);
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
      'Cancelar convite',
      'Tem certeza que deseja cancelar este convite?',
      [
        {
          text: 'Não',
          style: 'cancel',
        },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.getInstance().cancelInvite(inviteId);
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
    <View style={styles.card}>
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
      <View style={styles.workerInfo}>
        {item.phone && (
          <Text style={styles.workerInfoText}>Telefone: {item.phone}</Text>
        )}
        {item.company && (
          <Text style={styles.workerInfoText}>Empresa: {item.company}</Text>
        )}
        <Text style={[
          styles.workerStatus,
          { color: item.status === 'active' ? '#4CAF50' : '#F44336' }
        ]}>
          {item.status === 'active' ? 'Ativo' : 'Inativo'}
        </Text>
      </View>
    </View>
  );

  const renderInviteItem = ({ item }: { item: Invite }) => (
    <View style={styles.card}>
      <View style={styles.inviteHeader}>
        <View>
          <Text style={styles.inviteEmail}>{item.email}</Text>
          <Text style={styles.inviteDate}>
            Enviado em: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCancelInvite(item.id)}
        >
          <Trash2 size={20} color="#666" />
        </TouchableOpacity>
      </View>
      <Text style={[
        styles.inviteStatus,
        { color: item.status === 'pending' ? '#FF9800' : '#666' }
      ]}>
        {item.status === 'pending' ? 'Pendente' : 'Aceito'}
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
          onPress={handleInvite}
        >
          <UserPlus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Carregando...</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...workers,
            ...invites.filter(invite => invite.status === 'pending'),
          ]}
          renderItem={({ item }) => {
            if ('status' in item && item.status === 'pending') {
              return renderInviteItem({ item: item as Invite });
            }
            return renderWorkerItem({ item: item as Worker });
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  workerInfo: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  workerInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  workerStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inviteEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  inviteDate: {
    fontSize: 12,
    color: '#666',
  },
  inviteStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 