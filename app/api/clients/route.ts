// ARCHIVO: app/api/clients/route.ts

import { NextResponse } from 'next/server';
// --- USA RUTA RELATIVA CORRECTA ---
import { unifiedNotion } from '@/services/notion-unified';
// ---------------------------------

export async function GET() {
  console.log("[API /api/clients] Recibida petición GET");
  try {
    // Llama a la función centralizada para obtener los clientes
    const clients = await unifiedNotion.getClients();

    // 🔍 DEBUG: Ver qué datos estamos devolviendo
    console.log("[API /api/clients] Datos que se van a devolver:", {
      count: clients.length,
      firstClient: clients[0] ? {
        id: clients[0].id,
        FullName: clients[0].FullName,
        firstName: clients[0].firstName,
        lastName: clients[0].lastName,
        email: clients[0].email,
        role: clients[0].role
      } : null
    });

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