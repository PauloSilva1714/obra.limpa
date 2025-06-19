import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AuthService } from './AuthService';

export interface ProgressData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  weeklyProgress: Array<{
    day: string;
    completed: number;
  }>;
  areaProgress: Array<{
    area: string;
    total: number;
    completed: number;
    percentage: number;
  }>;
}

export class ProgressService {
  private static instance: ProgressService;

  private constructor() {}

  public static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  async getProgressData(): Promise<ProgressData> {
    try {
      const currentSite = await AuthService.getCurrentSite();
      if (!currentSite) {
        throw new Error('Nenhuma obra selecionada');
      }

      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('siteId', '==', currentSite.id));
      const querySnapshot = await getDocs(q);

      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular estatísticas gerais
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
      const pendingTasks = tasks.filter(task => task.status === 'pending').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calcular progresso semanal
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const weeklyProgress = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
        
        const completed = tasks.filter(task => {
          const taskDate = new Date(task.updatedAt?.toDate() || task.createdAt?.toDate());
          return taskDate.toDateString() === date.toDateString() && task.status === 'completed';
        }).length;

        return { day: dayName, completed };
      });

      // Calcular progresso por área
      const areas = [...new Set(tasks.map(task => task.area))];
      const areaProgress = areas.map(area => {
        const areaTasks = tasks.filter(task => task.area === area);
        const total = areaTasks.length;
        const completed = areaTasks.filter(task => task.status === 'completed').length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          area,
          total,
          completed,
          percentage
        };
      });

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionRate,
        weeklyProgress,
        areaProgress
      };
    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
      throw error;
    }
  }
}