import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthService } from '@/services/AuthService';

export default function Index() {
  useEffect(() => {
    const initialize = async () => {
      await AuthService.clearAuthData();
      router.replace('/(auth)/login');
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