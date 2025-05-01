import { logger } from '../lib/error-handling';
import { config } from '../lib/config';

/**
 * Tipo de tarea en la cola
 */
export type QueueTask<T = any> = {
  id: string;
  type: string;
  data: T;
  priority: number;
  maxRetries: number;
  retryCount: number;
  createdAt: Date;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: any;
};

/**
 * Tipo para manejadores de tareas
 */
export type TaskHandler<T = any, R = any> = (data: T) => Promise<R>;

/**
 * Sistema simple de colas en memoria
 */
class QueueService {
  private tasks: QueueTask[] = [];
  private handlers: Map<string, TaskHandler> = new Map();
  private isProcessing = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Iniciar automáticamente si estamos en modo queue
    if (config.serviceMode === 'queue') {
      this.startProcessing();
    }
  }
  
  /**
   * Registra un manejador para un tipo específico de tarea
   */
  public registerHandler<T, R>(taskType: string, handler: TaskHandler<T, R>): void {
    if (this.handlers.has(taskType)) {
      logger.warn(`Reemplazando manejador existente para tareas tipo "${taskType}"`);
    }
    
    this.handlers.set(taskType, handler);
    logger.info(`Manejador registrado para tareas tipo "${taskType}"`);
  }
  
  /**
   * Añade una tarea a la cola
   */
  public async enqueue<T>(
    taskType: string, 
    data: T, 
    options: { 
      priority?: number; 
      maxRetries?: number; 
      taskId?: string; 
    } = {}
  ): Promise<string> {
    const { 
      priority = 0, 
      maxRetries = config.maxRetries, 
      taskId = `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
    } = options;
    
    // Verificar que existe un manejador para este tipo de tarea
    if (!this.handlers.has(taskType)) {
      logger.warn(`No hay manejador registrado para tareas tipo "${taskType}"`);
    }
    
    const task: QueueTask<T> = {
      id: taskId,
      type: taskType,
      data,
      priority,
      maxRetries,
      retryCount: 0,
      createdAt: new Date(),
      status: 'pending'
    };
    
    this.tasks.push(task);
    
    // Ordenar la cola por prioridad (mayor prioridad primero)
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    logger.info(`Tarea añadida a la cola: ${taskId} (tipo: ${taskType})`);
    
    // Si estamos en modo directo, procesar inmediatamente
    if (config.serviceMode === 'direct') {
      await this.processTask(task);
    }
    
    return taskId;
  }
  
  /**
   * Inicia el procesamiento de la cola
   */
  public startProcessing(pollingIntervalMs: number = 5000): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(() => {
      this.processNextTask();
    }, pollingIntervalMs);
    
    logger.info(`Procesamiento de cola iniciado (intervalo: ${pollingIntervalMs}ms)`);
    
    // Procesar una tarea inmediatamente
    this.processNextTask();
  }
  
  /**
   * Detiene el procesamiento de la cola
   */
  public stopProcessing(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Procesamiento de cola detenido');
    }
  }
  
  /**
   * Procesa la siguiente tarea pendiente en la cola
   */
  private async processNextTask(): Promise<void> {
    // Si ya estamos procesando, no iniciar otro procesamiento
    if (this.isProcessing) {
      return;
    }
    
    // Buscar la siguiente tarea pendiente
    const nextTask = this.tasks.find(task => task.status === 'pending');
    
    if (!nextTask) {
      // No hay tareas pendientes
      return;
    }
    
    this.isProcessing = true;
    
    try {
      await this.processTask(nextTask);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Procesa una tarea específica
   */
  private async processTask(task: QueueTask): Promise<void> {
    logger.info(`Procesando tarea ${task.id} (tipo: ${task.type}, intento: ${task.retryCount + 1}/${task.maxRetries + 1})`);
    
    // Actualizar estado y tiempo de intento
    task.status = 'processing';
    task.lastAttempt = new Date();
    task.retryCount += 1;
    
    try {
      const handler = this.handlers.get(task.type);
      
      if (!handler) {
        throw new Error(`No hay manejador registrado para tareas tipo "${task.type}"`);
      }
      
      // Ejecutar el manejador
      const result = await handler(task.data);
      
      // Actualizar estado de la tarea
      task.status = 'completed';
      task.result = result;
      
      logger.info(`Tarea ${task.id} completada exitosamente`);
    } catch (error) {
      // Verificar si debemos reintentar
      if (task.retryCount <= task.maxRetries) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Error en tarea ${task.id}: ${errorMessage} (se reintentará)`);
        
        // Volver a poner en estado pendiente para reintentar
        task.status = 'pending';
        task.error = errorMessage;
        
        // Aplazar el reintento con backoff exponencial
        const delayMs = Math.min(30000, 1000 * Math.pow(2, task.retryCount - 1));
        setTimeout(() => {
          // Si todavía está pendiente, podemos procesarla
          if (task.status === 'pending' && !this.isProcessing) {
            this.processNextTask();
          }
        }, delayMs);
      } else {
        // No más reintentos
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Tarea ${task.id} fallida después de ${task.retryCount} intentos: ${errorMessage}`);
        
        task.status = 'failed';
        task.error = errorMessage;
      }
    }
  }
  
  /**
   * Obtiene el estado de una tarea por su ID
   */
  public getTaskStatus(taskId: string): QueueTask | null {
    const task = this.tasks.find(t => t.id === taskId);
    return task ? { ...task } : null;
  }
  
  /**
   * Limpia tareas completadas o fallidas
   */
  public cleanupTasks(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    const initialCount = this.tasks.length;
    this.tasks = this.tasks.filter(task => {
      // Mantener todas las tareas pendientes o en procesamiento
      if (task.status === 'pending' || task.status === 'processing') {
        return true;
      }
      
      // Eliminar tareas completadas o fallidas más antiguas que el límite
      return task.lastAttempt && task.lastAttempt > cutoffTime;
    });
    
    const removedCount = initialCount - this.tasks.length;
    
    if (removedCount > 0) {
      logger.info(`Se eliminaron ${removedCount} tareas antiguas de la cola`);
    }
  }
}

// Exportar una instancia del servicio como singleton
export const queueService = new QueueService(); 