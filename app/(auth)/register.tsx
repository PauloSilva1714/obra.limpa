import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, User, Lock, Mail, Phone, ArrowLeft, Key } from 'lucide-react-native';
import { AuthService } from '@/services/AuthService';

export default function RegisterScreen() {
  const { role, inviteId } = useLocalSearchParams<{ role: 'admin' | 'worker', inviteId?: string }>();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    siteName: '',
    inviteCode: inviteId || '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (role === 'admin' && !formData.siteName.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome da obra.');
      return;
    }

    if (role === 'worker') {
      if (!formData.inviteCode.trim()) {
        Alert.alert('Erro', 'Código de convite é obrigatório para colaboradores.');
        return;
      }

      try {
        const isValidInvite = await AuthService.validateInvite(formData.inviteCode.trim(), formData.email.trim());
        if (!isValidInvite) {
          Alert.alert('Erro', 'Convite inválido ou expirado.');
          return;
        }
      } catch (error) {
        Alert.alert('Erro', 'Erro ao validar convite.');
        return;
      }
    }

    setLoading(true);
    try {
      await AuthService.register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role,
        phone: formData.phone.trim(),
        company: formData.company.trim(),
        siteName: formData.siteName.trim(),
        inviteId: formData.inviteCode.trim()
      });

      Alert.alert(
        'Sucesso!',
        'Cadastro concluído com sucesso! Você será redirecionado para a tela de login.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                phone: '',
                company: '',
                siteName: '',
                inviteCode: ''
              });
              router.replace('/(auth)/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Register error:', error);
      if (error instanceof Error) {
        if (error.message === 'Email já está em uso') {
          Alert.alert('Erro', 'Este e-mail já está cadastrado.');
        } else if (error.message === 'Convite necessário para cadastro de colaborador') {
          Alert.alert('Erro', 'É necessário um convite válido para se cadastrar como colaborador.');
        } else if (error.message === 'Convite inválido ou expirado') {
          Alert.alert('Erro', 'O convite informado é inválido ou expirou.');
        } else {
          Alert.alert('Erro', 'Erro ao realizar cadastro. Tente novamente.');
        }
      } else {
        Alert.alert('Erro', 'Erro ao realizar cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Building2 size={48} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.title}>Cadastro de {role === 'admin' ? 'Administrador' : 'Colaborador'}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <User size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Phone size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#999999"
              />
            </View>

            {role === 'admin' && (
              <>
                <View style={styles.inputContainer}>
                  <Building2 size={20} color="#666666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome da empresa"
                    value={formData.company}
                    onChangeText={(text) => setFormData({ ...formData, company: text })}
                    placeholderTextColor="#999999"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Building2 size={20} color="#666666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome da obra"
                    value={formData.siteName}
                    onChangeText={(text) => setFormData({ ...formData, siteName: text })}
                    placeholderTextColor="#999999"
                  />
                </View>
              </>
            )}

            {role === 'worker' && (
              <View style={styles.inputContainer}>
                <Key size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Código do convite"
                  value={formData.inviteCode}
                  onChangeText={(text) => setFormData({ ...formData, inviteCode: text })}
                  placeholderTextColor="#999999"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#666666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar senha"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry
                placeholderTextColor="#999999"
              />
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.buttonDisabled]} 
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F97316',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 24,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
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
  registerButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
}); 