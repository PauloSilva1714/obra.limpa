import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthService } from '@/services/AuthService';

export default function Index() {
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Verificando autenticação do usuário...');
        const isAuthenticated = await AuthService.isAuthenticated();
        console.log('Usuário autenticado:', isAuthenticated);
        
        if (isAuthenticated) {
          // Usuário já está autenticado, redirecionar para as abas
          console.log('Redirecionando para as abas...');
          router.replace('/(tabs)');
        } else {
          // Usuário não está autenticado, limpar dados e ir para login
          console.log('Usuário não autenticado, indo para login...');
          await AuthService.clearAuthData();
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, ir para login
        await AuthService.clearAuthData();
        router.replace('/(auth)/login');
      }
    };
    
    initialize();
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F97316',
  },
});