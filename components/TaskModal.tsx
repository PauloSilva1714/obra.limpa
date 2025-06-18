import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { X, Camera, User, Calendar, Flag, MapPin, ChevronDown, ImagePlus, Video, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Task } from '@/services/TaskService';
import { AuthService } from '@/services/AuthService';

interface TaskModalProps {
  visible: boolean;
  task: Task | null;
  userRole: 'admin' | 'worker' | null;
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

const areas = ['Canteiro', 'Almoxarifado', 'Instalações', 'Área Externa', 'Escritório', 'Depósito'];
const workers = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Silva'];

export function TaskModal({ visible, task, userRole, onSave, onClose }: TaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as Task['status'],
    priority: 'medium' as Task['priority'],
    assignedTo: '',
    dueDate: '',
    area: '',
    photos: [] as string[],
    videos: [] as string[],
  });
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        area: task.area,
        photos: task.photos || [],
        videos: task.videos || [],
      });
    } else {
      // Reset form for new task
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedTo: '',
        dueDate: new Date().toISOString().split('T')[0],
        area: '',
        photos: [],
        videos: [],
      });
    }
  }, [task, visible]);

  const handleSave = () => {
    if (!formData.title.trim()) {
      Alert.alert('Erro', 'O título da tarefa é obrigatório.');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Erro', 'A descrição da tarefa é obrigatória.');
      return;
    }

    onSave(formData);
  };

  const isReadOnly = userRole === 'worker' && task?.status === 'completed';
  const isEditing = !!task;
  const canEdit = userRole === 'admin' || (userRole === 'worker' && !isReadOnly);

  const StatusButton = ({ status, label }: { status: Task['status']; label: string }) => (
    <TouchableOpacity
      style={[
        styles.statusButton,
        formData.status === status && styles.statusButtonActive,
        isReadOnly && styles.statusButtonDisabled,
      ]}
      onPress={() => !isReadOnly && setFormData({ ...formData, status })}
      disabled={isReadOnly}
    >
      <Text
        style={[
          styles.statusButtonText,
          formData.status === status && styles.statusButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const PriorityButton = ({ priority, label, color }: { priority: Task['priority']; label: string; color: string }) => (
    <TouchableOpacity
      style={[
        styles.priorityButton,
        formData.priority === priority && { backgroundColor: color + '20', borderColor: color },
        (!canEdit || isReadOnly) && styles.statusButtonDisabled,
      ]}
      onPress={() => canEdit && !isReadOnly && setFormData({ ...formData, priority })}
      disabled={!canEdit || isReadOnly}
    >
      <Flag size={16} color={formData.priority === priority ? color : '#6B7280'} />
      <Text
        style={[
          styles.priorityButtonText,
          formData.priority === priority && { color },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.onchange = (e: Event) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
            setFormData(prev => ({
              ...prev,
              photos: [...prev.photos, ...newPhotos]
            }));
          }
        };
        
        input.click();
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, result.assets[0].uri]
        }));
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const pickVideo = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.multiple = true;
        
        input.onchange = (e: Event) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            const newVideos = Array.from(files).map(file => URL.createObjectURL(file));
            setFormData(prev => ({
              ...prev,
              videos: [...prev.videos, ...newVideos]
            }));
          }
        };
        
        input.click();
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar seus vídeos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setFormData(prev => ({
          ...prev,
          videos: [...prev.videos, result.assets[0].uri]
        }));
      }
    } catch (error) {
      console.error('Erro ao selecionar vídeo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o vídeo.');
    }
  };

  const removeMedia = (type: 'photo' | 'video', index: number) => {
    if (type === 'photo') {
      const newPhotos = [...formData.photos];
      if (Platform.OS === 'web') {
        URL.revokeObjectURL(newPhotos[index]);
      }
      newPhotos.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        photos: newPhotos
      }));
    } else {
      const newVideos = [...formData.videos];
      if (Platform.OS === 'web') {
        URL.revokeObjectURL(newVideos[index]);
      }
      newVideos.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        videos: newVideos
      }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={[styles.input, isReadOnly && styles.inputDisabled]}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Digite o título da tarefa"
              editable={!isReadOnly && userRole === 'admin'}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.textArea, isReadOnly && styles.inputDisabled]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Descreva a tarefa detalhadamente"
              multiline
              numberOfLines={4}
              editable={!isReadOnly && userRole === 'admin'}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              <StatusButton status="pending" label="Pendente" />
              <StatusButton status="in_progress" label="Em Andamento" />
              <StatusButton status="completed" label="Concluída" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Prioridade</Text>
            <View style={styles.priorityContainer}>
              <PriorityButton priority="low" label="Baixa" color="#10B981" />
              <PriorityButton priority="medium" label="Média" color="#F59E0B" />
              <PriorityButton priority="high" label="Alta" color="#EF4444" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <User size={16} color="#6B7280" style={styles.labelIcon} />
              Responsável
            </Text>
            <TextInput
              style={[styles.input, userRole !== 'admin' && styles.inputDisabled]}
              value={formData.assignedTo}
              onChangeText={(text) => setFormData({ ...formData, assignedTo: text })}
              placeholder="Digite o nome do responsável"
              editable={userRole === 'admin'}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <MapPin size={16} color="#6B7280" style={styles.labelIcon} />
              Local
            </Text>
            <TextInput
              style={[styles.input, userRole !== 'admin' && styles.inputDisabled]}
              value={formData.area}
              onChangeText={(text) => setFormData({ ...formData, area: text })}
              placeholder="Digite o local da tarefa"
              editable={userRole === 'admin'}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Calendar size={16} color="#6B7280" style={styles.labelIcon} />
              Entrada
            </Text>
            <TextInput
              style={[styles.input, isReadOnly && styles.inputDisabled]}
              value={formData.dueDate}
              onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
              placeholder="DD-MM-AAAA"
              editable={!isReadOnly && userRole === 'admin'}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Camera size={16} color="#6B7280" style={styles.labelIcon} />
              Mídia
            </Text>
            <View style={styles.mediaButtons}>
              <TouchableOpacity 
                style={styles.mediaButton} 
                onPress={pickImage}
                disabled={isReadOnly}
              >
                <ImagePlus size={20} color="#6B7280" />
                <Text style={styles.mediaButtonText}>Adicionar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.mediaButton} 
                onPress={pickVideo}
                disabled={isReadOnly}
              >
                <Video size={20} color="#6B7280" />
                <Text style={styles.mediaButtonText}>Adicionar Vídeo</Text>
              </TouchableOpacity>
            </View>

            {(formData.photos.length > 0 || formData.videos.length > 0) && (
              <View style={styles.mediaContainer}>
                {formData.photos.map((photo, index) => (
                  <View key={`photo-${index}`} style={styles.mediaItem}>
                    <Image source={{ uri: photo }} style={styles.mediaPreview} />
                    {!isReadOnly && (
                      <TouchableOpacity 
                        style={styles.removeMediaButton}
                        onPress={() => removeMedia('photo', index)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {formData.videos.map((video, index) => (
                  <View key={`video-${index}`} style={styles.mediaItem}>
                    <View style={styles.videoPreview}>
                      <Video size={24} color="#6B7280" />
                    </View>
                    {!isReadOnly && (
                      <TouchableOpacity 
                        style={styles.removeMediaButton}
                        onPress={() => removeMedia('video', index)}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          {!isReadOnly && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Salvar' : 'Criar Tarefa'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Area Picker Modal */}
        <Modal
          visible={showAreaPicker}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModal}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Selecione a Área</Text>
                <TouchableOpacity onPress={() => setShowAreaPicker(false)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {areas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={styles.pickerOption}
                    onPress={() => {
                      setFormData({ ...formData, area });
                      setShowAreaPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelIcon: {
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  priorityButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  pickerText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerTextDisabled: {
    color: '#9CA3AF',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pickerOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flex: 1,
  },
  mediaButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  mediaItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});