import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthService } from '@/services/AuthService';

export default function Index() {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const isAuthenticated = await AuthService.isAuthenticated();
    const currentSite = await AuthService.getCurrentSite();
    
    if (isAuthenticated && currentSite) {
      router.replace('/(tabs)');
    } else if (isAuthenticated) {
      router.replace('/(auth)/site-selection');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F97316',
  },
});