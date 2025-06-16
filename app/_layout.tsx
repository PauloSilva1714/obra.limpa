import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthService } from '@/services/AuthService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Verificando autenticação...');
        const isAuthenticated = await AuthService.isAuthenticated();
        console.log('Status de autenticação:', isAuthenticated);

        if (isAuthenticated) {
          const currentSite = await AuthService.getCurrentSite();
          console.log('Canteiro atual:', currentSite);
          
          const currentPath = segments.join('/');
          console.log('Caminho atual:', currentPath);

          if (!currentSite && !currentPath.includes('site-selection')) {
            console.log('Redirecionando para seleção de canteiro...');
            router.replace('/(auth)/site-selection');
          } else if (currentSite && currentPath.includes('(auth)')) {
            console.log('Redirecionando para tabs...');
            router.replace('/(tabs)');
          }
        } else if (!segments.includes('login')) {
          console.log('Redirecionando para login...');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [segments]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/site-selection" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}