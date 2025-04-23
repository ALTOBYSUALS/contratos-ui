// ---------- ARCHIVO: app/sign/[token]/SignatureClientComponent.tsx ----------

"use client"; // ¡¡MUY IMPORTANTE para que funcione en el navegador!!

import React, { useRef, useState, useEffect } from 'react';
// --- ¡IMPORTANTE! Descomenta e importa tus librerías reales ---
// Ejemplo para Visualizar PDF (react-pdf):
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // Estilos necesarios para react-pdf
// import 'react-pdf/dist/esm/Page/TextLayer.css';      // Estilos necesarios para react-pdf
// Ejemplo para Firma (react-signature-canvas):
// import SignatureCanvas from 'react-signature-canvas';
// -----------------------------------------------------------
import { Button } from '@/components/ui/button'; // Ajusta si usas otra librería de UI

// --- Define y EXPORTA la interfaz de Props ---
// Debe coincidir con lo que page.tsx envía
export interface SignatureClientProps {
    token: string;
    signerName: string;
    contractPdfUrl: string; // La URL directa al PDF borrador
}

// --- El Componente Funcional ---
export default function SignatureClientComponent({ token, signerName, contractPdfUrl }: SignatureClientProps) {
    // --- Estados ---
    const [numPages, setNumPages] = useState<number | null>(null); // Para react-pdf
    const [isLoading, setIsLoading] = useState(false); // Para el botón de guardar
    const [errorLoadingPdf, setErrorLoadingPdf] = useState<string | null>(null); // Para errores del PDF

    // --- Referencias ---
    // Cambia 'any' por el tipo específico de tu librería de firma si lo conoces (ej. SignatureCanvas)
    const signaturePadRef = useRef<any>(null);

    // --- Efecto para configurar el worker de PDF (si usas react-pdf) ---
    // useEffect(() => {
    //     // Configura la ruta al worker de pdf.js (necesario para react-pdf)
    //     // Puedes descargarlo o usar un CDN
    //     pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    // }, []);
    // ----------------------------------------------------------------------

    // --- Handlers para react-pdf (Ejemplo) ---
    // const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    //     console.log(`Document loaded successfully with ${numPages} pages.`);
    //     setNumPages(numPages);
    //     setErrorLoadingPdf(null); // Limpia errores previos
    // };

    // const onDocumentLoadError = (error: Error): void => {
    //     console.error("Error loading PDF:", error);
    //     setErrorLoadingPdf(`Error al cargar el documento PDF: ${error.message}. Verifica la URL y los permisos CORS si aplica.`);
    //     setNumPages(null);
    // };
    // -------------------------------------------

    // --- Handlers para Botones de Firma ---
    const handleClearSignature = () => {
        if (signaturePadRef.current) {
            try {
                 // --- ¡IMPORTANTE! Llama al método 'clear' de TU librería de firma ---
                 // Ejemplo para react-signature-canvas:
                 // signaturePadRef.current.clear();
                 console.log("Signature cleared.");
            } catch (error) {
                console.error("Error clearing signature pad:", error);
            }
        }
    };

    const handleSaveSignature = async () => {
        if (!signaturePadRef.current) {
             alert("Error: No se puede acceder al componente de firma.");
             return;
         }

         // --- ¡IMPORTANTE! Verifica si el pad está vacío usando TU librería ---
         // Ejemplo para react-signature-canvas:
         // if (signaturePadRef.current.isEmpty()) {
         //     alert("Por favor, firma el documento antes de guardar.");
         //     return;
         // }

        // --- ¡IMPORTANTE! Obtén los datos de la firma usando TU librería ---
        // Puede ser una imagen DataURL (png/jpeg) o datos vectoriales (SVG)
        // Ejemplo para react-signature-canvas (obtener como PNG):
        // const signatureDataUrl = signaturePadRef.current.toDataURL('image/png');
        const signatureDataUrl = "PLACEHOLDER_SIGNATURE_DATA"; // Reemplaza esto

        if (signatureDataUrl === "PLACEHOLDER_SIGNATURE_DATA" || !signatureDataUrl) {
             console.warn("No se obtuvieron datos de la firma (revisa la integración de tu librería).");
             alert("No se pudo obtener la imagen de la firma.");
             return; // No continuar si no hay datos
         }


        setIsLoading(true);
        console.log("Attempting to save signature...");
        console.log("Token:", token);
        // console.log("Signature Data Preview (first 100 chars):", signatureDataUrl.substring(0, 100));

        try {
            // --- LLAMADA A TU API ROUTE ---
            // Ajusta la ruta '/api/save-signature' a la correcta en tu proyecto
            const response = await fetch('/api/save-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token, // El token JWT que identifica al firmante/contrato
                    signatureImage: signatureDataUrl, // La imagen de la firma en formato DataURL
                    // Puedes añadir más datos si tu backend los necesita (ej. timestamp del cliente)
                    // clientTimestamp: new Date().toISOString(),
                }),
            });

            // Manejo básico de la respuesta
            if (!response.ok) {
                let errorMessage = `Error del servidor: ${response.status}`;
                try {
                    // Intenta obtener un mensaje de error más específico del cuerpo JSON
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    // Si el cuerpo no es JSON o está vacío, usa el mensaje de estado
                    console.error("Could not parse error response body:", jsonError);
                }
                throw new Error(errorMessage);
            }

            const result = await response.json(); // Asume que tu API devuelve JSON en caso de éxito
            console.log("Signature saved successfully:", result);
            alert(`¡Firma guardada exitosamente para ${signerName}!`);

            // --- Acciones Post-Guardado (Opcional) ---
            // Podrías deshabilitar los botones permanentemente, mostrar un mensaje de éxito fijo,
            // o incluso intentar redirigir si tu API devuelve una URL de destino.
            // Ejemplo: Deshabilitar botones (necesitarías otro estado, ej. `isSignatureSaved`)
            // setIsSignatureSaved(true);

        } catch (error) {
            console.error("Error saving signature:", error);
            alert(`Error al guardar la firma: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false); // Re-habilita el botón sin importar si hubo éxito o error
        }
    };
    // ------------------------------------

    // --- Renderizado del Componente ---
    return (
        <div className="border rounded-lg p-4 md:p-6 shadow-md bg-white space-y-6">
            {/* Información del Firmante */}
            <p className="text-sm text-gray-700">
                Firmando como: <span className="font-semibold text-gray-900">{signerName}</span>
            </p>

            {/* --- Sección del Visor de PDF --- */}
            <div>
                <h3 className="text-lg font-medium mb-2 text-gray-800">Documento a Firmar</h3>
                <div className="border rounded-md h-[500px] md:h-[600px] overflow-auto bg-gray-50 flex items-center justify-center">
                    {errorLoadingPdf ? (
                        <div className="p-4 text-center text-red-600 bg-red-50 rounded">
                            <p><strong>Error al cargar el documento:</strong></p>
                            <p className="text-sm mt-1">{errorLoadingPdf}</p>
                        </div>
                    ) : (
                        // --- ¡¡REEMPLAZA ESTO con tu componente de PDF real!! ---
                        // Ejemplo usando react-pdf:
                        // <Document
                        //     file={contractPdfUrl}
                        //     onLoadSuccess={onDocumentLoadSuccess}
                        //     onLoadError={onDocumentLoadError}
                        //     loading={<div className="p-4 text-gray-500">Cargando documento...</div>}
                        //     className="w-full h-full flex justify-center" // Centra el contenido
                        // >
                        //     {/* Renderiza todas las páginas o solo la relevante si la conoces */}
                        //     {Array.from(new Array(numPages || 0), (el, index) => (
                        //         <Page
                        //             key={`page_${index + 1}`}
                        //             pageNumber={index + 1}
                        //             // Ajusta el ancho según necesites, o usa renderMode="canvas"/"svg"
                        //             width={Math.min(window.innerWidth * 0.8, 700)} // Ejemplo de ancho responsivo
                        //             className="mb-2 shadow-sm" // Sombra sutil entre páginas
                        //         />
                        //     ))}
                        // </Document>
                         <div className="p-4 text-center text-gray-400 italic">
                             [Placeholder: Aquí se mostrará el PDF desde: {contractPdfUrl}]
                             <br />
                             (Necesitas integrar una librería como react-pdf)
                         </div>
                         // --- FIN REEMPLAZO ---
                    )}
                </div>
            </div>

            {/* --- Sección de Firma --- */}
            <div>
                <label htmlFor="signature-pad" className="block text-lg font-medium mb-2 text-gray-800">
                    Tu Firma
                </label>
                <div id="signature-pad" className="border rounded-md bg-white w-full h-[150px] md:h-[200px] cursor-crosshair">
                     {/* --- ¡¡REEMPLAZA ESTO con tu componente de Firma real!! --- */}
                     {/* Ejemplo usando react-signature-canvas */}
                     {/* <SignatureCanvas
                         ref={signaturePadRef} // Asocia la referencia
                         penColor='black'      // Color del lápiz
                         canvasProps={{ className: 'w-full h-full rounded-md' }} // Estilos para el canvas interno
                         onBegin={() => console.log("Started signing")} // Opcional: Callback al empezar a dibujar
                         onEnd={() => console.log("Finished signing stroke")} // Opcional: Callback al terminar trazo
                     /> */}
                     <div className="w-full h-full flex items-center justify-center text-gray-400 italic rounded-md">
                         [Placeholder: Aquí irá el área para dibujar la firma]
                         <br />
                         (Necesitas integrar una librería como react-signature-canvas)
                     </div>
                     {/* --- FIN REEMPLAZO --- */}
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
                    disabled={isLoading} // Deshabilita si está guardando
                >
                    {isLoading ? (
                        <>
                            {/* Puedes añadir un spinner si quieres */}
                            {/* <Loader2 className="mr-2 h-4 w-4 animate-spin" /> */}
                            Guardando...
                        </>
                    ) : (
                        'Confirmar y Guardar Firma'
                    )}
                </Button>
            </div>
        </div>
    );
}