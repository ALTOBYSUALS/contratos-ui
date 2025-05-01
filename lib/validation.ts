import { NextRequest, NextResponse } from 'next/server';
import { logger, ValidationError } from './error-handling';
import { z } from 'zod';

/**
 * Función para validar la solicitud HTTP entrante según un esquema Zod
 * @param req Solicitud Next.js
 * @param schema Esquema de validación Zod
 * @returns Datos validados y transformados
 * @throws ValidationError si la validación falla
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
  options: {
    source?: 'json' | 'formData' | 'searchParams';
    strictValidation?: boolean;
  } = {}
): Promise<T> {
  try {
    const { source = 'json', strictValidation = true } = options;
    
    // Extraer los datos según la fuente especificada
    let data: unknown;
    
    switch (source) {
      case 'json':
        data = await req.json().catch(() => {
          throw new ValidationError('El cuerpo de la solicitud debe ser un JSON válido');
        });
        break;
      case 'formData':
        data = Object.fromEntries(await req.formData());
        break;
      case 'searchParams':
        data = Object.fromEntries(req.nextUrl.searchParams);
        break;
    }
    
    // Validar los datos contra el esquema
    const result = schema.safeParse(data);
    
    if (!result.success) {
      // Formatear los errores de validación
      const formattedErrors = result.error.errors.map((err: z.ZodIssue) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      logger.warn('Validation error', { errors: formattedErrors });
      
      throw new ValidationError(
        strictValidation
          ? `Datos de entrada inválidos: ${formattedErrors.map((e: { path: string; message: string }) => `${e.path}: ${e.message}`).join(', ')}`
          : 'Datos de entrada inválidos'
      );
    }
    
    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // Cualquier otro error en el proceso de validación
    logger.error('Unexpected validation error', error);
    throw new ValidationError(`Error de validación: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Middleware para validar solicitudes con un esquema Zod
 * @param schema Esquema de validación Zod
 * @param handler Manejador de la ruta de API
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T) => Promise<NextResponse>,
  options: {
    source?: 'json' | 'formData' | 'searchParams';
    strictValidation?: boolean;
  } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const validatedData = await validateRequest<T>(req, schema, options);
      return await handler(req, validatedData);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      
      // Otros errores no relacionados con la validación
      logger.error('API error in validation middleware', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  };
}

/**
 * Esquemas de validación comunes reutilizables
 */
export const commonSchemas = {
  // Para validación de IDs
  id: z.string().min(1, 'ID requerido').max(100),
  
  // Para validación de email
  email: z.string().email('Email inválido'),
  
  // Para validación de nombre
  name: z.string().min(1, 'Nombre requerido').max(100),
  
  // Para validación de URLs
  url: z.string().url('URL inválida'),
  
  // Para validación de contenido HTML
  htmlContent: z.string().min(1, 'Contenido HTML requerido'),
  
  // Para validación de fechas
  date: z.string().refine(
    (value: string) => !isNaN(Date.parse(value)),
    { message: 'Formato de fecha inválido (ISO 8601 esperado)' }
  ),
  
  // Para validación de coordenadas de firma
  signatureCoordinates: z.object({
    pageNumber: z.number().int().min(1, 'Número de página inválido'),
    posX: z.number().min(0, 'Posición X inválida'),
    posY: z.number().min(0, 'Posición Y inválida'),
    signatureWidth: z.number().min(10, 'Ancho de firma inválido'),
    signatureHeight: z.number().min(10, 'Alto de firma inválido'),
  }),
  
  // Para validación de tokens JWT
  token: z.string().min(10, 'Token inválido')
}; 