import { NextRequest, NextResponse } from 'next/server';
import { notionService } from '@/services/notion-service';
import type { SignerInfo } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const contractId = params.id;
  
  console.log(`[API /api/contracts/${contractId}] Recibida petición GET para detalle de contrato`);
  
  if (!contractId) {
    return NextResponse.json(
      { error: "ID de contrato no proporcionado" },
      { status: 400 }
    );
  }

  try {
    // Obtener detalles del contrato desde Notion
    const contractDetails = await notionService.getContractDetails(contractId);
    
    if (!contractDetails) {
      return NextResponse.json(
        { error: "No se encontró el contrato solicitado" },
        { status: 404 }
      );
    }

    return NextResponse.json(contractDetails);
  } catch (error: unknown) {
    console.error(`[API /api/contracts/${contractId}] Error:`, error);
    
    let errorMessage = "Error desconocido al obtener el detalle del contrato.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return NextResponse.json(
      { error: `Error al obtener detalle del contrato: ${errorMessage}` },
      { status: 500 }
    );
  }
} 