import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseErrorHandler } from '../services/FirebaseErrorHandler';
import { checkFirebaseConnection } from '../config/firebase';

interface ConnectionStatusProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await checkFirebaseConnection();
      setIsConnected(connected);
      onConnectionChange?.(connected);
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      setIsConnected(false);
      onConnectionChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleReconnect = async () => {
    setIsChecking(true);
    try {
      const success = await FirebaseErrorHandler.clearCacheAndReconnect();
      if (success) {
        setIsConnected(true);
        onConnectionChange?.(true);
        Alert.alert('Sucesso', 'Conexão restaurada com sucesso!');
      } else {
        Alert.alert('Erro', 'Não foi possível restaurar a conexão. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro na reconexão:', error);
      Alert.alert('Erro', 'Erro ao tentar reconectar. Verifique sua conexão com a internet.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Verifica conexão a cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <Ionicons name="ellipse" size={8} color="#FFA500" />
          <Text style={styles.statusText}>Verificando conexão...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Ionicons 
          name="ellipse" 
          size={8} 
          color={isConnected ? '#4CAF50' : '#F44336'} 
        />
        <Text style={styles.statusText}>
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Text>
      </View>
      
      {!isConnected && (
        <TouchableOpacity 
          style={styles.reconnectButton} 
          onPress={handleReconnect}
          disabled={isChecking}
        >
          <Ionicons 
            name={isChecking ? "refresh" : "refresh-outline"} 
            size={16} 
            color="#2196F3" 
          />
          <Text style={styles.reconnectText}>
            {isChecking ? 'Reconectando...' : 'Reconectar'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  reconnectText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
}); 