// app/api/templates/route.ts
import { Client } from "@notionhq/client";
import { NextResponse } from 'next/server';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const templatesDatabaseId = process.env.DATABASE_TEMPLATES_ID || '';

export async function GET() {
  if (!process.env.NOTION_API_KEY || !templatesDatabaseId) {
    console.error("API ERROR (/api/templates): Falta NOTION_API_KEY o DATABASE_TEMPLATES_ID en .env.local");
    return NextResponse.json({ error: 'Configuración de Notion incompleta en el servidor.' }, { status: 500 });
  }
  console.log(`[API /api/templates] Usando DB ID: ${templatesDatabaseId}`);

  try {
    console.log("[API /api/templates] Realizando query a Notion...");
    const response = await notion.databases.query({
      database_id: templatesDatabaseId,
      filter: {
        property: 'Estado',
        select: { equals: 'Activo' }
      }
    });
    console.log(`[API /api/templates] Notion devolvió ${response.results.length} resultados crudos.`);

    const templates = response.results.map((page: any) => {
      const properties = page.properties;
      try {
        const title = properties['Nombre del Contrato']?.title[0]?.plain_text ?? 'Sin Título';
        const category = properties['Tipo de Contrato']?.select?.name ?? 'General';
        const description = properties['Descripcion']?.rich_text[0]?.plain_text ?? 'Sin descripción';

        // --- CORRECCIÓN PARA LEER TODO EL CONTENIDO ---
        // Verifica si la propiedad 'Plantilla del Contrato' y 'rich_text' existen y son un array
        const richTextArray = properties['Plantilla del Contrato']?.rich_text;
        let content = '';
        if (Array.isArray(richTextArray)) {
          // Une el plain_text de cada bloque con un salto de línea
          content = richTextArray.map((block: any) => block.plain_text).join('\n');
        }
        // ------------------------------------------------

        return { id: page.id, title, category, description, content };
      } catch (mapError: any) {
        console.error(`[API /api/templates] Error al mapear la página ${page.id}:`, mapError.message);
        return null;
      }
    }).filter(template => template !== null);

    console.log(`[API /api/templates] Mapeados ${templates.length} templates válidos.`);
    return NextResponse.json(templates);

  } catch (error: any) {
    console.error("[API /api/templates] ¡Error GENERAL al consultar Notion o en el mapeo!:", error.code, error.message, error.body ? JSON.parse(error.body) : '');
    return NextResponse.json({ error: `Error interno del servidor al obtener plantillas: ${error.message}` }, { status: 500 });
  }
}