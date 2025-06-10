import { NextRequest, NextResponse } from 'next/server';
import { notionService } from '@/services/notion-service';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validar que el ID existe
    if (!id) {
      return NextResponse.json(
        { error: 'ID del contrato es requerido' },
        { status: 400 }
      );
    }

    console.log(`[Contract Details API] Obteniendo detalles para contrato: ${id}`);
    
    // Obtener detalles del contrato desde Notion
    const contractDetails = await notionService.getContractDetails(id);
    
    if (!contractDetails) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    console.log(`[Contract Details API] Detalles obtenidos exitosamente para contrato ${id}:`, {
      title: contractDetails.contract.title,
      signersCount: contractDetails.signers.length,
      signedCount: contractDetails.signers.filter(s => s.signedAt).length
    });

    // Transformar los datos para el frontend
    const response = {
      contract: {
        id: contractDetails.contract.id,
        title: contractDetails.contract.title,
        pdfUrl_draft: contractDetails.contract.pdfUrl_draft,
        pdfUrl_signed: contractDetails.contract.pdfUrl_signed,
        status: contractDetails.contract.status
      },
      signers: contractDetails.signers.map(signer => ({
        id: signer.id,
        name: signer.name,
        email: signer.email,
        signedAt: signer.signedAt,
        pageNumber: signer.pageNumber,
        posX: signer.posX,
        posY: signer.posY,
        signatureWidth: signer.signatureWidth,
        signatureHeight: signer.signatureHeight
      })),
      generalData: contractDetails.generalData,
      stats: {
        total: contractDetails.signers.length,
        signed: contractDetails.signers.filter(s => s.signedAt).length,
        pending: contractDetails.signers.filter(s => !s.signedAt).length
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Contract Details API] Error:', error);
    
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Identificar errores específicos de Notion
      if (error.message.includes('object_not_found')) {
        errorMessage = 'Contrato no encontrado en la base de datos';
        statusCode = 404;
      } else if (error.message.includes('unauthorized')) {
        errorMessage = 'No autorizado para acceder a este contrato';
        statusCode = 403;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: statusCode }
    );
  }
} 