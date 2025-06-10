// /app/api/signature/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PDFDocument } from 'pdf-lib';
import { put } from '@vercel/blob';
import { Resend } from 'resend';
import crypto from 'crypto';
import { config } from '@/lib/config';

// --- Importar Tipos Centralizados ---
// ¡ASEGÚRATE DE QUE ESTOS TIPOS ESTÉN EXPORTADOS DESDE lib/types.ts!
import type { SignerAndContractDataResult } from '@/lib/types'; // Importa solo el tipo combinado
// Y asegúrate de importar los tipos individuales si los necesitas MÁS ABAJO
// import type { SignerInfo, ContractInfo } from '@/lib/types'; // Si los usas explícitamente después

// --- Importar Funciones del Servicio Notion ---
import { unifiedNotion } from '@/services/notion-unified';

// --- Configuración Inicial ---
const secret = process.env.JWT_SECRET;
const blobToken = config.blobStoreToken; // Usar el token desde config
const baseUrl = process.env.BASE_URL;
const resendApiKey = process.env.RESEND_API_KEY;
// const emailFrom = process.env.EMAIL_FROM || 'Contratos MVPX <noreply@resend.dev>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// --- Interfaces Específicas de esta Ruta ---
interface SignatureTokenPayload {
    signerId: string;
    contractId: string;
    email: string;
    iat?: number;
    exp?: number;
}

interface SignatureRequestBody {
    signatureDataUrl: string; // Data URL (Base64) de la firma PNG
}

// --- Función Helper para verificar el Token (MODIFICADA para lanzar siempre Error) ---
async function verifyToken(token: string): Promise<SignatureTokenPayload> { // <-- Devuelve SIEMPRE Payload o lanza Error
    if (!secret) {
        console.error("[Signature API] Error: Falta JWT_SECRET");
        throw new Error("Error de configuración del servidor (JWT)."); // Lanza error
    }
    try {
        // jwt.verify lanza error si es inválido o expirado
        const decoded = jwt.verify(token, secret) as SignatureTokenPayload;

        // Validaciones adicionales del contenido del payload
        if (!decoded || !decoded.signerId || !decoded.contractId || !decoded.email) {
            throw new Error("Token inválido o con datos incompletos.");
        }
        console.log("[Signature API] Token verificado OK:", { signerId: decoded.signerId, contractId: decoded.contractId });
        return decoded; // Devuelve el payload si todo OK

    } catch (error: unknown) { // Catch para errores de jwt.verify o validación
        console.error("[Signature API] Error verificando token:", error);
        let message = "Token inválido o expirado.";
        if (error instanceof Error) { message = error.message; }
        // Relanzar un error estandarizado
        throw new Error(`Error de Token: ${message}`);
    }
}

// --- Función Helper para calcular SHA-256 ---
function calculateSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}


// --- Handler PATCH (o POST) ---
export async function PATCH(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    // En Next.js 15, params debe ser awaited
    const { token } = await params;
    
    console.log(`[Signature API] Recibida petición PATCH para token: ${token ? token.substring(0, 10) + '...' : 'NO TOKEN'}`);

    // --- 1. Validar Configuración Crítica ---
    // (Sin cambios respecto a la versión anterior)
    if (!secret || !baseUrl) { console.error("[Signature API] Faltan variables de entorno críticas (JWT_SECRET, BASE_URL)"); return NextResponse.json({ error: "Error de configuración del servidor." }, { status: 500 }); }
    if (!resend && process.env.NODE_ENV === 'production') { console.error("[Signature API] Resend no configurado..."); /*...*/ }
    else if (!resend) { console.warn("[Signature API] Resend no configurado..."); }

    // --- Declarar variables fuera del try ---
    let tokenPayload: SignatureTokenPayload; // No necesita valor inicial si SIEMPRE se asigna o lanza error antes de usar
    let signerAndContractData: { signer: any; contract: any; } | null = null; // Inicializar a null

    try {
        // --- 2. Verificar Token (Ahora lanza error si falla) ---
        tokenPayload = await verifyToken(token); // Asignación directa, si falla, salta al catch

        // --- 3. Obtener Datos de Notion ---
        signerAndContractData = await unifiedNotion.getSignerAndContract(tokenPayload.signerId, tokenPayload.contractId);
        if (!signerAndContractData) {
             // Este error ahora significa que Notion no encontró los datos, no que el token falló antes
            console.error(`[Signature API] No se encontraron datos para signerId: ${tokenPayload.signerId}, contractId: ${tokenPayload.contractId}`);
            return NextResponse.json({ error: "No se pudieron obtener los datos del contrato o firmante." }, { status: 404 });
        }

        // --- 4. Verificar si ya firmó ---
        if (signerAndContractData.signer.signedAt) {
            console.warn(`[Signature API] El firmante ${tokenPayload.signerId} ya firmó este contrato.`);
            return NextResponse.json({ message: "Ya has firmado este documento anteriormente." }, { status: 409 });
        }
        console.log("[Signature API] Datos de Notion recuperados y firmante pendiente.");

        // --- 5. Procesar Firma del Request Body ---
        const { signatureDataUrl } = await request.json() as SignatureRequestBody;
        if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
            return NextResponse.json({ error: "Firma inválida o no proporcionada." }, { status: 400 });
        }
        console.log("[Signature API] Firma recibida (Data URL).");

        // --- 6. Descargar PDF Borrador de Blob ---
        if (!signerAndContractData.contract.pdfUrl_draft) { throw new Error("La URL del PDF borrador no está disponible."); }
        console.log("[Signature API] Descargando PDF borrador desde:", signerAndContractData.contract.pdfUrl_draft);
        const draftPdfResponse = await fetch(signerAndContractData.contract.pdfUrl_draft);
        if (!draftPdfResponse.ok) { throw new Error(`No se pudo descargar el PDF borrador (${draftPdfResponse.status})`); }
        const draftPdfBytes = await draftPdfResponse.arrayBuffer();
        console.log(`[Signature API] PDF borrador descargado (${(draftPdfBytes.byteLength / 1024).toFixed(1)} KB).`);

        // --- 7. Embeber Firma en PDF ---
        console.log("[Signature API] Embebiendo firma en PDF...");
        const pdfDoc = await PDFDocument.load(draftPdfBytes);
        const signatureImageBytes = Buffer.from(signatureDataUrl.split(',')[1], 'base64');
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        const pages = pdfDoc.getPages();
        
        // Debug: Información del PDF y firmante
        console.log(`[Signature API DEBUG] PDF tiene ${pages.length} páginas`);
        console.log(`[Signature API DEBUG] Firmante quiere firmar en página ${signerAndContractData.signer.pageNumber}`);
        console.log(`[Signature API DEBUG] Posición: (${signerAndContractData.signer.posX}, ${signerAndContractData.signer.posY})`);
        
        // Validación robusta del número de página
        if (pages.length === 0) {
            throw new Error("El PDF no contiene páginas válidas.");
        }
        
        let pageIndex = signerAndContractData.signer.pageNumber - 1; // 0-indexed
        
        // Auto-corregir si el número de página es inválido
        if (pageIndex < 0 || pageIndex >= pages.length) { 
            console.warn(`[Signature API WARNING] Página ${signerAndContractData.signer.pageNumber} inválida para PDF de ${pages.length} páginas. Auto-corrigiendo a página 1.`);
            pageIndex = 0; // Usar primera página como fallback
        }
        
        const page = pages[pageIndex];
        if (!page) {
            throw new Error(`No se pudo obtener la página ${pageIndex + 1} del PDF.`);
        }
        
        const { height: pageHeight, width: pageWidth } = page.getSize();
        console.log(`[Signature API DEBUG] Página ${pageIndex + 1}: ${pageWidth}x${pageHeight}px`);
        
        // Validar coordenadas de firma
        const signatureX = Math.max(0, Math.min(signerAndContractData.signer.posX, pageWidth - signerAndContractData.signer.signatureWidth));
        const signatureY = pageHeight - signerAndContractData.signer.posY - signerAndContractData.signer.signatureHeight; // Y desde abajo
        
        // Asegurar que la firma esté dentro de los límites de la página
        const finalSignatureY = Math.max(0, Math.min(signatureY, pageHeight - signerAndContractData.signer.signatureHeight));
        
        console.log(`[Signature API] Dibujando firma en página ${pageIndex+1} en (${signatureX}, ${finalSignatureY})`);
        page.drawImage(signatureImage, { 
            x: signatureX, 
            y: finalSignatureY, 
            width: signerAndContractData.signer.signatureWidth, 
            height: signerAndContractData.signer.signatureHeight 
        });
        
        const signedPdfBytes = await pdfDoc.save();
        console.log(`[Signature API] PDF con firma embebida generado (${(signedPdfBytes.length / 1024).toFixed(1)} KB).`);

        // --- 8. Actualizar Firmante en Notion ---
        console.log(`[Signature API] Actualizando registro del firmante ${tokenPayload.signerId}...`);
        await unifiedNotion.updateSignerAsSigned(tokenPayload.signerId); // ¡Ahora se usa!
        console.log(`[Signature API] Registro del firmante ${tokenPayload.signerId} actualizado.`);

        // --- 9. Verificar si es la Última Firma ---
        console.log(`[Signature API] Verificando firmantes pendientes para contrato ${tokenPayload.contractId}...`);
        const pendingCount = await unifiedNotion.countPendingSigners(tokenPayload.contractId);
        console.log(`[Signature API] Firmantes pendientes: ${pendingCount}`);

        if (pendingCount === 0) {
            console.log("[Signature API] ¡Última firma! Procesando contrato final...");
            const signedPdfBuffer = Buffer.from(signedPdfBytes);
            const finalHash = calculateSHA256(signedPdfBuffer);
            const signedPdfPath = `contracts/signed/${signerAndContractData.contract.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_signed.pdf`;
            const signedBlobOptions: { access: 'public'; contentType: string; token?: string } = { access: 'public', contentType: 'application/pdf' };
            if (blobToken) { signedBlobOptions.token = blobToken; }

            console.log("[Signature API] Subiendo PDF firmado a Blob...");
            const { url: signedPdfUrl } = await put(signedPdfPath, signedPdfBuffer, signedBlobOptions);
            console.log("[Signature API] PDF firmado subido a:", signedPdfUrl);

            console.log(`[Signature API] Actualizando estado final del contrato ${tokenPayload.contractId}...`);
            // ¡Llamada a la función unificada!
            await unifiedNotion.finalizeContract(tokenPayload.contractId, {
                pdfUrl_signed: signedPdfUrl,
                sha256: finalHash
            });
            console.log(`[Signature API] Contrato ${tokenPayload.contractId} marcado como Firmado.`);

            // (Opcional) Notificar a Todos
            // ...
        }

        // --- 10. Responder al Frontend con Éxito ---
        return NextResponse.json({ success: true, message: "Firma recibida y procesada correctamente." });

    } catch (error: unknown) { // <-- Catch Principal con unknown
        console.error("[Signature API] Error procesando firma:", error);
        // --- VERIFICACIÓN DE TIPO ---
        let errorMessage = "Error desconocido al procesar la firma.";
        if (error instanceof Error) { errorMessage = error.message; }
        else if (typeof error === 'string') { errorMessage = error; }
        // --- FIN VERIFICACIÓN ---
        // Determinar status code basado en el error si es posible
        const status = (error instanceof Error && error.message.startsWith("Error de Token:")) ? 401 : 500;
        return NextResponse.json({ success: false, error: errorMessage }, { status });
    }
}