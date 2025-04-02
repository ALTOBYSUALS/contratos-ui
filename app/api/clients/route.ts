// ARCHIVO: app/api/clients/route.ts

import { Client } from "@notionhq/client";
import { NextResponse } from 'next/server';

// Inicializa el cliente de Notion
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Obtiene el ID de la base de datos de clientes desde las variables de entorno
const clientsDatabaseId = process.env.DATABASE_CLIENTES_ID || '';

// Handler para peticiones GET a /api/clients
export async function GET() {
  // --- 1. Verificar Variables de Entorno ---
  if (!process.env.NOTION_API_KEY || !clientsDatabaseId) {
    console.error("API ERROR (/api/clients): Falta NOTION_API_KEY o DATABASE_CLIENTES_ID en .env.local");
    return NextResponse.json({ error: 'Configuración de Notion incompleta en el servidor.' }, { status: 500 });
  }
  console.log(`[API /api/clients] Usando DB ID: ${clientsDatabaseId}`);

  try {
    // --- 2. Consultar la Base de Datos de Notion ---
    console.log("[API /api/clients] Realizando query a Notion...");
    const response = await notion.databases.query({
      database_id: clientsDatabaseId,
      // Aquí podrías añadir filtros si, por ejemplo, solo quieres clientes "Activos"
      // filter: { property: 'Client Status', select: { equals: 'Active' } }
    });
    console.log(`[API /api/clients] Notion devolvió ${response.results.length} clientes crudos.`);

    // --- 3. Mapear los Resultados al Formato Deseado ---
    const clients = response.results.map((page: any) => {
      const properties = page.properties;
      try {
        // Extraer datos - AJUSTA LOS NOMBRES Y TIPOS EXACTOS DE TU BASE DE CLIENTES
        // Asumiendo 'First name' es Title, 'Last name' es Rich Text, 'Email' es Email, 'Role' es Select
        const firstName = properties['First name']?.title[0]?.plain_text ?? '';
        const lastName = properties['Last name']?.rich_text[0]?.plain_text ?? ''; // Asegúrate que exista 'Last name' si lo usas
        const email = properties['Email']?.email ?? 'no-email@example.com'; // Asegúrate que se llame 'Email'
        const role = properties['Role']?.select?.name ?? 'Client';       // Asegúrate que se llame 'Role' y sea Select

        // Devolver el objeto con la estructura esperada por el frontend
        return {
          id: page.id,
          name: `${firstName} ${lastName}`.trim(), // Combina nombre y apellido
          email,
          role
        };
      } catch (mapError: any) {
        console.error(`[API /api/clients] Error al mapear cliente ${page.id}:`, mapError.message);
        return null; // Marcar esta página como inválida
      }
    }).filter(client => client !== null); // Filtrar cualquier cliente que haya fallado

    console.log(`[API /api/clients] Mapeados ${clients.length} clientes válidos.`);

    // --- 4. Devolver la Respuesta JSON ---
    return NextResponse.json(clients);

  } catch (error: any) {
    // --- 5. Manejar Errores Generales ---
    console.error("[API /api/clients] ¡Error GENERAL al consultar Notion o en el mapeo!:", error.code, error.message, error.body ? JSON.parse(error.body) : '');
    return NextResponse.json({ error: `Error interno del servidor al obtener clientes: ${error.message}` }, { status: 500 });
  }
}