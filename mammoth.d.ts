// mammoth.d.ts

declare module 'mammoth' {

    // =============================================
    // PEGA AQUÍ TODO EL CONTENIDO ACTUAL DE TU
    // ARCHIVO mammoth.d.ts. Asegúrate de que las
    // funciones y tipos que quieres usar estén
    // marcados con 'export'.
    // =============================================
  
    // Ejemplo mínimo si no tenías nada (¡NECESITAS AGREGAR MÁS!):
    export interface MammothResult {
      value: string; // HTML
      messages: any[];
    }
    export function convertToHtml(input: any, options?: any): Promise<MammothResult>;
    export function extractRawText(input: any): Promise<{ value: string; messages: any[] }>;
  
    // Probablemente necesites añadir MammothOptions y tipos más específicos
    // basándote en la documentación de Mammoth.js o cómo lo usas.
  
  } // <--- ¡Asegúrate que la llave de cierre esté al final!