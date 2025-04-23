// ARCHIVO: app/api/clients/route.ts

import { NextResponse } from 'next/server';
// --- USA RUTA RELATIVA CORRECTA ---
import { listarClientes } from '@/services/notion';
// ---------------------------------

export async function GET() {
  console.log("[API /api/clients] Recibida petición GET");
  try {
    // Llama a la función centralizada para obtener los clientes
    const clients = await listarClientes();

    // Devuelve la respuesta JSON obtenida del servicio
    return NextResponse.json(clients);

  } catch (error: unknown) { // Usar unknown para el tipo de error
    // Manejo de errores general por si la función del servicio falla inesperadamente
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener clientes.';
    console.error("[API /api/clients] ¡Error Inesperado!:", error);
    return NextResponse.json({ error: `Error interno del servidor: ${errorMessage}` }, { status: 500 });
  }
}

// NOTA: Aquí también irían las funciones POST, PUT, DELETE si las necesitas
// export async function POST(request: Request) { /* ... */ }
// ...