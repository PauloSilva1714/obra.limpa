import TaskService from './TaskService';

interface ProgressData {
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

class ProgressManagementService {
  async getProgressData(): Promise<ProgressData> {
    try {
      const tasks = await TaskService.getTasks();
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
      const pendingTasks = tasks.filter(task => task.status === 'pending').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Generate weekly progress (mock data for demo)
      const weeklyProgress = [
        { day: 'Seg', completed: 2 },
        { day: 'Ter', completed: 1 },
        { day: 'Qua', completed: 3 },
        { day: 'Qui', completed: 0 },
        { day: 'Sex', completed: 1 },
        { day: 'Sáb', completed: 0 },
        { day: 'Dom', completed: 0 },
      ];

      // Calculate progress by area
      const areaStats = tasks.reduce((acc, task) => {
        if (!acc[task.area]) {
          acc[task.area] = { total: 0, completed: 0 };
        }
        acc[task.area].total++;
        if (task.status === 'completed') {
          acc[task.area].completed++;
        }
        return acc;
      }, {} as Record<string, { total: number; completed: number }>);

      const areaProgress = Object.entries(areaStats).map(([area, stats]) => ({
        area,
        total: stats.total,
        completed: stats.completed,
        percentage: Math.round((stats.completed / stats.total) * 100),
      }));

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        completionRate,
        weeklyProgress,
        areaProgress,
      };
    } catch (error) {
      console.error('Error loading progress data:', error);
      // Return default data in case of error
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        completionRate: 0,
        weeklyProgress: [],
        areaProgress: [],
      };
    }
  }
}

export const ProgressService = new ProgressManagementService();