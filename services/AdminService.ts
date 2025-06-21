import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AuthService } from './AuthService';

export const AdminService = {
  getAdminStats: async () => {
    try {
      console.log('[AdminService] Iniciando busca de estatísticas...');
      
      // Buscar obras
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      console.log('[AdminService] Obras encontradas:', sitesSnapshot.size);
      
      // Buscar colaboradores usando o método do AuthService
      const workers = await AuthService.getInstance().getWorkers();
      console.log('[AdminService] Colaboradores encontrados:', workers.length);
      
      // Buscar tarefas do site atual
      const currentSite = await AuthService.getCurrentSite();
      if (!currentSite) {
        console.log('[AdminService] Nenhum site selecionado, retornando estatísticas vazias');
        return {
          totalSites: sitesSnapshot.size,
          totalWorkers: workers.length,
          totalTasks: 0,
          completedTasks: 0,
        };
      }
      
      console.log('[AdminService] Site atual para estatísticas:', currentSite.id);
      
      // Buscar tarefas do site atual
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('siteId', '==', currentSite.id)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      console.log('[AdminService] Total de tarefas encontradas para o site:', tasksSnapshot.size);
      
      // Log detalhado de cada tarefa
      tasksSnapshot.forEach((doc, index) => {
        const taskData = doc.data();
        console.log(`[AdminService] Tarefa ${index + 1}:`, {
          id: doc.id,
          title: taskData.title,
          siteId: taskData.siteId,
          status: taskData.status,
          createdAt: taskData.createdAt
        });
      });
      
      // Buscar tarefas concluídas do site atual
      const completedTasksQuery = query(
        collection(db, 'tasks'),
        where('siteId', '==', currentSite.id),
        where('status', '==', 'completed')
      );
      const completedTasksSnapshot = await getDocs(completedTasksQuery);
      console.log('[AdminService] Tarefas concluídas do site:', completedTasksSnapshot.size);

      const stats = {
        totalSites: sitesSnapshot.size,
        totalWorkers: workers.length,
        totalTasks: tasksSnapshot.size,
        completedTasks: completedTasksSnapshot.size,
      };
      
      console.log('[AdminService] Estatísticas finais:', stats);
      return stats;
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw new Error('Could not fetch admin statistics.');
    }
  },
}; 