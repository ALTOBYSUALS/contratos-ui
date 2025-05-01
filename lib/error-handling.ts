import { NextResponse } from 'next/server';

/**
 * Tipos de errores personalizados para la aplicación
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  
  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotionError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(`Notion API Error: ${message}`, statusCode);
  }
}

export class PDFGenerationError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(`PDF Generation Error: ${message}`, statusCode);
  }
}

export class EmailError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(`Email Service Error: ${message}`, statusCode);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(`Validation Error: ${message}`, 400);
  }
}

export class StorageError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(`Storage Error: ${message}`, statusCode);
  }
}

/**
 * Función para reintentar operaciones que pueden fallar
 * @param operation Función a reintentar
 * @param retries Número máximo de reintentos
 * @param delay Retraso inicial entre reintentos (ms)
 * @param backoffFactor Factor para aumentar el retraso exponencialmente
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    retries = 3,
    delay = 300,
    backoffFactor = 2,
    retryableErrors = [429, 500, 502, 503, 504],
    onRetry = (error: any, attempt: number) => console.warn(`Retrying operation (${attempt}/${retries}) after error:`, error?.message || error)
  }: {
    retries?: number;
    delay?: number;
    backoffFactor?: number;
    retryableErrors?: number[];
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Si es el último intento, no reintentamos
      if (attempt > retries) {
        throw error;
      }
      
      // Determinar si deberíamos reintentar basado en el código de error
      const statusCode = error?.statusCode || error?.status || error?.code;
      const shouldRetry = 
        error?.isOperational || 
        !statusCode || 
        retryableErrors.includes(statusCode) ||
        error.toString().includes('ECONNRESET') ||
        error.toString().includes('ETIMEDOUT');
      
      if (!shouldRetry) {
        throw error;
      }
      
      // Notificar el reintento
      onRetry(error, attempt);
      
      // Esperar antes de reintentar con backoff exponencial
      const waitTime = delay * Math.pow(backoffFactor, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Este código no debería alcanzarse, pero por si acaso
  throw lastError;
}

/**
 * Maneja errores de API de forma estandarizada
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Determinar el tipo de error y crear una respuesta adecuada
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  
  // Otros tipos de errores
  if (error instanceof Error) {
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
  
  // Error desconocido
  return NextResponse.json(
    { error: 'Un error inesperado ha ocurrido' },
    { status: 500 }
  );
}

// Exportar funciones simples de logging para usar en caso necesario
export function logInfo(message: string, metadata?: Record<string, any>): void {
  console.log(JSON.stringify({
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...metadata
  }));
}

export function logWarn(message: string, metadata?: Record<string, any>): void {
  console.warn(JSON.stringify({
    level: 'warn',
    timestamp: new Date().toISOString(),
    message,
    ...metadata
  }));
}

export function logError(message: string, error?: any, metadata?: Record<string, any>): void {
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    message,
    errorMessage: error?.message,
    stack: error?.stack,
    ...metadata
  }));
}

export function logDebug(message: string, metadata?: Record<string, any>): void {
  if (process.env.DEBUG_MODE === 'true') {
    console.debug(JSON.stringify({
      level: 'debug',
      timestamp: new Date().toISOString(),
      message,
      ...metadata
    }));
  }
} 