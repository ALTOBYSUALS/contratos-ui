// /app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const dynamic = 'force-dynamic'; // Asegura que no se cachee

export async function POST(req: NextRequest) {
    console.log("API generate-pdf: Received request");
    try {
        const { htmlContent, title = 'documento' } = await req.json();

        if (!htmlContent || typeof htmlContent !== 'string') {
            console.error("API generate-pdf: Missing or invalid htmlContent");
            return NextResponse.json({ error: 'Falta el contenido HTML para generar el PDF.' }, { status: 400 });
        }
        console.log("API generate-pdf: HTML content received (length):", htmlContent.length);

        // Lanzar Puppeteer
        console.log("API generate-pdf: Launching browser...");
        // Opciones importantes para Vercel/entornos serverless:
        const browser = await puppeteer.launch({
           args: [
               '--no-sandbox', // Necesario en muchos entornos Linux/Docker/Serverless
               '--disable-setuid-sandbox',
               '--disable-dev-shm-usage', // Ayuda a evitar errores de memoria compartida
               '--single-process' // Puede ayudar en entornos con recursos limitados
           ],
           headless: true // Ejecutar sin interfaz gráfica
        });
        console.log("API generate-pdf: Browser launched.");

        const page = await browser.newPage();
        console.log("API generate-pdf: New page created.");

        // Establecer el contenido HTML en la página
        // Usamos 'waitUntil: 'networkidle0'' para esperar a que las fuentes/imágenes (si las hubiera) carguen
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        console.log("API generate-pdf: HTML content set on page.");

        // Generar el PDF
        console.log("API generate-pdf: Generating PDF...");
        const pdfBuffer = await page.pdf({
            format: 'A4', // Formato de página
            printBackground: true, // Incluir fondos CSS si los hubiera
            margin: { // Márgenes (puedes ajustarlos)
                top: '1in',
                right: '1in',
                bottom: '1in',
                left: '1in',
            },
        });
        console.log("API generate-pdf: PDF generated (buffer length):", pdfBuffer.length);

        // Cerrar el navegador
        await browser.close();
        console.log("API generate-pdf: Browser closed.");

        // Crear la respuesta con el buffer del PDF
        const safeTitle = title.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
        const filename = `${safeTitle}.pdf`;

        // Devolver el PDF como un blob para descargar
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`, // Indica al navegador que descargue el archivo
            },
        });

    } catch (error: unknown) { // <-- Cambiado a unknown
        console.error("API generate-pdf: Error generating PDF:", error); // Log completo

        let errorMessage = "Error desconocido al generar el PDF."; // Mensaje por defecto

        if (error instanceof Error) {
            errorMessage = error.message; // Seguro usar .message
            // Si Puppeteer da errores más específicos, podrías intentar extraerlos aquí
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Devuelve el mensaje de error seguro
        return NextResponse.json(
            // Cambiado para usar solo un mensaje claro
            { error: `Error al generar el PDF: ${errorMessage}` },
            { status: 500 }
        );
    }
}