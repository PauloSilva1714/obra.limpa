import { AuthService } from './AuthService';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  photos: string[];
  area: string;
  siteId: string;
}

class TaskManagementService {
  private demoTasks: Task[] = [
    {
      id: '1',
      title: 'Limpeza do Canteiro Principal',
      description: 'Remover entulhos e organizar materiais de construção na área central do canteiro.',
      status: 'pending',
      priority: 'high',
      assignedTo: 'João Silva',
      dueDate: '2024-01-20',
      createdAt: '2024-01-15',
      photos: [],
      area: 'Canteiro',
      siteId: '1'
    },
    {
      id: '2',
      title: 'Organização do Almoxarifado',
      description: 'Catalogar e organizar ferramentas e materiais no almoxarifado.',
      status: 'in_progress',
      priority: 'medium',
      assignedTo: 'Maria Santos',
      dueDate: '2024-01-22',
      createdAt: '2024-01-16',
      photos: ['https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg'],
      area: 'Almoxarifado',
      siteId: '1'
    },
    {
      id: '3',
      title: 'Limpeza dos Banheiros Provisórios',
      description: 'Higienização completa dos banheiros químicos e reposição de suprimentos.',
      status: 'completed',
      priority: 'high',
      assignedTo: 'Carlos Oliveira',
      dueDate: '2024-01-18',
      createdAt: '2024-01-14',
      photos: ['https://images.pexels.com/photos/209274/pexels-photo-209274.jpeg'],
      area: 'Instalações',
      siteId: '1'
    },
    {
      id: '4',
      title: 'Varredura da Área Externa',
      description: 'Limpeza completa da área externa do canteiro, incluindo calçadas.',
      status: 'pending',
      priority: 'low',
      assignedTo: 'Ana Costa',
      dueDate: '2024-01-25',
      createdAt: '2024-01-17',
      photos: [],
      area: 'Área Externa',
      siteId: '1'
    },
    {
      id: '5',
      title: 'Organização da Sala de Reuniões',
      description: 'Organizar documentos e limpar a sala de reuniões do escritório.',
      status: 'in_progress',
      priority: 'medium',
      assignedTo: 'Pedro Silva',
      dueDate: '2024-01-21',
      createdAt: '2024-01-16',
      photos: [],
      area: 'Escritório',
      siteId: '1'
    }
  ];

  async getTasks(): Promise<Task[]> {
    try {
      console.log('Obtendo canteiro atual...');
      const currentSite = await AuthService.getCurrentSite();
      console.log('Canteiro atual:', currentSite);

      if (!currentSite) {
        console.error('Nenhum canteiro selecionado');
        return [];
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const tasks = this.demoTasks.filter(task => task.siteId === currentSite.id);
      console.log('Tarefas filtradas:', tasks);
      return tasks;
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      return [];
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const currentSite = await AuthService.getCurrentSite();
    if (!currentSite) {
      throw new Error('Nenhum canteiro selecionado');
    }

    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      siteId: currentSite.id
    };
    
    this.demoTasks.unshift(newTask);
    return newTask;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const taskIndex = this.demoTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    this.demoTasks[taskIndex] = {
      ...this.demoTasks[taskIndex],
      ...updates
    };
    
    return this.demoTasks[taskIndex];
  }

  async deleteTask(taskId: string): Promise<void> {
    this.demoTasks = this.demoTasks.filter(task => task.id !== taskId);
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return this.demoTasks.find(task => task.id === taskId) || null;
  }
}

export const TaskService = new TaskManagementService();