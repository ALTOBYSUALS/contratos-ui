import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { config } from '@/lib/config';

export async function GET() {
  try {
    const notion = new Client({ auth: config.notionToken });
    
    const databases = {
      templates: config.notionDbTemplates,
      clients: config.notionDbClients,
      contracts: config.notionDbContracts,
      signers: config.notionDbSigners
    };

    const schemas: any = {};

    for (const [name, dbId] of Object.entries(databases)) {
      if (dbId) {
        try {
          const dbInfo = await notion.databases.retrieve({ database_id: dbId });
          schemas[name] = {
            id: dbId,
            title: (dbInfo as any).title?.[0]?.plain_text || 'Sin título',
            properties: Object.keys((dbInfo as any).properties || {})
          };
        } catch (error) {
          schemas[name] = { error: `Error obteniendo ${name}: ${error}` };
        }
      } else {
        schemas[name] = { error: 'ID de base de datos no configurado' };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Esquemas de bases de datos de Notion',
      schemas,
      fieldMappingsCurrently: {
        TEMPLATES: {
          TITLE: "Name",
          CATEGORY: "Category", 
          DESCRIPTION: "Description",
          CONTENT: "Content",
          STATUS: "Status"
        },
        CLIENTS: {
          FULL_NAME: "Full Name",
          EMAIL: "Email",
          ROLE: "Role",
          PHONE: "Phone",
          PASSPORT: "Passport", 
          ADDRESS: "Address",
          COUNTRY: "Country"
        },
        CONTRACTS: {
          TITLE: "Title",
          STATUS: "Status",
          PDF_DRAFT: "PDF Draft",
          PDF_SIGNED: "PDF Signed", 
          SIGNED_AT: "Signed Date",
          SHA256: "SHA256",
          SIGNERS: "Signers"
        },
        SIGNERS: {
          NAME: "Name",
          EMAIL: "Email", 
          CONTRACT: "Contract",
          SIGNED_AT: "Signed At",
          PAGE_NUMBER: "Page",
          POS_X: "X Position",
          POS_Y: "Y Position", 
          SIGNATURE_WIDTH: "Width",
          SIGNATURE_HEIGHT: "Height"
        }
      }
    });

  } catch (error) {
    console.error('[Debug Schema] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 