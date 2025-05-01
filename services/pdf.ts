import puppeteer, { Browser } from 'puppeteer';
import { PDFGenerationError, withRetry } from '../lib/error-handling';
import { config } from '../lib/config';

// Cache del navegador para reutilizarlo entre invocaciones
let browserInstance: Browser | null = null;

/**
 * Opciones para la generación de PDF
 */
export interface PdfGenerationOptions {
  title: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  scale?: number;
  timeout?: number;
}

/**
 * Obtiene una instancia de navegador Puppeteer
 * Reutiliza la instancia si es posible, o crea una nueva
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  
  try {
    console.debug('Launching Puppeteer browser instance');
    
    // Optimizaciones para serverless
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--font-render-hinting=none', // Ayuda con problemas de fuentes
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
      ],
      headless: true
    };
    
    const browser = await puppeteer.launch(launchOptions);
    
    // En entornos serverless, es posible que necesitemos limpiar el recurso automáticamente
    if (config.nodeEnv === 'production') {
      // Si estamos en producción, configuramos un cierre después de 5 minutos de inactividad
      setTimeout(() => {
        if (browserInstance === browser) {
          console.debug('Closing idle browser instance after timeout');
          browserInstance = null;
          browser.close().catch(err => 
            console.error('Error closing idle browser', err)
          );
        }
      }, 5 * 60 * 1000);
    }
    
    browserInstance = browser;
    return browser;
  } catch (error) {
    console.error('Failed to launch Puppeteer browser', error);
    throw new PDFGenerationError(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Genera un PDF a partir de contenido HTML
 * Incluye reintentos automáticos para mayor confiabilidad
 */
export async function generatePdf(
  htmlContent: string, 
  options: PdfGenerationOptions
): Promise<Buffer> {
  if (!htmlContent) {
    throw new PDFGenerationError('No HTML content provided for PDF generation');
  }
  
  // Normalizar opciones  
  const pdfOptions = normalizePdfOptions(options);
  
  // Utilizar la función withRetry para manejar reintentos
  return withRetry(
    async () => {
      let browser: Browser | null = null;
      let page = null;
      
      try {
        console.info('Starting PDF generation', { title: options.title });
        browser = await getBrowser();
        
        // Crear una nueva página
        page = await browser.newPage();
        
        // Configurar timeout de navegación
        page.setDefaultNavigationTimeout(pdfOptions.timeout);
        
        // Configurar la página para optimizar la generación de PDF
        await page.setViewport({ width: 1200, height: 1600 });
        
        // Cargar el contenido HTML
        await page.setContent(htmlContent, { 
          waitUntil: ['load', 'networkidle0'],
          timeout: pdfOptions.timeout 
        });
        
        // Agregar estilos adicionales para mejorar la apariencia del PDF
        await page.addStyleTag({
          content: `
            @page { size: ${pdfOptions.format} ${pdfOptions.landscape ? 'landscape' : 'portrait'}; }
            body { font-family: 'Arial', 'Helvetica', sans-serif; line-height: 1.6; color: #333; }
            h1, h2, h3, h4, h5, h6 { font-weight: 600; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #f2f2f2; }
          `
        });
        
        // Generar el PDF
        const pdfBuffer = await page.pdf({
          format: pdfOptions.format,
          landscape: pdfOptions.landscape,
          printBackground: pdfOptions.printBackground,
          margin: {
            top: pdfOptions.marginTop,
            right: pdfOptions.marginRight,
            bottom: pdfOptions.marginBottom,
            left: pdfOptions.marginLeft
          },
          displayHeaderFooter: pdfOptions.displayHeaderFooter,
          headerTemplate: pdfOptions.headerTemplate,
          footerTemplate: pdfOptions.footerTemplate,
          scale: pdfOptions.scale
        });
        
        console.info('PDF generation successful', { 
          title: options.title, 
          size: `${pdfBuffer.length} bytes` 
        });
        
        return Buffer.from(pdfBuffer);
      } catch (error) {
        console.error('Error generating PDF', error, { title: options.title });
        
        // Verificar si el error es un problema conocido y dar un mensaje más claro
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('Failed to parse parameter value')) {
          throw new PDFGenerationError('Error en formato de márgenes o tamaño. Revise las unidades (px, pt, mm).');
        }
        
        throw new PDFGenerationError(`Error generando PDF: ${errorMessage}`);
      } finally {
        // Cerrar la página si aún está abierta
        if (page) {
          await page.close().catch(err => 
            console.error('Error cerrando página Puppeteer', err)
          );
        }
      }
    },
    {
      retries: 2,
      delay: 500,
      onRetry: (err, attempt) => {
        console.warn(`Reintentando generación de PDF (${attempt}/2) después de error: ${err.message || err}`);
      }
    }
  );
}

/**
 * Normaliza las opciones para la generación de PDF
 */
function normalizePdfOptions(options: PdfGenerationOptions): Required<PdfGenerationOptions> {
  return {
    title: options.title || 'document',
    format: options.format || 'A4',
    landscape: options.landscape || false,
    marginTop: options.marginTop || '1cm',
    marginRight: options.marginRight || '1cm',
    marginBottom: options.marginBottom || '1cm',
    marginLeft: options.marginLeft || '1cm',
    printBackground: options.printBackground !== undefined ? options.printBackground : true,
    displayHeaderFooter: options.displayHeaderFooter || false,
    headerTemplate: options.headerTemplate || '',
    footerTemplate: options.footerTemplate || '',
    scale: options.scale || 1,
    timeout: options.timeout || 30000
  };
}

/**
 * Cierra el navegador si está abierto
 * Útil para limpiar recursos manualmente
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.isConnected()) {
    try {
      await browserInstance.close();
      console.debug('Puppeteer browser instance closed successfully');
    } catch (error) {
      console.error('Error closing Puppeteer browser', error);
    } finally {
      browserInstance = null;
    }
  }
} 