// /app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger, handleApiError, PDFGenerationError } from '@/lib/error-handling';
import { generatePdf } from '@/services/pdf';

export const dynamic = 'force-dynamic'; // Asegura que no se cachee

// Implementación directa sin usar el middleware de validación
export async function POST(req: NextRequest) {
  try {
    // Extraer y validar datos manualmente
    const body = await req.json().catch(() => {
      throw new PDFGenerationError('El cuerpo de la solicitud debe ser un JSON válido', 400);
    });
    
    // Validar contenido HTML
    if (!body.htmlContent || typeof body.htmlContent !== 'string') {
      throw new PDFGenerationError('Se requiere contenido HTML válido', 400);
    }
    
    // Normalizar parámetros
    const options = {
      title: body.title || 'documento',
      format: body.format || 'A4',
      landscape: body.landscape || false,
      marginTop: body.marginTop || '1cm',
      marginRight: body.marginRight || '1cm',
      marginBottom: body.marginBottom || '1cm',
      marginLeft: body.marginLeft || '1cm',
      printBackground: body.printBackground !== undefined ? body.printBackground : true,
      displayHeaderFooter: body.displayHeaderFooter || false,
      headerTemplate: body.headerTemplate || '',
      footerTemplate: body.footerTemplate || '',
      scale: body.scale || 1
    };
    
    logger.info('Generando PDF', { title: options.title, format: options.format });
    
    // Generar PDF utilizando el servicio mejorado
    const pdfBuffer = await generatePdf(body.htmlContent, options);

    // Crear respuesta con el buffer del PDF
    const safeTitle = options.title.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
    const filename = `${safeTitle}.pdf`;

    // Devolver el PDF como un blob para descargar
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}