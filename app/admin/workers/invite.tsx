import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, CheckCircle, Trash2 } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';

export default function InviteWorkerScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [inviteToCancel, setInviteToCancel] = useState(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoadingInvites(true);
    try {
      const invitesList = await AuthService.getInstance().getInvites();
      setInvites(invitesList.filter((i) => i.status === 'pending'));
    } catch (error) {
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, informe o e-mail do colaborador.');
      return;
    }

    setLoading(true);
    try {
      const currentSite = await AuthService.getCurrentSite();
      if (!currentSite || !currentSite.id) {
        Alert.alert('Erro', 'Nenhum canteiro selecionado.');
        setLoading(false);
        return;
      }
      await AuthService.getInstance().createInvite(email.trim(), currentSite.id);
      setSuccessEmail(email.trim());
      setShowSuccessModal(true);
      setEmail('');
      await loadInvites();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Erro', error.message);
      } else {
        Alert.alert('Erro', 'Não foi possível enviar o convite.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = (inviteId) => {
    setInviteToDelete(inviteId);
    setShowDeleteModal(true);
  };

  const executeDeleteInvite = async () => {
    if (!inviteToDelete) return;
    setDeleting(true);
    try {
      await AuthService.getInstance().deleteInvite(inviteToDelete);
      setShowDeleteModal(false);
      setInviteToDelete(null);
      await loadInvites();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir o convite.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelInvite = (inviteId) => {
    setInviteToCancel(inviteId);
    setShowCancelModal(true);
  };

  const executeCancelInvite = async () => {
    if (!inviteToCancel) return;
    setDeleting(true);
    try {
      await AuthService.getInstance().cancelInvite(inviteToCancel);
      setShowCancelModal(false);
      setInviteToCancel(null);
      await loadInvites();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível cancelar o convite.');
    } finally {
      setDeleting(false);
    }
  };

  const renderInvite = ({ item }) => (
    <View style={styles.inviteCard}>
      <View style={styles.inviteInfo}>
        <Mail size={18} color="#2196F3" />
        <Text style={styles.inviteEmail}>{item.email}</Text>
        {item.status === 'pending' ? (
          <TouchableOpacity
            style={styles.trashButton}
            onPress={() => handleCancelInvite(item.id)}
          >
            <Trash2 size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : item.status === 'rejected' ? (
          <TouchableOpacity
            style={styles.trashButton}
            onPress={() => handleDeleteInvite(item.id)}
          >
            <Trash2 size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.inviteStatus}>Status: {item.status === 'pending' ? 'Pendente' : item.status === 'rejected' ? 'Cancelado' : item.status}</Text>
      <Text style={styles.inviteDate}>Enviado em: {new Date(item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleString('pt-BR')}</Text>
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
        <Text style={styles.title}>Convidar Colaborador</Text>
        <Text style={styles.subtitle}>
          Envie um convite para um novo colaborador
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail do Colaborador</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#666666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Digite o e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999999"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleInvite}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Enviando...' : 'Enviar Convite'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Convites Enviados */}
      <View style={styles.invitesListContainer}>
        <Text style={styles.sectionTitle}>Convites Enviados</Text>
        {loadingInvites ? (
          <ActivityIndicator size="small" color="#2196F3" />
        ) : invites.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum convite enviado.</Text>
        ) : (
          <FlatList
            data={invites}
            keyExtractor={(item) => item.id}
            renderItem={renderInvite}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>

      {/* Modal de Sucesso */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <CheckCircle size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Convite enviado com sucesso!</Text>
            <Text style={styles.successEmail}>{successEmail}</Text>
            <Text style={styles.successDescription}>
              O colaborador receberá um e-mail com as instruções para acessar o sistema.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setInviteToDelete(null);
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.successModalContent}>
            <Text style={styles.successTitle}>Excluir Convite</Text>
            <Text style={styles.successDescription}>
              Tem certeza que deseja excluir este convite? Esta ação não pode ser desfeita.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: '#6B7280' }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setInviteToDelete(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.successButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: '#DC2626' }]}
                onPress={executeDeleteInvite}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.successButtonText}>Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Cancelamento */}
      <Modal
        visible={showCancelModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!deleting) {
            setShowCancelModal(false);
            setInviteToCancel(null);
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.successModalContent}>
            <Text style={styles.successTitle}>Cancelar Convite</Text>
            <Text style={styles.successDescription}>
              Tem certeza que deseja cancelar este convite? O colaborador não poderá mais aceitar.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: '#6B7280' }]}
                onPress={() => {
                  setShowCancelModal(false);
                  setInviteToCancel(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.successButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: '#DC2626' }]}
                onPress={executeCancelInvite}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.successButtonText}>Sim, Cancelar</Text>
                )}
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
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  successEmail: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  invitesListContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inviteCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'column',
    elevation: 2,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inviteEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  trashButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  inviteStatus: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  inviteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: '#6B7280',
  },
}); 