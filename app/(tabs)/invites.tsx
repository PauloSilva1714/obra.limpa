import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Plus, X, Check, Clock } from 'lucide-react-native';
import { AuthService, Invite } from '@/services/AuthService';

export default function InvitesScreen() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      const userInvites = await AuthService.getInvites();
      setInvites(userInvites);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar convites.');
    }
  };

  const handleCreateInvite = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Erro', 'Por favor, informe um e-mail.');
      return;
    }

    setLoading(true);
    try {
      const currentSite = await AuthService.getCurrentSite();
      if (!currentSite) {
        throw new Error('Nenhuma obra selecionada');
      }

      await AuthService.createInvite(newEmail.trim(), currentSite.id);
      setNewEmail('');
      await loadInvites();
      Alert.alert('Sucesso', 'Convite enviado com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Já existe um convite pendente para este email') {
          Alert.alert('Erro', 'Já existe um convite pendente para este e-mail.');
        } else {
          Alert.alert('Erro', error.message);
        }
      } else {
        Alert.alert('Erro', 'Erro ao criar convite.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Invite['status']) => {
    switch (status) {
      case 'accepted':
        return <Check size={20} color="#10B981" />;
      case 'expired':
        return <X size={20} color="#EF4444" />;
      default:
        return <Clock size={20} color="#F59E0B" />;
    }
  };

  const getStatusText = (status: Invite['status']) => {
    switch (status) {
      case 'accepted':
        return 'Aceito';
      case 'expired':
        return 'Expirado';
      default:
        return 'Pendente';
    }
  };

  const renderInvite = ({ item }: { item: Invite }) => (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <View style={styles.inviteInfo}>
          <Mail size={20} color="#666666" style={styles.inviteIcon} />
          <Text style={styles.inviteEmail}>{item.email}</Text>
        </View>
        <View style={styles.inviteStatus}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, styles[`status${item.status}`]]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.inviteDate}>
        Enviado em: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Convites</Text>
        <Text style={styles.subtitle}>Gerencie os convites para trabalhadores</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#666666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="E-mail do trabalhador"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999999"
          />
        </View>

        <TouchableOpacity 
          style={[styles.createButton, loading && styles.buttonDisabled]} 
          onPress={handleCreateInvite}
          disabled={loading}
        >
          <Plus size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.createButtonText}>
            {loading ? 'Enviando...' : 'Enviar Convite'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={invites}
        renderItem={renderInvite}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.invitesList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Nenhum convite enviado ainda
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    backgroundColor: '#F97316',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  form: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333333',
  },
  createButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  invitesList: {
    padding: 24,
  },
  inviteCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    flex: 1,
  },
  inviteIcon: {
    marginRight: 8,
  },
  inviteEmail: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333333',
  },
  inviteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  statuspending: {
    color: '#F59E0B',
  },
  statusaccepted: {
    color: '#10B981',
  },
  statusexpired: {
    color: '#EF4444',
  },
  inviteDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
}); 