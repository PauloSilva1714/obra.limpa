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
      area: 'Canteiro'
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
      area: 'Almoxarifado'
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
      area: 'Instalações'
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
      area: 'Área Externa'
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
      area: 'Escritório'
    }
  ];

  async getTasks(): Promise<Task[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...this.demoTasks];
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
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