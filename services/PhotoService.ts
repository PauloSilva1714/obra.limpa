import AsyncStorage from '@react-native-async-storage/async-storage';

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