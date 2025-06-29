import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Platform } from 'react-native';

class PhotoManagementService {
  private readonly PHOTOS_KEY = '@recent_photos';

  async savePhoto(photoUri: string): Promise<void> {
    try {
      const existingPhotos = await this.getRecentPhotos();
      const updatedPhotos = [photoUri, ...existingPhotos.slice(0, 9)]; // Keep last 10 photos
      await AsyncStorage.setItem(this.PHOTOS_KEY, JSON.stringify(updatedPhotos));
    } catch (error) {
      console.error('Error saving photo:', error);
      throw error;
    }
  }

  async getRecentPhotos(): Promise<string[]> {
    try {
      const photosData = await AsyncStorage.getItem(this.PHOTOS_KEY);
      return photosData ? JSON.parse(photosData) : [];
    } catch (error) {
      console.error('Error loading recent photos:', error);
      return [];
    }
  }

  async deletePhoto(photoUri: string): Promise<void> {
    try {
      const existingPhotos = await this.getRecentPhotos();
      const updatedPhotos = existingPhotos.filter(uri => uri !== photoUri);
      await AsyncStorage.setItem(this.PHOTOS_KEY, JSON.stringify(updatedPhotos));
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }

  async clearAllPhotos(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PHOTOS_KEY);
    } catch (error) {
      console.error('Error clearing photos:', error);
      throw error;
    }
  }
}

export const PhotoService = new PhotoManagementService();

export async function uploadImageAsync(uri: string, userId: string): Promise<string> {
  try {
    console.log('🔄 Iniciando upload de imagem:', uri);
    
    // Para web, se a URI já é uma URL do Firebase Storage, retornar diretamente
    if (Platform.OS === 'web' && uri.startsWith('https://firebasestorage.googleapis.com')) {
      console.log('✅ Imagem já está no Firebase Storage, retornando URL existente');
      return uri;
    }
    
    // Para web, se é uma URL local (blob), usar URL local temporária
    if (Platform.OS === 'web' && (uri.startsWith('blob:') || uri.startsWith('http://localhost'))) {
      console.log('🌐 Processando imagem no web (modo desenvolvimento)...');
      
      // Em desenvolvimento, usar URL local temporária para evitar problemas de CORS
      if (uri.startsWith('blob:')) {
        console.log('🔄 Usando URL blob local para desenvolvimento');
        return uri;
      }
      
      // Se for uma URL local, tentar fazer fetch e criar blob
      try {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Erro ao buscar imagem: ${response.status}`);
        }
        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        console.log('✅ URL local criada:', localUrl);
        return localUrl;
      } catch (fetchError) {
        console.log('⚠️ Erro no fetch, retornando URI original');
        return uri;
      }
    }
    
    // Para mobile, tentar upload para Firebase Storage
    console.log('📱 Processando imagem no mobile...');
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Erro ao buscar imagem: ${response.status}`);
      }
      const blob = await response.blob();
      
      const storage = getStorage();
      const fileName = `tasks/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const fileRef = ref(storage, fileName);
      
      console.log('📤 Fazendo upload para Firebase Storage...');
      await uploadBytes(fileRef, blob);
      
      console.log('🔗 Obtendo URL de download...');
      const downloadURL = await getDownloadURL(fileRef);
      console.log('✅ Upload concluído:', downloadURL);
      
      return downloadURL;
    } catch (storageError) {
      console.error('❌ Erro no Firebase Storage:', storageError);
      console.log('🔄 Retornando URI original como fallback');
      return uri;
    }
  } catch (error) {
    console.error('❌ Erro no upload de imagem:', error);
    
    // Em caso de erro, retornar a URI original
    console.log('🔄 Retornando URI original como fallback');
    return uri;
  }
}