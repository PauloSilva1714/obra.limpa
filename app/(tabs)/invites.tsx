import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { AuthService } from '@/services/AuthService';
import { Trash2 } from 'lucide-react-native';

interface Invite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  siteId: string;
  createdAt: string;
}

export default function InvitesScreen() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const data = await AuthService.getInstance().getInvites();
      setInvites(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os convites.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = (inviteId: string) => {
    Alert.alert(
      'Cancelar convite',
      'Tem certeza que deseja cancelar este convite?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim', style: 'destructive', onPress: async () => {
            try {
              await AuthService.getInstance().cancelInvite(inviteId);
              await fetchInvites();
              Alert.alert('Sucesso', 'Convite cancelado com sucesso');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível cancelar o convite');
            }
          }
        }
      ]
    );
  };

  const renderInviteItem = ({ item }: { item: Invite }) => (
    <View style={styles.card}>
      <View style={styles.inviteHeader}>
        <View>
          <Text style={styles.inviteEmail}>{item.email}</Text>
          <Text style={styles.inviteDate}>
            Enviado em: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
          </Text>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelInvite(item.id)}>
            <Trash2 size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[
        styles.inviteStatus,
        { color: item.status === 'pending' ? '#FF9800' : item.status === 'accepted' ? '#10B981' : '#666' }
      ]}>
        {item.status === 'pending' ? 'Pendente' : item.status === 'accepted' ? 'Aceito' : 'Cancelado'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Convites</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 32 }} />
      ) : invites.length === 0 ? (
        <Text style={styles.subtitle}>Nenhum convite encontrado.</Text>
      ) : (
        <FlatList
          data={invites}
          renderItem={renderInviteItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 32,
    textAlign: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
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
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
}); 