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
} from 'react-native';
import { X, Camera, User, Calendar, Flag, MapPin } from 'lucide-react-native';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  photos: string[];
  area: string;
}

interface TaskModalProps {
  visible: boolean;
  task: Task | null;
  userRole: 'admin' | 'worker';
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
  });

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
        photos: task.photos,
      });
    } else {
      // Reset form for new task
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedTo: workers[0],
        dueDate: new Date().toISOString().split('T')[0],
        area: areas[0],
        photos: [],
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
        (isReadOnly || userRole === 'worker') && styles.statusButtonDisabled,
      ]}
      onPress={() => userRole === 'admin' && !isReadOnly && setFormData({ ...formData, priority })}
      disabled={isReadOnly || userRole === 'worker'}
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
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerText, (isReadOnly || userRole === 'worker') && styles.pickerTextDisabled]}>
                {formData.assignedTo}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <MapPin size={16} color="#6B7280" style={styles.labelIcon} />
              Área
            </Text>
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerText, (isReadOnly || userRole === 'worker') && styles.pickerTextDisabled]}>
                {formData.area}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Calendar size={16} color="#6B7280" style={styles.labelIcon} />
              Data de Vencimento
            </Text>
            <TextInput
              style={[styles.input, (isReadOnly || userRole === 'worker') && styles.inputDisabled]}
              value={formData.dueDate}
              onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
              placeholder="AAAA-MM-DD"
              editable={!isReadOnly && userRole === 'admin'}
            />
          </View>

          {formData.photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>
                <Camera size={16} color="#6B7280" style={styles.labelIcon} />
                Fotos ({formData.photos.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photosContainer}>
                  {formData.photos.map((photo, index) => (
                    <Image key={index} source={{ uri: photo }} style={styles.photo} />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  pickerTextDisabled: {
    color: '#6B7280',
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
});