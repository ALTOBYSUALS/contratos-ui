// /app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, PDFGenerationError } from '@/lib/error-handling';
import { generatePdf } from '@/services/pdf';

export const dynamic = 'force-dynamic'; // Asegura que no se cachee
// Increase memory and execution time for PDF generation
export const runtime = 'nodejs'; // Specify Node.js runtime

// Log environment variables that might affect PDF generation
console.log('PDF API environment check:', {
  puppeteerProduct: process.env.PUPPETEER_PRODUCT || 'Not set',
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'Set' : 'Not set',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
  region: process.env.VERCEL_REGION
});

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
    
    console.info('Generando PDF', { title: options.title, format: options.format });
    
    // Add information about the environment
    console.info('Environment:', {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION
    });
    
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
    console.error('API Error:', error);
    return handleApiError(error);
  }
}