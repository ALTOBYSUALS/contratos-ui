import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PdfOptions {
  title?: string;
  fontSize?: number;
  margin?: number;
  lineHeight?: number;
}

/**
 * Limpia texto removiendo emojis y caracteres que no puede manejar pdf-lib
 */
function cleanTextForPdf(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1F9FF}]/gu, '') // Remover emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Remover símbolos misceláneos
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Remover dingbats
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Más emojis
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticonos
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte y mapas
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Símbolos alquímicos
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Símbolos geométricos extendidos
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Flechas suplementarias-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Símbolos suplementarios y pictográficos
    .trim();
}

/**
 * Convierte HTML simplificado a texto plano para PDF
 */
function htmlToText(html: string): string {
  if (!html) return '';
  
  let text = html
    // Convertir elementos de bloque a saltos de línea
    .replace(/<\/?(h[1-6]|p|div|br|hr)[^>]*>/gi, '\n')
    .replace(/<\/?(table|thead|tbody|tr)[^>]*>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<\/td>/gi, '')
    .replace(/<th[^>]*>/gi, ' ')
    .replace(/<\/th>/gi, ' ')
    // Remover tags de formato pero mantener el contenido
    .replace(/<\/?(strong|b)[^>]*>/gi, '')
    .replace(/<\/?(em|i)[^>]*>/gi, '')
    .replace(/<\/?(u)[^>]*>/gi, '')
    .replace(/<em[^>]*>|<\/em>/gi, '')
    .replace(/<i[^>]*>|<\/i>/gi, '')
    .replace(/<ul[^>]*>|<\/ul>/gi, '')
    .replace(/<ol[^>]*>|<\/ol>/gi, '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '') // Remover cualquier tag restante
    // Limpiar espacios y entidades HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalizar espacios en blanco
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Limpiar emojis y caracteres especiales
  return cleanTextForPdf(text);
}

/**
 * Crea un PDF profesional con contenido de contrato
 */
export async function createPdfWithContent(
  htmlContent: string, 
  title: string = 'Contrato',
  options: PdfOptions = {}
): Promise<Buffer> {
  try {
    console.log(`[PDF Generator] Creando PDF para: ${title}`);
    console.log(`[PDF Generator] Contenido HTML: ${htmlContent.length} caracteres`);

    // Configuración
    const {
      fontSize = 12,
      margin = 50,
      lineHeight = 18
    } = options;

    // Crear documento PDF
    const pdfDoc = await PDFDocument.create();
    
    // Configurar fuentes
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Convertir HTML a texto plano
    const textContent = htmlToText(htmlContent);
    console.log(`[PDF Generator] Texto extraído: ${textContent.length} caracteres`);
    
    if (!textContent.trim()) {
      console.warn('[PDF Generator] Contenido vacío, creando PDF con mensaje de error');
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      page.drawText('Error: Contenido del contrato no disponible', {
        x: margin,
        y: 800,
        size: fontSize,
        font: font,
        color: rgb(0.8, 0, 0)
      });
      return Buffer.from(await pdfDoc.save());
    }

    // Configurar página
    const pageWidth = 595.28; // A4 width
    const pageHeight = 841.89; // A4 height
    const contentWidth = pageWidth - (margin * 2);
    
    // Dividir texto en líneas que caben en la página
    const lines: string[] = [];
    const paragraphs = textContent.split('\n');
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push(''); // Línea vacía para espaciado
        continue;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth <= contentWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Palabra muy larga, la partimos
            lines.push(word);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
    }

    console.log(`[PDF Generator] Texto dividido en ${lines.length} líneas`);

    // Crear páginas y agregar contenido
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    let pageNumber = 1;

    // Título en la primera página
    if (title && title.trim()) {
      // Limpiar emojis y caracteres especiales del título para PDF
      const cleanTitle = cleanTextForPdf(title).toUpperCase();
      
      if (cleanTitle) {
        currentPage.drawText(cleanTitle, {
          x: margin,
          y: yPosition,
          size: fontSize + 4,
          font: boldFont,
          color: rgb(0, 0, 0)
        });
      }
      yPosition -= lineHeight * 2;
    }

    // Agregar líneas de contenido
    for (const line of lines) {
      // Verificar si necesitamos nueva página
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
        pageNumber++;
        console.log(`[PDF Generator] Nueva página creada: ${pageNumber}`);
      }

      // Dibujar línea (si no está vacía)
      if (line.trim()) {
        // Detectar títulos/encabezados (líneas cortas y en mayúsculas)
        const isTitle = line.length < 60 && line === line.toUpperCase() && !line.includes('•');
        
        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: isTitle ? fontSize + 1 : fontSize,
          font: isTitle ? boldFont : font,
          color: rgb(0, 0, 0)
        });
      }
      
      yPosition -= lineHeight;
    }

    // Metadatos del PDF
    pdfDoc.setTitle(cleanTextForPdf(title));
    pdfDoc.setCreator('Sistema de Contratos');
    pdfDoc.setSubject('Contrato Profesional');
    pdfDoc.setCreationDate(new Date());

    const pdfBytes = await pdfDoc.save();
    console.log(`[PDF Generator] PDF creado exitosamente: ${pageNumber} páginas, ${(pdfBytes.length / 1024).toFixed(1)} KB`);
    
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('[PDF Generator] Error creando PDF:', error);
    
    // PDF de fallback en caso de error
    const fallbackDoc = await PDFDocument.create();
    const page = fallbackDoc.addPage([595.28, 841.89]);
    const font = await fallbackDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText('Error generando contrato', {
      x: 50,
      y: 800,
      size: 16,
      font: font,
      color: rgb(0.8, 0, 0)
    });
    
    page.drawText(`Titulo: ${cleanTextForPdf(title)}`, {
      x: 50,
      y: 760,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });
    
    page.drawText('Por favor contacte soporte tecnico.', {
      x: 50,
      y: 720,
      size: 12,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    const fallbackBytes = await fallbackDoc.save();
    return Buffer.from(fallbackBytes);
  }
} 