// ---------- ARCHIVO: app/sign/[token]/SignatureClientComponent.tsx ----------

"use client";

import React, { useRef, useState, useCallback } from 'react'; // Añadido useEffect y useCallback
import SignatureCanvas from 'react-signature-canvas'; // Para dibujar la firma
import { Document, Page, pdfjs } from 'react-pdf'; // Para MOSTRAR el PDF
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // Estilos necesarios
import 'react-pdf/dist/esm/Page/TextLayer.css';      // Estilos necesarios
import { toast } from "sonner"; // Para notificaciones
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // Icono de carga
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

    // --- Referencias ---
    const signaturePadRef = useRef<SignatureCanvas>(null);
    const pdfWrapperRef = useRef<HTMLDivElement>(null); // Para ajustar ancho del PDF

    // --- Handlers para react-pdf ---
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
        console.log(`PDF Document loaded: ${numPages} pages.`);
        setNumPages(numPages);
        setCurrentPage(1); // Ir a la primera página al cargar
        setPdfError(null);
        setIsPdfLoading(false); // Terminar carga PDF
    }, []);

    const onDocumentLoadError = useCallback((error: Error): void => {
        console.error("Error loading PDF:", error);
        setPdfError(`Error al cargar PDF: ${error.message}. Verifique la URL o contacte soporte.`);
        setNumPages(null);
        setIsPdfLoading(false); // Terminar carga PDF (con error)
    }, []);

    // --- Handlers para Navegación PDF (Opcional) ---
    const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages || 1));

    // --- Handlers para Firma ---
    const handleClearSignature = () => {
        signaturePadRef.current?.clear();
        setSignatureIsEmpty(true); // Marcar como vacío al borrar
    };

    // Se llama cuando el usuario termina un trazo
    const handleSignatureEnd = () => {
        if (signaturePadRef.current) {
             // Verifica si está vacío después del trazo
             setSignatureIsEmpty(signaturePadRef.current.isEmpty());
        }
    };

    const handleSaveSignature = async () => {
        if (!signaturePadRef.current || signatureIsEmpty) {
             toast.warning("Firma requerida", { description: "Por favor, dibuja tu firma en el recuadro." });
             return;
         }

        // Obtener Data URL (calidad por defecto es PNG)
        const signatureDataUrl = signaturePadRef.current.toDataURL();

        setIsLoading(true);
        toast.info("Guardando firma...");

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
            toast.success("¡Firma Guardada!", { description: `Gracias ${signerName}. ${result.message || 'Proceso completado.'}` });
            // Deshabilitar controles después de guardar exitosamente
            // Podrías añadir un estado `isSigned` y usarlo en los `disabled` de los botones/canvas
            // setIsSigned(true);

        } catch (error: unknown) { // Manejo de error seguro
            console.error("Error saving signature:", error);
            let errorMessage = "Error desconocido al guardar la firma.";
            if (error instanceof Error) { errorMessage = error.message; }
            else if (typeof error === 'string') { errorMessage = error; }
            toast.error("Error al Guardar", { description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };
    // ------------------------------------

    return (
        <div className="border rounded-lg p-4 md:p-6 shadow-md bg-white space-y-6 max-w-4xl mx-auto">
            <p className="text-sm text-gray-700">
                Firmando como: <span className="font-semibold text-gray-900">{signerName}</span>
            </p>

            {/* --- Visor de PDF con react-pdf --- */}
            <div>
                <h3 className="text-lg font-medium mb-2 text-gray-800">Documento a Firmar</h3>
                <div ref={pdfWrapperRef} className="border rounded-md min-h-[500px] md:min-h-[600px] overflow-hidden bg-gray-50 flex flex-col items-center">
                    {isPdfLoading && <div className="p-10 text-center text-gray-500"><Loader2 className="animate-spin mr-2 inline-block h-5 w-5"/>Cargando documento...</div>}
                    {pdfError && !isPdfLoading && (
                        <div className="p-10 text-center text-red-600 bg-red-50 rounded m-4">
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
                            className="flex flex-col items-center overflow-y-auto w-full h-[500px] md:h-[600px]" // Permitir scroll vertical interno
                        >
                            <Page
                                key={`page_${currentPage}`}
                                pageNumber={currentPage}
                                // Ajustar ancho dinámicamente al contenedor
                                width={pdfWrapperRef.current ? pdfWrapperRef.current.getBoundingClientRect().width * 0.98 : undefined}
                                renderTextLayer={false} // Mejora rendimiento si no necesitas seleccionar texto
                                renderAnnotationLayer={true} // Mantener por si hay links o campos
                                className="mb-2 shadow-sm"
                            />
                        </Document>
                    )}
                </div>
                {/* Controles de Paginación PDF */}
                {!isPdfLoading && !pdfError && numPages && numPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-2 text-sm">
                        <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage <= 1}>
                            Anterior
                        </Button>
                        <span>Página {currentPage} de {numPages}</span>
                        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= numPages}>
                            Siguiente
                        </Button>
                    </div>
                )}
            </div>

             {/* Sección de Firma */}
     <div>
         <label htmlFor="signature-pad-canvas" className="block text-lg font-medium mb-2 text-gray-800">
             Tu Firma (Dibuja en el recuadro)
         </label>
         {/* Contenedor relativo */}
         <div className="relative border rounded-md w-full h-[150px] md:h-[200px] cursor-crosshair overflow-hidden">
             {/* Componente de Firma Real */}
             <SignatureCanvas
                 ref={signaturePadRef}
                 penColor='black'
                 canvasProps={{ id: 'signature-pad-canvas', className: `w-full h-full rounded-md bg-white ${isLoading ? 'opacity-50' : ''}` }} // Opcional: cambia opacidad
                 onEnd={handleSignatureEnd}
                 // disabled={isLoading} // <-- ELIMINA ESTA LÍNEA
             />
             {/* Div superpuesto para deshabilitar */}
             {isLoading && (
                 <div className="absolute inset-0 bg-gray-300 bg-opacity-30 cursor-not-allowed z-10" title="Guardando..."></div>
             )}
         </div>
     </div>

            {/* --- Botones de Acción --- */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button
                    variant="outline"
                    onClick={handleClearSignature}
                    disabled={isLoading} // Deshabilita si está guardando
                >
                    Borrar Firma
                </Button>
                <Button
                    onClick={handleSaveSignature}
                    disabled={isLoading || signatureIsEmpty} // Deshabilita si está guardando O si no hay firma
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {isLoading ? (
                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando... </>
                    ) : (
                        'Confirmar y Guardar Firma'
                    )}
                </Button>
            </div>
        </div>
    );
}