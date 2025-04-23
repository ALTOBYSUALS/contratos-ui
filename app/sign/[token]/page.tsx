// Ruta: /app/sign/[token]/page.tsx
import { jwtVerify } from 'jose'; // Biblioteca moderna para verificar JWT
import SignatureClientComponent from './SignatureClientComponent'; // El componente para el canvas
import { AlertCircle, CheckCircle } from 'lucide-react'; // Iconos para mensajes

// --- IMPORTANTE: Importa tu función real para obtener datos ---
// import { getSignerAndContractData } from '@/lib/notion'; // O '@/lib/db'

// --- Función simulada (REEMPLAZA ESTA FUNCIÓN ENTERA) ---
// Esta función DEBE buscar en tu Notion/DB usando los IDs
async function getSignerAndContractData(signerId: string, contractId: string): Promise<any> {
    console.log(`[Sign Page] Buscando datos para signer: ${signerId}, contract: ${contractId}`);
    // --- Lógica REAL para buscar en Notion/DB ---
    // 1. Busca el firmante por signerId (asegúrate que pertenece a contractId si usas DB separadas)
    // 2. Busca el contrato por contractId
    // 3. Comprueba si el firmante ya firmó (signedAt no es null)
    // 4. Devuelve un objeto con la estructura esperada o null/error
    // --- Fin Lógica REAL ---

    // --- Placeholder de Ejemplo ---
    // Simula una llamada exitosa con datos falsos
    await new Promise(resolve => setTimeout(resolve, 50)); // Simula delay DB
     const foundSigner = { id: signerId, name: `Firmante ${signerId.substring(0,4)}`, email: 'test@example.com', signedAt: null, pageNumber: 0, posX: 72, posY: 650, signatureWidth: 150, signatureHeight: 60 };
     const foundContract = { id: contractId, title: `Contrato Ejemplo ${contractId.substring(0,4)}`, pdfUrl_draft: process.env.DUMMY_PDF_URL || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", status: 'pending_signature' }; // Usa una URL de PDF real para probar

     // Simula caso "ya firmado"
     // const foundSigner = { id: signerId, name: `Firmante ${signerId.substring(0,4)}`, email: 'test@example.com', signedAt: new Date().toISOString(), /* ... coords */ };
     // const foundContract = { id: contractId, title: `Contrato Ejemplo ${contractId.substring(0,4)}`, pdfUrl_draft: process.env.DUMMY_PDF_URL || "URL_PDF_VALIDA", status: 'signed' };

     // Simula caso "no encontrado"
     // return null;

     if (!foundSigner || !foundContract) return null;

     return { signer: foundSigner, contract: foundContract };
     // --- Fin Placeholder ---
}
// --- Fin Función Simulada ---


export default async function SignPage({ params }: { params: { token: string } }) {
    const token = params.token;
    let signerData: any = null;
    let contractData: any = null;
    let errorMessage: string | null = null;
    let isAlreadySigned = false;
    let isValidToken = false; // Asumimos inválido hasta verificar

    const secret = process.env.JWT_SIGNATURE_SECRET;

    if (!secret) {
        errorMessage = "Error de configuración del servidor (JWT Secret).";
    } else {
        try {
            // 1. Verificar el token JWT con jose
            const key = new TextEncoder().encode(secret);
            const { payload } = await jwtVerify(token, key, {
                algorithms: ['HS256'], // Especifica el algoritmo esperado
            });

            // Verifica que el payload tenga los datos esperados
            if (typeof payload !== 'object' || !payload.signerId || !payload.contractId) {
                throw new Error("Token inválido o contenido inesperado.");
            }
            isValidToken = true; // El token es válido estructuralmente y en firma/expiración

            console.log("[Sign Page] Token válido. Payload:", payload);

            // 2. Obtener datos del firmante y contrato desde tu DB/Notion
            // Llama a TU función real aquí
            const data = await getSignerAndContractData(payload.signerId as string, payload.contractId as string);

            if (!data || !data.signer || !data.contract) {
                 throw new Error("No se encontraron los datos asociados a este enlace de firma.");
            }

            // 3. Comprobar si ya está firmado
            if (data.signer.signedAt) {
                console.log(`[Sign Page] El firmante ${data.signer.id} ya firmó el ${data.signer.signedAt}`);
                isAlreadySigned = true;
                errorMessage = `Ya has firmado este contrato el ${new Date(data.signer.signedAt).toLocaleDateString()}.`;
                // Aún así, pasamos los datos por si quieres mostrar el PDF firmado
                signerData = data.signer;
                contractData = data.contract;
            } else if (data.contract.status !== 'pending_signature') {
                // Si el contrato ya no está pendiente (ej. completado, rechazado), no permitir firmar
                 isAlreadySigned = true; // Lo tratamos como si ya no se pudiera firmar
                 errorMessage = `Este contrato ya no está pendiente de firma (estado actual: ${data.contract.status || 'desconocido'}).`;
                 signerData = data.signer;
                 contractData = data.contract;
            }
            else {
                // Todo OK, pasar datos al componente cliente
                signerData = data.signer;
                contractData = data.contract;
            }

        } catch (error: any) {
            console.error("[Sign Page] Error procesando token o datos:", error);
            isValidToken = false; // Marcar como inválido si cualquier paso falla
            if (error.code === 'ERR_JWT_EXPIRED') {
                errorMessage = "El enlace de firma ha expirado. Contacta al remitente para uno nuevo.";
            } else if (error.code === 'ERR_JWS_INVALID' || error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
                errorMessage = "El enlace de firma no es válido o ha sido manipulado.";
            } else {
                errorMessage = error.message || "Error al procesar el enlace de firma.";
            }
            // Asegúrate de no pasar datos sensibles si el token falla
             signerData = null;
             contractData = null;
        }
    }

    // --- Renderizado Condicional ---
    return (
        // Un layout simple para la página de firma pública
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-5xl bg-white p-6 md:p-10 rounded-lg shadow-lg">
                <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-gray-800">
                   {contractData?.title || "Firma de Contrato"}
                </h1>

                {/* Mostrar Mensaje de Error o Éxito (si aplica) */}
                {errorMessage && (
                    <div className={`border px-4 py-3 rounded relative mb-6 ${isAlreadySigned ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`} role="alert">
                        <strong className="font-bold flex items-center">
                            {isAlreadySigned ? <CheckCircle className="mr-2" size={20}/> : <AlertCircle className="mr-2" size={20}/>}
                            {isAlreadySigned ? "Información" : "Error"}
                        </strong>
                        <span className="block sm:inline ml-1">{errorMessage}</span>
                         {/* Si ya está firmado y tienes la URL final, podrías ofrecer verla */}
                         {isAlreadySigned && contractData?.pdfUrl_signed && (
                            <p className="mt-2">
                                <a href={contractData.pdfUrl_signed} target="_blank" rel="noopener noreferrer" className="underline text-sm text-blue-600 hover:text-blue-800">
                                    Ver documento final firmado
                                </a>
                            </p>
                         )}
                         {/* Si el token expiró o es inválido, no mostramos nada más */}
                         {!isValidToken && (
                             <p className="mt-2 text-sm">Por favor, contacta a la persona que te envió el contrato.</p>
                         )}
                    </div>
                )}

                {/* Mostrar Componente Cliente SOLO si el token es válido Y no está ya firmado */}
                {isValidToken && !isAlreadySigned && signerData && contractData && (
                    <SignatureClientComponent
                        token={token}
                        signerName={signerData.name || 'Firmante'} // Pasa el nombre
                        contractPdfUrl={contractData.pdfUrl_draft} // Pasa la URL del BORRADOR
                    />
                )}
            </div>
             <p className="text-xs text-gray-500 mt-4">Plataforma de Contratos Seguros</p>
        </div>
    );
}