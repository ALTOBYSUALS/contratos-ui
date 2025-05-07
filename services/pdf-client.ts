// services/pdf-client.ts
// Funciones para manejar PDFs desde el cliente (frontend)

import { toast } from "sonner";

/**
 * Genera un PDF a partir del contenido HTML y lo descarga
 * 
 * @param htmlContent El contenido HTML para convertir a PDF
 * @param filename Nombre del archivo PDF a descargar
 */
export const generatePdf = async (htmlContent: string, filename: string): Promise<void> => {
  try {
    // Preprocesar el nombre del archivo
    const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_');
    const finalFilename = `${sanitizedFilename}_${Date.now()}.pdf`;
    
    // Solicitud al endpoint del servidor para generar el PDF
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ htmlContent }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    // Obtener el blob del PDF
    const pdfBlob = await response.blob();
    
    // Crear una URL para el blob
    const url = window.URL.createObjectURL(pdfBlob);
    
    // Crear un elemento <a> para descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    
    // Añadir al DOM y hacer clic para descargar
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("PDF Generado", { description: `El archivo ${finalFilename} se ha descargado correctamente.` });
  } catch (error) {
    console.error('Error generando PDF:', error);
    toast.error("Error generando PDF", { description: error instanceof Error ? error.message : "Ocurrió un error inesperado" });
    throw error;
  }
};

/**
 * Descarga un PDF desde una URL
 * 
 * @param pdfUrl URL del PDF a descargar
 * @param filename Nombre con el que se guardará el archivo
 */
export const downloadPdfFromUrl = async (pdfUrl: string, filename: string): Promise<void> => {
  try {
    if (!pdfUrl) {
      throw new Error('URL de PDF inválida');
    }
    
    // Preprocesar el nombre del archivo
    const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '_');
    const finalFilename = `${sanitizedFilename}_${Date.now()}.pdf`;
    
    // Fetch del PDF
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      throw new Error(`Error obteniendo el PDF: ${response.status}`);
    }
    
    const pdfBlob = await response.blob();
    
    // Crear una URL para el blob
    const url = window.URL.createObjectURL(pdfBlob);
    
    // Crear un elemento <a> para descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    
    // Añadir al DOM y hacer clic para descargar
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("PDF Descargado", { description: `El archivo ${finalFilename} se ha descargado correctamente.` });
  } catch (error) {
    console.error('Error descargando PDF:', error);
    toast.error("Error descargando PDF", { description: error instanceof Error ? error.message : "Ocurrió un error inesperado" });
    throw error;
  }
}; 