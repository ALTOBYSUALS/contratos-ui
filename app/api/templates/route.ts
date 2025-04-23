// ARCHIVO: app/api/templates/route.ts

import { NextResponse } from 'next/server';
// --- USA RUTA RELATIVA CORRECTA ---
import { obtenerPlantillas } from '@/services/notion';
// ---------------------------------

// Handler para peticiones GET a /api/templates
export async function GET() {
  console.log("[API /api/templates] Recibida petición GET");
  try {
    // Llama a la función centralizada para obtener las plantillas
    const templates = await obtenerPlantillas();

    // Devuelve la respuesta JSON obtenida del servicio
    return NextResponse.json(templates);

  } catch (error: unknown) { // Usar unknown para el tipo de error
    // Manejo de errores general por si la función del servicio falla inesperadamente
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener plantillas.';
    console.error("[API /api/templates] ¡Error Inesperado!:", error);
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}