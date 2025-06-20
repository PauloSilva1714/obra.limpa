import { getFunctions, httpsCallable } from "firebase/functions";
import { User } from './AuthService';

const functions = getFunctions();
const sendEmailV2 = httpsCallable(functions, 'sendEmailV2');

export interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const EmailService = {
  /**
   * Envia um email usando a Cloud Function
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await sendEmailV2(emailData);
      
      if (result.data.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.data.error || 'Erro desconhecido ao enviar email' 
        };
      }
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Confirmação de criação de tarefa
   */
  async sendTaskCreationConfirmation(
    user: User,
    taskData: {
      title: string;
      description: string;
      assignedTo: string;
      dueDate?: string;
      area: string;
      priority: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (user.notifications?.taskCreation === false) {
      return { success: true, error: 'User opted out of this notification.' };
    }
    const dueDateText = taskData.dueDate 
      ? new Date(taskData.dueDate).toLocaleDateString('pt-BR')
      : 'Não definida';

    return this.sendEmail({
      to: user.email,
      subject: `Tarefa Criada: ${taskData.title}`,
      text: `Tarefa criada com sucesso!\n\nTítulo: ${taskData.title}\nDescrição: ${taskData.description}\nDesignado para: ${taskData.assignedTo}\nData de vencimento: ${dueDateText}\nÁrea: ${taskData.area}\nPrioridade: ${taskData.priority}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563EB;">✅ Tarefa Criada com Sucesso</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">${taskData.title}</h3>
            <p style="color: #6b7280; line-height: 1.6;">${taskData.description}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Designado para:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${taskData.assignedTo}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Data de vencimento:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${dueDateText}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Área:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${taskData.area}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Prioridade:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                <span style="
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  font-size: 12px; 
                  font-weight: bold;
                  background-color: ${taskData.priority === 'high' ? '#fee2e2' : taskData.priority === 'medium' ? '#fef3c7' : '#dcfce7'};
                  color: ${taskData.priority === 'high' ? '#dc2626' : taskData.priority === 'medium' ? '#d97706' : '#16a34a'};
                ">
                  ${taskData.priority === 'high' ? 'Alta' : taskData.priority === 'medium' ? 'Média' : 'Baixa'}
                </span>
              </td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Acesse o app Obra Limpa para acompanhar o progresso desta tarefa.
          </p>
        </div>
      `
    });
  },

  /**
   * Confirmação de atualização de tarefa
   */
  async sendTaskUpdateConfirmation(
    user: User,
    taskData: {
      title: string;
      status: string;
      updatedBy: string;
      changes: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (user.notifications?.taskUpdate === false) {
      return { success: true, error: 'User opted out of this notification.' };
    }
    const statusText = {
      'pending': 'Pendente',
      'in_progress': 'Em Andamento',
      'completed': 'Concluída'
    }[taskData.status] || taskData.status;

    return this.sendEmail({
      to: user.email,
      subject: `Tarefa Atualizada: ${taskData.title}`,
      text: `Tarefa atualizada com sucesso!\n\nTítulo: ${taskData.title}\nStatus: ${statusText}\nAtualizado por: ${taskData.updatedBy}\n\nAlterações:\n${taskData.changes.map(change => `• ${change}`).join('\n')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563EB;">📝 Tarefa Atualizada</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">${taskData.title}</h3>
            <p><strong>Status:</strong> ${statusText}</p>
            <p><strong>Atualizado por:</strong> ${taskData.updatedBy}</p>
          </div>
          <h4 style="color: #374151;">Alterações realizadas:</h4>
          <ul style="color: #6b7280; line-height: 1.6;">
            ${taskData.changes.map(change => `<li>${change}</li>`).join('')}
          </ul>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Acesse o app Obra Limpa para ver os detalhes completos.
          </p>
        </div>
      `
    });
  },

  /**
   * Confirmação de login
   */
  async sendLoginConfirmation(
    user: User,
    loginData: {
      loginTime: string;
      deviceInfo?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (user.notifications?.loginConfirmation === false) {
      return { success: true, error: 'User opted out of this notification.' };
    }
    return this.sendEmail({
      to: user.email,
      subject: "Login Confirmado - Obra Limpa",
      text: `Login realizado com sucesso!\n\nUsuário: ${user.name}\nEmpresa: ${user.company || 'N/A'}\nHorário: ${loginData.loginTime}\n${loginData.deviceInfo ? `Dispositivo: ${loginData.deviceInfo}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">🔐 Login Confirmado</h2>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="color: #1f2937; margin-top: 0;">Bem-vindo de volta!</h3>
            <p><strong>Usuário:</strong> ${user.name}</p>
            <p><strong>Empresa:</strong> ${user.company || 'Não informada'}</p>
            <p><strong>Horário do login:</strong> ${loginData.loginTime}</p>
            ${loginData.deviceInfo ? `<p><strong>Dispositivo:</strong> ${loginData.deviceInfo}</p>` : ''}
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Se você não realizou este login, entre em contato com o administrador imediatamente.
          </p>
        </div>
      `
    });
  },

  /**
   * Envia notificação de nova tarefa
   */
  async sendTaskNotification(
    userEmail: string, 
    taskTitle: string, 
    taskDescription: string,
    assignedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: userEmail,
      subject: `Nova Tarefa: ${taskTitle}`,
      text: `Você foi designado para uma nova tarefa: ${taskTitle}\n\nDescrição: ${taskDescription}\n\nDesignado por: ${assignedBy}`,
      html: `
        <h2>Nova Tarefa Designada</h2>
        <p><strong>Tarefa:</strong> ${taskTitle}</p>
        <p><strong>Descrição:</strong> ${taskDescription}</p>
        <p><strong>Designado por:</strong> ${assignedBy}</p>
        <p>Acesse o app Obra Limpa para mais detalhes.</p>
      `
    });
  },

  /**
   * Envia notificação de conclusão de tarefa
   */
  async sendTaskCompletionNotification(
    adminEmail: string,
    taskTitle: string,
    completedBy: string,
    completionDate: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: adminEmail,
      subject: `Tarefa Concluída: ${taskTitle}`,
      text: `A tarefa "${taskTitle}" foi concluída por ${completedBy} em ${completionDate}.`,
      html: `
        <h2>Tarefa Concluída</h2>
        <p><strong>Tarefa:</strong> ${taskTitle}</p>
        <p><strong>Concluída por:</strong> ${completedBy}</p>
        <p><strong>Data de conclusão:</strong> ${completionDate}</p>
        <p>Acesse o app Obra Limpa para verificar os detalhes.</p>
      `
    });
  },

  /**
   * Envia relatório diário de tarefas
   */
  async sendDailyReport(
    adminEmail: string,
    reportData: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      inProgressTasks: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const completionRate = reportData.totalTasks > 0 
      ? Math.round((reportData.completedTasks / reportData.totalTasks) * 100) 
      : 0;

    return this.sendEmail({
      to: adminEmail,
      subject: "Relatório Diário - Obra Limpa",
      text: `Relatório diário de tarefas:\n\nTotal: ${reportData.totalTasks}\nConcluídas: ${reportData.completedTasks}\nEm andamento: ${reportData.inProgressTasks}\nPendentes: ${reportData.pendingTasks}\n\nTaxa de conclusão: ${completionRate}%`,
      html: `
        <h2>Relatório Diário - Obra Limpa</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 8px; border: 1px solid #d1d5db;"><strong>Total de Tarefas</strong></td>
            <td style="padding: 8px; border: 1px solid #d1d5db;">${reportData.totalTasks}</td>
          </tr>
          <tr style="background-color: #dcfce7;">
            <td style="padding: 8px; border: 1px solid #d1d5db;"><strong>Concluídas</strong></td>
            <td style="padding: 8px; border: 1px solid #d1d5db;">${reportData.completedTasks}</td>
          </tr>
          <tr style="background-color: #fef3c7;">
            <td style="padding: 8px; border: 1px solid #d1d5db;"><strong>Em Andamento</strong></td>
            <td style="padding: 8px; border: 1px solid #d1d5db;">${reportData.inProgressTasks}</td>
          </tr>
          <tr style="background-color: #fee2e2;">
            <td style="padding: 8px; border: 1px solid #d1d5db;"><strong>Pendentes</strong></td>
            <td style="padding: 8px; border: 1px solid #d1d5db;">${reportData.pendingTasks}</td>
          </tr>
        </table>
        <p style="margin-top: 16px;"><strong>Taxa de Conclusão:</strong> ${completionRate}%</p>
      `
    });
  }
}; 