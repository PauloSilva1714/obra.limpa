import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const AdminService = {
  getAdminStats: async () => {
    try {
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const completedTasksSnapshot = await getDocs(
        query(collection(db, 'tasks'), where('status', '==', 'completed'))
      );

      return {
        totalSites: sitesSnapshot.size,
        totalWorkers: usersSnapshot.size,
        totalTasks: tasksSnapshot.size,
        completedTasks: completedTasksSnapshot.size,
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw new Error('Could not fetch admin statistics.');
    }
  },
}; 