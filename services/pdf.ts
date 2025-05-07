import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { PDFGenerationError, withRetry } from '../lib/error-handling';
import { config } from '../lib/config';

// Cache del navegador para reutilizarlo entre invocaciones
let browserInstance: any = null;

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
async function getBrowser(): Promise<any> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  
  // Declare execPath at the top level of the function so it's accessible throughout
  let execPath: string | null = null;
  
  try {
    console.debug('Launching Puppeteer browser instance');
    
    // Log environment variables that might affect browser selection
    console.debug('Environment variables check:', {
      puppeteerProduct: process.env.PUPPETEER_PRODUCT || 'Not set',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      platform: process.platform
    });
    
    // Intenta obtener la ruta ejecutable
    try {
      execPath = await chromium.executablePath();
      console.debug(`Chromium executable path: ${execPath || 'null'}`);
    } catch (pathError) {
      console.error('Error getting chromium executable path:', pathError);
      execPath = null;
    }
    
    // Configuración específica para Vercel
    // En Vercel, usa una configuración más simple y robusta
    if (process.env.VERCEL || process.env.VERCEL_ENV) {
      console.log('Detected Vercel environment, using simplified configuration');
      
      // Configuración simplificada para Vercel
      const launchOptions = {
        args: [...chromium.args, '--no-sandbox'],
        executablePath: execPath,
        headless: true,
        ignoreHTTPSErrors: true
      };
      
      try {
        browserInstance = await puppeteer.launch(launchOptions);
        return browserInstance;
      } catch (vercelError) {
        console.error('Error launching browser in Vercel:', vercelError);
        throw new PDFGenerationError(`Vercel browser launch error: ${vercelError instanceof Error ? vercelError.message : String(vercelError)}`);
      }
    }
    
    // Determinar el executable path con fallbacks para otros entornos
    if (!execPath) {
      console.warn('Chromium path is null, trying fallbacks');
      
      // Fallbacks específicos para cada plataforma
      if (process.platform === 'darwin') { // macOS
        const macOSPaths = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
        ];
        
        for (const path of macOSPaths) {
          if (require('fs').existsSync(path)) {
            execPath = path;
            console.debug(`Found Chrome at macOS path: ${path}`);
            break;
          }
        }
      } else if (process.platform === 'win32') { // Windows
        execPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        if (!require('fs').existsSync(execPath)) {
          execPath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
        }
      } else { // Linux
        const possiblePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
        ];
        for (const path of possiblePaths) {
          if (require('fs').existsSync(path)) {
            execPath = path;
            break;
          }
        }
      }
    }
    
    if (!execPath) {
      throw new Error('Could not determine a valid path for the Chrome executable');
    }
    
    // Opciones de lanzamiento específicas según la plataforma
    const launchOptions: any = {
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'], 
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
    
    console.debug('Puppeteer launch options:', JSON.stringify(launchOptions, null, 2));
    
    // Lanzar el navegador con manejo de errores
    browserInstance = await puppeteer.launch(launchOptions);
    
    // Configurar limpieza automática
    if (config.nodeEnv === 'production') {
      setTimeout(() => {
        if (browserInstance) {
          console.debug('Closing idle browser instance after timeout');
          const tempInstance = browserInstance;
          browserInstance = null;
          tempInstance.close().catch((err: Error) => console.error('Error closing idle browser', err));
        }
      }, 5 * 60 * 1000);
    }
    
    return browserInstance;
  } catch (error) {
    console.error('Failed to launch Puppeteer browser', error);
    
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      env: process.env.NODE_ENV,
      platform: process.platform,
      puppeteerProduct: process.env.PUPPETEER_PRODUCT || 'Not set',
      chromiumPath: execPath || 'Not available'
    };
    
    console.error('Detailed error:', errorInfo);
    
    throw new PDFGenerationError(`Failed to launch browser: ${errorInfo.message}`);
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
      let browser: any = null;
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
          await page.close().catch((err: Error) => 
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