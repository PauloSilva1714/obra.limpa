import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeView } from '@/components/SafeView';
import { AuthService } from '@/services/AuthService';
import { EmailService } from '@/services/EmailService';
import { useTranslation } from '@/config/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ArrowLeft, Mail, UserPlus, X, CheckCircle, Clock, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FlatList } from 'react-native';

interface Invite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  siteId: string;
  role: 'admin' | 'worker';
  createdAt: string;
  invitedBy?: string;
}

export default function InviteAdminScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [inviteToCancel, setInviteToCancel] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [hoveredInvite, setHoveredInvite] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successEmail, setSuccessEmail] = useState('');

  useEffect(() => {
    loadAdminInvites();
  }, []);

  const loadAdminInvites = async () => {
    try {
      setLoadingInvites(true);
      const currentSite = await AuthService.getCurrentSite();
      console.log('Site atual:', currentSite);
      
      if (currentSite) {
        const adminInvites = await AuthService.getAdminInvites(currentSite.id);
        console.log('Convites de administrador carregados:', adminInvites);
        setInvites(adminInvites);
      } else {
        console.log('Nenhum site selecionado');
        setInvites([]);
      }
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, insira um email válido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Erro', 'Por favor, insira um email válido');
      return;
    }

    setLoading(true);
    try {
      const currentSite = await AuthService.getCurrentSite();
      if (!currentSite) {
        Alert.alert('Erro', 'Nenhuma obra selecionada');
        return;
      }

      const invite = await AuthService.createAdminInvite(email.trim(), currentSite.id);
      
      // Mostrar modal de sucesso
      setSuccessMessage('Convite enviado com sucesso!');
      setSuccessEmail(email.trim());
      setShowSuccessModal(true);
      
      setEmail('');
      await loadAdminInvites();
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error);
      Alert.alert('Erro', error.message || 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = (inviteId: string) => {
    console.log('Tentando cancelar convite:', inviteId);
    setInviteToCancel(inviteId);
    setShowCancelModal(true);
  };

  const executeCancelInvite = async () => {
    if (!inviteToCancel) return;
    
    setCanceling(true);
    try {
      console.log('Iniciando execução do cancelamento do convite:', inviteToCancel);
      await AuthService.cancelAdminInvite(inviteToCancel);
      console.log('Convite cancelado com sucesso');
      await loadAdminInvites();
      Alert.alert('Sucesso', 'Convite cancelado com sucesso');
      setShowCancelModal(false);
      setInviteToCancel(null);
    } catch (error: any) {
      console.error('Erro ao cancelar convite:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      Alert.alert('Erro', error.message || 'Não foi possível cancelar o convite');
    } finally {
      setCanceling(false);
    }
  };

  const handleDeleteInvite = (inviteId: string) => {
    console.log('Tentando excluir convite:', inviteId);
    setInviteToDelete(inviteId);
    setShowDeleteModal(true);
  };

  const executeDeleteInvite = async () => {
    if (!inviteToDelete) return;
    
    setDeleting(true);
    try {
      console.log('Iniciando execução da exclusão do convite:', inviteToDelete);
      await AuthService.deleteAdminInvite(inviteToDelete);
      console.log('Convite excluído com sucesso');
      await loadAdminInvites();
      Alert.alert('Sucesso', 'Convite excluído com sucesso');
      setShowDeleteModal(false);
      setInviteToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir convite:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      Alert.alert('Erro', error.message || 'Não foi possível excluir o convite');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'accepted':
        return 'Aceito';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      case 'accepted':
        return <CheckCircle size={16} color="#10B981" />;
      case 'rejected':
        return <X size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderInvite = ({ item }: { item: Invite }) => {
    console.log('Renderizando convite:', item);
    console.log('Status do convite:', item.status);
    console.log('Deve mostrar botão de cancelar:', item.status === 'pending');
    
    const isHovered = hoveredInvite === item.id;
    
    return (
      <View style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.inviteHeader}>
          <View style={styles.inviteInfo}>
            <Mail size={20} color={colors.primary} />
            <Text style={[styles.inviteEmail, { color: colors.text }]}>{item.email}</Text>
          </View>
          <View style={styles.statusContainer}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        <Text style={[styles.inviteDate, { color: colors.textMuted }]}>
          Enviado em: {formatDate(item.createdAt)}
        </Text>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[
              styles.cancelButton, 
              { 
                borderColor: colors.border,
                backgroundColor: isHovered ? '#FEE2E2' : '#FEF2F2',
                transform: [{ scale: isHovered ? 1.02 : 1 }],
              }
            ]}
            onPress={() => {
              console.log('Botão cancelar pressionado para convite:', item.id);
              handleCancelInvite(item.id);
            }}
            onPressIn={() => setHoveredInvite(item.id)}
            onPressOut={() => setHoveredInvite(null)}
            activeOpacity={0.8}
          >
            <View style={styles.cancelButtonContent}>
              <View style={[styles.cancelButtonIcon, { backgroundColor: isHovered ? '#FECACA' : '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
              </View>
              <Text style={styles.cancelButtonText}>Cancelar Convite</Text>
            </View>
          </TouchableOpacity>
        )}
        {item.status === 'rejected' && (
          <TouchableOpacity
            style={[
              styles.deleteButton, 
              { 
                borderColor: colors.border,
                backgroundColor: isHovered ? '#FEE2E2' : '#FEF2F2',
                transform: [{ scale: isHovered ? 1.02 : 1 }],
              }
            ]}
            onPress={() => {
              console.log('Botão excluir pressionado para convite:', item.id);
              handleDeleteInvite(item.id);
            }}
            onPressIn={() => setHoveredInvite(item.id)}
            onPressOut={() => setHoveredInvite(null)}
            activeOpacity={0.8}
          >
            <View style={styles.deleteButtonContent}>
              <View style={[styles.deleteButtonIcon, { backgroundColor: isHovered ? '#FECACA' : '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </View>
              <Text style={styles.deleteButtonText}>Excluir Convite</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleGoBack = () => {
    try {
      // Navegar diretamente para a tela de workers
      router.push('/(tabs)/admin/workers');
    } catch (error) {
      console.log('Erro ao navegar, tentando voltar:', error);
      // Fallback: tentar voltar
      try {
        router.back();
      } catch (backError) {
        console.log('Erro ao voltar também, indo para admin:', backError);
        router.push('/(tabs)/admin');
      }
    }
  };

  return (
    <SafeView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Convidar Administrador</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Enviar Convite</Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Convide outros administradores para gerenciar esta obra junto com você.
          </Text>

          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Mail size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="E-mail do administrador"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.buttonText}>Enviar Convite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Convites Enviados</Text>
          {loadingInvites ? (
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando convites...</Text>
          ) : invites.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum convite enviado ainda.
            </Text>
          ) : (
            <FlatList
              data={invites}
              renderItem={renderInvite}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal de Sucesso */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.successModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              {successMessage}
            </Text>
            <Text style={[styles.successEmail, { color: colors.primary }]}>
              {successEmail}
            </Text>
            <Text style={[styles.successDescription, { color: colors.textMuted }]}>
              O usuário receberá um email com as instruções para aceitar o convite.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Cancelamento */}
      <Modal
        visible={showCancelModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!canceling) {
            setShowCancelModal(false);
            setInviteToCancel(null);
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Cancelar Convite</Text>
            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              Tem certeza que deseja cancelar este convite? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!canceling) {
                    console.log('Cancelamento negado pelo usuário');
                    setShowCancelModal(false);
                    setInviteToCancel(null);
                  }
                }}
                disabled={canceling}
              >
                <Text style={styles.modalButtonText}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={executeCancelInvite}
                disabled={canceling}
              >
                {canceling ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Sim, Cancelar</Text>
                )}
              </TouchableOpacity>
            </View>
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Excluir Convite</Text>
            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              Tem certeza que deseja excluir este convite? Esta ação não pode ser desfeita e o convite será removido permanentemente.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!deleting) {
                    console.log('Exclusão negada pelo usuário');
                    setShowDeleteModal(false);
                    setInviteToDelete(null);
                  }
                }}
                disabled={deleting}
              >
                <Text style={styles.modalButtonText}>Não</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={executeDeleteInvite}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Sim, Excluir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#7c3aed',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
  inviteCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  inviteEmail: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  inviteDate: {
    fontSize: 12,
  },
  cancelButton: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  cancelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  deleteButton: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
}); 