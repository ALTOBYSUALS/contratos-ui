// /app/sign/[token]/page.tsx
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers'; // Para forzar dinamismo

// --- Importar Servicios y Tipos ---
import { getSignerAndContractData } from '@/services/notion'; // Tu función para obtener datos
// Importa los tipos necesarios desde tu archivo centralizado
import type { SignerAndContractDataResult, SignatureClientProps } from '@/lib/types';

// --- Importar el Componente Cliente ---
import SignatureClientComponent from './SignatureClientComponent'; // Importa el componente cliente

// --- Forzar renderizado dinámico para asegurar que el token se valide siempre ---
// y que los datos de Notion no se cacheen estáticamente.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --- Interfaz para las Props de la Página (Parámetros de Ruta) ---
interface SignPageProps {
  params: {
    token: string; // El token viene de la URL dinámica [token]
  };
}

// --- Interfaz para el Payload del Token (Debe coincidir con la definición en send-finalized) ---
interface SignatureTokenPayload {
    signerId: string;
    contractId: string;
    email: string; // Puedes añadir iat, exp si los necesitas verificar
}

// --- Función Helper para verificar Token (similar a la de la API, pero puede ser específica aquí) ---
async function verifyTokenOnServer(token: string): Promise<SignatureTokenPayload | null> {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("[Sign Page] Error: Falta JWT_SECRET en el servidor.");
        // En un Server Component, podrías lanzar un error que capture un error.tsx o not-found.tsx
        throw new Error("Error de configuración del servidor.");
    }
    try {
        // Verifica y decodifica
        const decoded = jwt.verify(token, secret) as SignatureTokenPayload;
        // Validaciones básicas del payload
        if (!decoded || !decoded.signerId || !decoded.contractId || !decoded.email) {
            console.warn("[Sign Page] Token decodificado pero con payload inválido:", decoded);
            return null;
        }
        console.log("[Sign Page] Token verificado en servidor OK:", { signerId: decoded.signerId, contractId: decoded.contractId });
        return decoded;
    } catch (error: unknown) { // <-- CORREGIDO: unknown
        console.error("[Sign Page] Error verificando token en servidor:", error);
        // No lanzar error aquí, devolver null para mostrar página de error controlada
        return null;
    }
}

// --- El Componente de Página (Server Component) ---
export default async function SignPage({ params }: SignPageProps) {
    // Forzar dinamismo leyendo headers (alternativa a export const dynamic)
    headers();

    const { token } = params;
    let tokenPayload: SignatureTokenPayload | null = null;
    let initialData: SignerAndContractDataResult | null = null;
    let errorMessage: string | null = null;

    // --- 1. Verificar Token ---
    try {
        tokenPayload = await verifyTokenOnServer(token);
        if (!tokenPayload) {
            errorMessage = "El enlace de firma es inválido, está incompleto o ha expirado.";
        }
    } catch (error: unknown) { // <-- CORREGIDO: unknown
         // Captura errores lanzados por verifyTokenOnServer (ej. falta JWT_SECRET)
         errorMessage = "Error al validar el enlace de firma.";
         if (error instanceof Error) { errorMessage = error.message; }
    }

    // --- 2. Obtener Datos de Notion (Solo si el Token es Válido) ---
    if (tokenPayload) {
        try {
            initialData = await getSignerAndContractData(tokenPayload.signerId, tokenPayload.contractId);
            if (!initialData) {
                errorMessage = "No se pudieron encontrar los datos del contrato o firmante asociados a este enlace.";
            } else if (initialData.signer.signedAt) {
                // Si ya firmó, mostrar mensaje pero permitir ver (sin firmar de nuevo)
                 errorMessage = `Este documento ya fue firmado por ${initialData.signer.name} el ${new Date(initialData.signer.signedAt).toLocaleString()}.`;
                 // Podríamos querer mostrar el PDF firmado aquí si tenemos la URL
                 // initialData.contract.pdfUrl_draft = initialData.contract.pdfUrl_signed || initialData.contract.pdfUrl_draft;
            }
        } catch (error: unknown) { // <-- CORREGIDO: unknown
            console.error("[Sign Page] Error obteniendo datos de Notion:", error);
            let notionErrorMsg = "Error al cargar los datos del contrato desde la base de datos.";
            if (error instanceof Error) { notionErrorMsg = error.message; }
            errorMessage = notionErrorMsg; // Sobrescribir mensaje de error
            initialData = null; // Asegurar que no se pasen datos parciales
        }
    }

    // --- 3. Renderizar ---
    // Si hubo error o no hay datos, muestra un mensaje de error
    if (errorMessage && !initialData?.contract.pdfUrl_draft) { // Mostrar error si no podemos ni mostrar el PDF
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="p-8 bg-white rounded shadow-md text-center max-w-md">
                    <h1 className="text-xl font-semibold text-red-600 mb-4">Error</h1>
                    <p className="text-gray-700">{errorMessage || "Ocurrió un error inesperado."}</p>
                    {/* Podrías añadir un botón para volver al inicio */}
                </div>
            </div>
        );
    }

    // Si tenemos datos (incluso si ya firmó o hay un mensaje de error no bloqueante),
    // pasamos la información necesaria al Componente Cliente.
    // Asegúrate de que las props coincidan con SignatureClientProps
    const clientProps: SignatureClientProps = {
        token: token,
        signerName: initialData?.signer.name || "Firmante Desconocido",
        contractPdfUrl: initialData?.contract.pdfUrl_draft || "", // Pasar URL borrador
        // Podrías pasar un flag indicando si ya está firmado para deshabilitar controles en el cliente
        // isAlreadySigned: !!initialData?.signer.signedAt
    };

    // Validar que tenemos la URL del PDF antes de renderizar el cliente
    if (!clientProps.contractPdfUrl) {
         return (
             <div className="flex items-center justify-center min-h-screen bg-gray-100">
                 <div className="p-8 bg-white rounded shadow-md text-center max-w-md">
                     <h1 className="text-xl font-semibold text-red-600 mb-4">Error</h1>
                     <p className="text-gray-700">No se encontró la URL del documento PDF para firmar.</p>
                 </div>
             </div>
         );
     }


    return (
        <div className="min-h-screen bg-gray-200 p-4 md:p-8">
            {/* Renderiza el componente cliente pasándole las props necesarias */}
            <SignatureClientComponent {...clientProps} />
             {/* Muestra el mensaje de error no bloqueante (ej. ya firmado) */}
             {errorMessage && initialData?.contract.pdfUrl_draft && (
                 <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded-md text-center max-w-4xl mx-auto text-sm">
                     {errorMessage}
                 </div>
             )}
        </div>
    );
}