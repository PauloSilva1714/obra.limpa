import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Trash2 } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';
import TaskService from '@/services/TaskService';

interface Site {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
}

export default function EditSiteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadSite();
  }, [id]);

  useEffect(() => {
    if (!site) return;
    const unsubscribe = TaskService.subscribeToTasksBySite(site.id, (tasks) => {
      setTasks(tasks);
    });
    return () => unsubscribe && unsubscribe();
  }, [site]);

  const loadSite = async () => {
    try {
      const siteData = await AuthService.getSiteById(id);
      if (siteData) {
        setSite(siteData);
        setName(siteData.name);
        setAddress(siteData.address);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar dados da obra.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSite = async () => {
    if (!name || !address) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setSaving(true);
    try {
      await AuthService.updateSite(id, {
        name,
        address,
        status: site?.status || 'active',
      });
      Alert.alert(
        'Sucesso',
        'Obra atualizada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar obra. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSite = () => {
    Alert.alert(
      'Remover Obra',
      'Tem certeza que deseja remover esta obra? Esta ação não pode ser desfeita.',
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
              await AuthService.deleteSite(id);
              router.back();
            } catch (error) {
              Alert.alert('Erro', 'Erro ao remover obra.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Obra</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteSite}
        >
          <Trash2 size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Nome da Obra</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Edifício Comercial Centro"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Endereço</Text>
          <View style={styles.inputContainer}>
            <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: Rua Exemplo, 123 - Centro"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        {site && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#374151', fontSize: 16 }}>
              Tarefas relacionadas a esta obra: <Text style={{ fontWeight: 'bold' }}>{tasks.length}</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleUpdateSite}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
}); 