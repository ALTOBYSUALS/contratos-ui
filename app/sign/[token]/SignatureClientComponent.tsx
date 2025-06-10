// ---------- ARCHIVO: app/sign/[token]/SignatureClientComponent.tsx ----------

"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react'; // Añadido useEffect
import SignatureCanvas from 'react-signature-canvas'; // Para dibujar la firma
import { Document, Page, pdfjs } from 'react-pdf'; // Para MOSTRAR el PDF
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // Estilos necesarios
import 'react-pdf/dist/esm/Page/TextLayer.css';      // Estilos necesarios
import { toast } from "sonner"; // Para notificaciones
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone, Monitor } from 'lucide-react'; // Iconos
import type { SignatureClientProps } from '@/lib/types'; // Importar desde lib

// Configurar worker de pdf.js (necesario para react-pdf)
// Usando CDN para evitar problemas de módulos en Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Alternativa local (problemática en Next.js):
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url,
// ).toString();


export default function SignatureClientComponent({ token, signerName, contractPdfUrl }: SignatureClientProps) {
    // --- Estados ---
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1); // Página actual visible
    const [isLoading, setIsLoading] = useState(false); // Para guardar firma
    const [isPdfLoading, setIsPdfLoading] = useState(true); // Para carga del PDF
    const [pdfError, setPdfError] = useState<string | null>(null); // Errores al cargar PDF
    const [signatureIsEmpty, setSignatureIsEmpty] = useState(true); // Para saber si el pad está vacío
    const [isMobile, setIsMobile] = useState(false); // Detectar móvil

    // --- Referencias ---
    const signaturePadRef = useRef<SignatureCanvas>(null);
    const pdfWrapperRef = useRef<HTMLDivElement>(null); // Para ajustar ancho del PDF

    // --- Detectar dispositivo móvil ---
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };
        
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // --- Handlers para react-pdf ---
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
        console.log(`PDF Document loaded: ${numPages} pages.`);
        setNumPages(numPages);
        setCurrentPage(1); // Ir a la primera página al cargar
        setPdfError(null);
        setIsPdfLoading(false); // Terminar carga PDF
        
        // Mostrar mensaje de éxito
        toast.success("📄 Documento cargado correctamente", { 
            description: `${numPages} página${numPages > 1 ? 's' : ''} lista${numPages > 1 ? 's' : ''} para revisión` 
        });
    }, []);

    const onDocumentLoadError = useCallback((error: Error): void => {
        console.error("Error loading PDF:", error);
        setPdfError(`Error al cargar PDF: ${error.message}. Verifique la URL o contacte soporte.`);
        setNumPages(null);
        setIsPdfLoading(false); // Terminar carga PDF (con error)
        
        // Mostrar error
        toast.error("❌ Error cargando documento", { 
            description: "Por favor recarga la página o contacta soporte" 
        });
    }, []);

    // --- Handlers para Navegación PDF (Optimizado para móvil) ---
    const goToPrevPage = () => {
        const newPage = Math.max(currentPage - 1, 1);
        setCurrentPage(newPage);
        if (isMobile) {
            toast.info(`📄 Página ${newPage} de ${numPages}`);
        }
    };
    
    const goToNextPage = () => {
        const newPage = Math.min(currentPage + 1, numPages || 1);
        setCurrentPage(newPage);
        if (isMobile) {
            toast.info(`📄 Página ${newPage} de ${numPages}`);
        }
    };

    // --- Handlers para Firma (Optimizado para touch) ---
    const handleClearSignature = () => {
        signaturePadRef.current?.clear();
        setSignatureIsEmpty(true); // Marcar como vacío al borrar
        toast.info("🗑️ Firma borrada");
    };

    // Se llama cuando el usuario termina un trazo
    const handleSignatureEnd = () => {
        if (signaturePadRef.current) {
             // Verifica si está vacío después del trazo
             const isEmpty = signaturePadRef.current.isEmpty();
             setSignatureIsEmpty(isEmpty);
             
             // Feedback táctil en móvil
             if (!isEmpty && isMobile && 'vibrate' in navigator) {
                 navigator.vibrate(50); // Vibración suave
             }
        }
    };

    const handleSaveSignature = async () => {
        if (!signaturePadRef.current || signatureIsEmpty) {
             toast.warning("✍️ Firma requerida", { 
                 description: "Por favor, dibuja tu firma en el recuadro." 
             });
             return;
         }

        // Obtener Data URL (calidad por defecto es PNG)
        const signatureDataUrl = signaturePadRef.current.toDataURL();

        setIsLoading(true);
        toast.info("💾 Guardando firma...", { description: "No cierres esta ventana" });

        try {
            const response = await fetch(`/api/signature/${token}`, { // Usa token en URL
                method: 'PATCH', // O POST
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureDataUrl }), // Enviar solo la firma
            });

            const result = await response.json(); // Intenta parsear siempre

            if (!response.ok) {
                // Usa el error del backend si existe, si no, un mensaje genérico
                throw new Error(result.error || `Error del servidor (${response.status})`);
            }

            console.log("Signature saved successfully:", result);
            toast.success("🎉 ¡Firma Guardada Exitosamente!", { 
                description: `Gracias ${signerName}. ${result.message || 'Proceso completado.'}`,
                duration: 5000
            });
            
            // Vibración de éxito en móvil
            if (isMobile && 'vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]); // Patrón de éxito
            }

        } catch (error: unknown) { // Manejo de error seguro
            console.error("Error saving signature:", error);
            let errorMessage = "Error desconocido al guardar la firma.";
            if (error instanceof Error) { errorMessage = error.message; }
            else if (typeof error === 'string') { errorMessage = error; }
            toast.error("❌ Error al Guardar", { 
                description: errorMessage,
                duration: 6000
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-3 md:p-6 shadow-md bg-white space-y-4 md:space-y-6 max-w-4xl mx-auto">
            {/* Header con info del dispositivo */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                    Firmando como: <span className="font-semibold text-gray-900">{signerName}</span>
                </p>
                <div className="flex items-center text-xs text-gray-500">
                    {isMobile ? <Smartphone className="w-4 h-4 mr-1" /> : <Monitor className="w-4 h-4 mr-1" />}
                    {isMobile ? 'Móvil' : 'Escritorio'}
                </div>
            </div>

            {/* --- Visor de PDF optimizado --- */}
            <div>
                <h3 className="text-lg font-medium mb-2 text-gray-800">Documento a Firmar</h3>
                <div ref={pdfWrapperRef} className={`border rounded-md ${isMobile ? 'min-h-[400px]' : 'min-h-[500px] md:min-h-[600px]'} overflow-hidden bg-gray-50 flex flex-col items-center`}>
                    {isPdfLoading && (
                        <div className="p-10 text-center text-gray-500">
                            <Loader2 className="animate-spin mr-2 inline-block h-5 w-5"/>
                            Cargando documento...
                            {isMobile && <p className="text-xs mt-2">📱 Optimizado para móvil</p>}
                        </div>
                    )}
                    {pdfError && !isPdfLoading && (
                        <div className="p-6 md:p-10 text-center text-red-600 bg-red-50 rounded m-4">
                            <p><strong>Error al cargar el documento:</strong></p>
                            <p className="text-sm mt-1">{pdfError}</p>
                             <p className="text-xs mt-2">Intenta recargar la página o contacta soporte.</p>
                        </div>
                    )}
                    {!isPdfLoading && !pdfError && contractPdfUrl && (
                        <Document
                            file={contractPdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            loading="" // Ya manejamos el loading arriba
                            className={`flex flex-col items-center overflow-y-auto w-full ${isMobile ? 'h-[400px]' : 'h-[500px] md:h-[600px]'}`}
                        >
                            <Page
                                key={`page_${currentPage}`}
                                pageNumber={currentPage}
                                // Ajustar ancho dinámicamente - móvil más pequeño
                                width={pdfWrapperRef.current ? 
                                    pdfWrapperRef.current.getBoundingClientRect().width * (isMobile ? 0.95 : 0.98) 
                                    : undefined}
                                renderTextLayer={false} // Mejora rendimiento
                                renderAnnotationLayer={true} // Mantener por si hay links
                                className="mb-2 shadow-sm"
                            />
                        </Document>
                    )}
                </div>
                
                {/* Controles de Paginación optimizados para móvil */}
                {!isPdfLoading && !pdfError && numPages && numPages > 1 && (
                    <div className={`flex justify-center items-center gap-4 mt-2 text-sm ${isMobile ? 'gap-2' : ''}`}>
                        <Button 
                            variant="outline" 
                            size={isMobile ? "sm" : "sm"} 
                            onClick={goToPrevPage} 
                            disabled={currentPage <= 1}
                            className={isMobile ? "px-3 py-1 text-xs" : ""}
                        >
                            {isMobile ? "←" : "Anterior"}
                        </Button>
                        <span className={isMobile ? "text-xs font-medium" : ""}>
                            Página {currentPage} de {numPages}
                        </span>
                        <Button 
                            variant="outline" 
                            size={isMobile ? "sm" : "sm"} 
                            onClick={goToNextPage} 
                            disabled={currentPage >= numPages}
                            className={isMobile ? "px-3 py-1 text-xs" : ""}
                        >
                            {isMobile ? "→" : "Siguiente"}
                        </Button>
                    </div>
                )}
            </div>

             {/* Sección de Firma optimizada para touch */}
     <div>
         <label htmlFor="signature-pad-canvas" className="block text-lg font-medium mb-2 text-gray-800">
             Tu Firma {isMobile ? "(Usa tu dedo)" : "(Dibuja en el recuadro)"}
         </label>
         <div className="relative border-2 border-dashed border-gray-300 rounded-md w-full h-[120px] md:h-[200px] cursor-crosshair overflow-hidden bg-white">
             <SignatureCanvas
                 ref={signaturePadRef}
                 penColor='black'
                 canvasProps={{ 
                     id: 'signature-pad-canvas', 
                     className: `w-full h-full rounded-md bg-white ${isLoading ? 'opacity-50' : ''}`,
                     style: { touchAction: 'none' } // Mejor control touch
                 }}
                 onEnd={handleSignatureEnd}
                 dotSize={isMobile ? 3 : 2} // Puntos más grandes en móvil
                 minWidth={isMobile ? 2 : 1} // Líneas más gruesas en móvil
                 maxWidth={isMobile ? 4 : 3}
             />
             {signatureIsEmpty && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-gray-400 text-sm">
                         {isMobile ? "👆 Firma aquí con tu dedo" : "🖱️ Dibuja tu firma aquí"}
                     </p>
                 </div>
             )}
             {isLoading && (
                 <div className="absolute inset-0 bg-gray-300 bg-opacity-30 cursor-not-allowed z-10 flex items-center justify-center" title="Guardando...">
                     <Loader2 className="animate-spin h-6 w-6 text-gray-600" />
                 </div>
             )}
         </div>
         {!signatureIsEmpty && (
             <p className="text-xs text-green-600 mt-1 flex items-center">
                 ✅ Firma lista para enviar
             </p>
         )}
     </div>

            {/* --- Botones de Acción optimizados para móvil --- */}
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-col sm:flex-row gap-3'} pt-4 border-t border-gray-200`}>
                <Button
                    variant="outline"
                    onClick={handleClearSignature}
                    disabled={isLoading}
                    className={isMobile ? "w-full py-3" : ""}
                >
                    🗑️ Borrar Firma
                </Button>
                <Button
                    onClick={handleSaveSignature}
                    disabled={isLoading || signatureIsEmpty}
                    className={`${isMobile ? 'w-full py-3 text-base' : ''} bg-blue-600 hover:bg-blue-700`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            ✍️ Confirmar y Firmar Documento
                        </>
                    )}
                </Button>
            </div>
            
            {/* Footer informativo */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                🔒 Conexión segura • ⏱️ Enlace válido por 7 días • 📱 Optimizado para todos los dispositivos
            </div>
        </div>
    );
}