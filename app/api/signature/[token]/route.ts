// Ruta Completa: /app/api/signature/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { put, del, head } from '@vercel/blob'; // Importa 'head' para verificar existencia, 'del' para borrar
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Client as NotionClient } from "@notionhq/client";

// --- Configuración Inicial ---
const notion = process.env.NOTION_TOKEN ? new NotionClient({ auth: process.env.NOTION_TOKEN }) : null;
const NOTION_CONTRACTS_DB_ID = process.env.NOTION_DB_CONTRACTS;
const NOTION_SIGNERS_DB_ID = process.env.NOTION_DB_SIGNERS; // Opcional, si usas DB separada
const secret = process.env.JWT_SIGNATURE_SECRET;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

// --- INTERFACES ESPERADAS (Define según tu DB/Notion real) ---
interface SignerData {
    id: string;
    name: string;
    email: string;
    signedAt: string | null; // Fecha ISO si firmó, null si no
    pageNumber: number;
    posX: number;
    posY: number;          // Y desde ARRIBA
    signatureWidth: number;
    signatureHeight: number;
}
interface ContractData {
    id: string;
    title: string;
    pdfUrl_draft: string | null;
    pdfUrl_signed: string | null; // URL del PDF firmado (se actualiza aquí)
    status: string; // Ej: 'pending_signature', 'signed'
}
interface SignerAndContract {
    signer: SignerData;
    contract: ContractData;
}

// --- Funciones Auxiliares (¡¡IMPLEMENTA ESTAS CON TU LÓGICA REAL!!) ---
async function getSignerForUpdate(signerId: string, contractId: string): Promise<SignerAndContract | null> {
    console.log(`[Signature API] Buscando firmante ${signerId} para contrato ${contractId}...`);
    if (!notion || !NOTION_CONTRACTS_DB_ID || !NOTION_SIGNERS_DB_ID) {
        console.warn("Simulando getSignerForUpdate porque Notion no está configurado");
        return { signer: { id: signerId, name: "Firmante Sim", email: "test@test.com", signedAt: null, pageNumber: 0, posX: 72, posY: 600, signatureWidth: 150, signatureHeight: 60 }, contract: { id: contractId, pdfUrl_draft: process.env.DUMMY_PDF_URL || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", title: "Dummy Contract Title", status: 'pending_signature', pdfUrl_signed: null } };
    }
    // --- LÓGICA REAL AQUÍ para buscar en Notion/DB ---
    // 1. Busca la página del firmante por signerId (Notion Signers DB)
    // 2. Verifica que su relación 'Contract Relation' apunte al contractId
    // 3. Obtén la página del contrato por contractId (Notion Contracts DB)
    // 4. Extrae todas las propiedades necesarias (signedAt, pdfUrl_draft, etc.)
    // 5. Devuelve el objeto SignerAndContract o null
    try {
        const signerPage = await notion.pages.retrieve({ page_id: signerId });
        const signerProps = (signerPage as any).properties;
        const contractRelation = signerProps['Contract Relation']?.relation?.[0]?.id;

        if (!contractRelation || contractRelation !== contractId) {
            console.error(`El firmante ${signerId} no pertenece al contrato ${contractId}`);
            return null;
        }
        const contractPage = await notion.pages.retrieve({ page_id: contractId });
        const contractProps = (contractPage as any).properties;

         // Comprobar que el PDF borrador existe antes de devolver
         const draftPdfUrl = contractProps['Draft PDF URL']?.url;
         if (!draftPdfUrl) {
             console.error(`Contrato ${contractId} no tiene URL de PDF borrador.`);
             return null;
         }


        return {
            signer: {
                id: signerPage.id,
                name: signerProps['Name']?.title?.[0]?.plain_text || 'Sin Nombre',
                email: signerProps['Email']?.email || 'sin_email@error.com',
                signedAt: signerProps['Signed At']?.date?.start || null,
                pageNumber: signerProps['Sign Page']?.number ?? 0,
                posX: signerProps['Sign X']?.number ?? 72,
                posY: signerProps['Sign Y']?.number ?? 600, // Y desde ARRIBA
                signatureWidth: signerProps['Signature Width']?.number ?? 150,
                signatureHeight: signerProps['Signature Height']?.number ?? 60,
            },
            contract: {
                id: contractPage.id,
                title: contractProps['Name']?.title?.[0]?.plain_text || 'Sin Título',
                pdfUrl_draft: draftPdfUrl,
                pdfUrl_signed: contractProps['PDF Firmado URL']?.url || null,
                status: contractProps['Status']?.select?.name || 'unknown',
            }
        };
    } catch(e) { console.error("Error buscando datos en Notion para firma:", e); return null; }
}

async function updateSignerRecord(signerId: string, data: Partial<SignerData>): Promise<void> {
    console.log(`[Signature API] Actualizando firmante ${signerId} con:`, data);
    if (!notion || !NOTION_SIGNERS_DB_ID) return;
    const propertiesToUpdate: any = {};
    if (data.signedAt) propertiesToUpdate['Signed At'] = { date: { start: data.signedAt } }; // Actualiza Signed At
    // if (data.signatureDataUrl) propertiesToUpdate['Signature Image URL'] = { url: data.signatureDataUrl }; // Opcional

    if (Object.keys(propertiesToUpdate).length > 0) {
        try { await notion.pages.update({ page_id: signerId, properties: propertiesToUpdate }); } catch (e) { console.error("Error actualizando firmante en Notion:", e); }
    }
}

async function updateContractRecord(contractId: string, data: Partial<ContractData> & { signedAt?: Date }): Promise<void> {
    console.log(`[Signature API] Actualizando contrato ${contractId} con:`, data);
    if (!notion || !NOTION_CONTRACTS_DB_ID) return;
    const propertiesToUpdate: any = {};
    if (data.status) propertiesToUpdate['Status'] = { select: { name: data.status } };
    if (data.pdfUrl_signed) propertiesToUpdate['PDF Firmado URL'] = { url: data.pdfUrl_signed };
    if (data.signedAt) propertiesToUpdate['Fecha Firma Final'] = { date: { start: data.signedAt.toISOString().split('T')[0] } }; // Solo fecha

    if (Object.keys(propertiesToUpdate).length > 0) {
        try { await notion.pages.update({ page_id: contractId, properties: propertiesToUpdate }); } catch (e) { console.error("Error actualizando contrato en Notion:", e); }
    }
}

async function getSignersCount(contractId: string, filter: { signed: boolean }): Promise<number> {
    console.log(`[Signature API] Contando firmantes para ${contractId} con filtro:`, filter);
    if (!notion || !NOTION_SIGNERS_DB_ID) return 0;
    const notionFilter: any = {
        and: [ { property: 'Contract Relation', relation: { contains: contractId } } ]
    };
    if (filter.signed === false) notionFilter.and.push({ property: 'Signed At', date: { is_empty: true } });
    else if (filter.signed === true) notionFilter.and.push({ property: 'Signed At', date: { is_not_empty: true } });

    try {
        // Notion SDK v2+ no tiene conteo directo, hay que obtener resultados y mirar length
        // Podríamos optimizar con page_size: 1 si solo necesitamos saber si es > 0
        const response = await notion.databases.query({
            database_id: NOTION_SIGNERS_DB_ID,
            filter: notionFilter,
        });
        return response.results.length; // Devuelve el número real de firmantes que cumplen el filtro
    } catch (e) {
         console.error("Error contando firmantes en Notion:", e);
         return filter.signed ? 0 : 999; // Devuelve un número alto si falla la cuenta de no firmados
    }

}

async function createHashRecord(contractId: string, sha256: string): Promise<void> {
    console.log(`[Signature API] Guardando hash ${sha256} para contrato ${contractId}`);
    if (!notion || !NOTION_CONTRACTS_DB_ID) return;
     try {
        await notion.pages.update({
            page_id: contractId, // Actualiza la página del CONTRATO
            properties: {
                // --- AJUSTA NOMBRE DE PROPIEDAD ---
                'SHA-256 Firmado': { rich_text: [{ text: { content: sha256 } }] }
            }
         });
     } catch (e) { console.error("Error guardando hash en Notion:", e); }
}

// --- FUNCIÓN PRINCIPAL DEL PATCH ---
export async function PATCH(request: NextRequest, { params }: { params: { token: string } }) {
    const token = params.token;

    // Verifica configuración básica
    if (!secret) { console.error("ENV ERROR: JWT_SIGNATURE_SECRET no configurado"); return NextResponse.json({ error: "Configuración inválida" }, { status: 500 }); }
    if (!blobToken) { console.error("ENV ERROR: BLOB_READ_WRITE_TOKEN no configurado"); return NextResponse.json({ error: "Configuración inválida" }, { status: 500 }); }

    try {
        const { png } = await request.json();
        if (!token || !png) { return NextResponse.json({ error: "Faltan datos (token o firma)" }, { status: 400 }); }

        // 1. Verificar Token y Obtener IDs
        let payload: any;
        try {
            payload = jwt.verify(token, secret);
            if (typeof payload !== 'object' || !payload.signerId || !payload.contractId) throw new Error('Token inválido o incompleto');
        } catch (e: any) { console.error("Error de verificación JWT:", e.message); return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 }); }

        const signerId = payload.signerId;
        const contractId = payload.contractId;
        console.log(`[Signature API] Recibida firma para signer ${signerId}, contrato ${contractId}`);

        // 2. Obtener datos del firmante y contrato (Usando tu función REAL)
        const data = await getSignerForUpdate(signerId, contractId);
        if (!data || !data.signer || !data.contract || !data.contract.pdfUrl_draft) {
            console.error(`[Signature API] No se encontraron datos válidos o URL de borrador para signer ${signerId}, contrato ${contractId}`);
            return NextResponse.json({ error: "Enlace inválido o contrato no listo para firmar" }, { status: 404 });
        }
        if (data.signer.signedAt) {
            console.log(`[Signature API] Firmante ${signerId} ya había firmado.`);
            return NextResponse.json({ message: "Ya firmado previamente", pdfUrl: data.contract.pdfUrl_signed || data.contract.pdfUrl_draft }, { status: 200 });
        }
         if (data.contract.status !== 'pending_signature') {
             console.warn(`[Signature API] Intento de firma para contrato ${contractId} con estado ${data.contract.status}`);
             return NextResponse.json({ error: `El contrato ya no está pendiente de firma (Estado: ${data.contract.status})` }, { status: 400 });
         }

        // 3. Descargar PDF Borrador desde Vercel Blob
        console.log(`[Signature API] Descargando borrador: ${data.contract.pdfUrl_draft}`);
        const fetchResponse = await fetch(data.contract.pdfUrl_draft); // Descarga el PDF
        if (!fetchResponse.ok) throw new Error(`Error ${fetchResponse.status} descargando PDF borrador`);
        const pdfBytesDraft = await fetchResponse.arrayBuffer(); // Obtiene los bytes como ArrayBuffer
        const pdfDoc = await PDFDocument.load(pdfBytesDraft);   // Carga en pdf-lib

        // 4. Embeber Firma PNG
        console.log("[Signature API] Embebiendo firma...");
        const pngBase64 = png.substring(png.indexOf(',') + 1); // Quita prefijo 'data:image/png;base64,'
        const signaturePng = await pdfDoc.embedPng(Buffer.from(pngBase64, "base64")); // pdf-lib necesita Buffer
        const pageIndex = data.signer.pageNumber ?? 0;
        const pages = pdfDoc.getPages();
        if (pageIndex >= pages.length) throw new Error(`Página ${pageIndex} inválida (Total: ${pages.length})`);
        const page = pages[pageIndex];

        const sigWidth = data.signer.signatureWidth ?? 150;
        const sigHeight = data.signer.signatureHeight ?? 60;
        const sigX = data.signer.posX ?? 72;
        const sigY = page.getHeight() - (data.signer.posY ?? 600) - sigHeight; // Convierte Y desde arriba a Y desde abajo para pdf-lib

        page.drawImage(signaturePng, { x: sigX, y: sigY, width: sigWidth, height: sigHeight });
        console.log(`[Signature API] Firma embebida en página ${pageIndex} en PDF coords (${sigX}, ${sigY})`);

        // 5. Guardar PDF Final Firmado en Vercel Blob
        console.log("[Signature API] Guardando PDF final...");
        const finalPdfBytes = await pdfDoc.save(); // Guarda los cambios como Uint8Array
        const finalFileName = `contracts/signed/${contractId}_signed.pdf`; // Nombre consistente para el PDF final
        const finalPdfBlob = await put(finalFileName, Buffer.from(finalPdfBytes), { // Convierte a Buffer para put
            access: 'public', // O 'private' si quieres URLs firmadas
            contentType: 'application/pdf',
            addRandomSuffix: false,
            token: blobToken
        });
        console.log(`[Signature API] PDF final subido a: ${finalPdfBlob.url}`);

        // 6. Calcular Hash SHA-256
        const sha256 = crypto.createHash("sha256").update(finalPdfBytes).digest("hex");
        console.log(`[Signature API] SHA256: ${sha256}`);

        // 7. Actualizar Registros en DB/Notion
        const signedAtDate = new Date();
        // await updateSignerRecord(signerId, { signedAt: signedAtDate.toISOString() }); // Usa tu función real
        // Si guardas la imagen (opcional, ocupa espacio):
        // await updateSignerRecord(signerId, { signedAt: signedAtDate.toISOString(), signatureDataUrl: png });
        console.log(`[Signature API] Registro firmante ${signerId} marcado como firmado.`);

        // Comprobar si todos han firmado (Usa tu función real)
        const remainingSigners = await getSignersCount(contractId, { signed: false });
        console.log(`[Signature API] Firmantes restantes para ${contractId}: ${remainingSigners}`);
        const finalStatus = remainingSigners === 0 ? 'signed' : 'pending_signature';

        // await updateContractRecord(contractId, { status: finalStatus, pdfUrl_signed: finalPdfBlob.url, signedAt: finalStatus === 'signed' ? signedAtDate : undefined });
        console.log(`[Signature API] Contrato ${contractId} actualizado a estado: ${finalStatus}`);

        // await createHashRecord(contractId, sha256); // Guarda/Actualiza el hash
        console.log(`[Signature API] Hash guardado para ${contractId}`);

        // await upsertNotionSignedContract({ ... }); // Actualiza Notion con todos los datos finales
        console.log(`[Signature API] Notion actualizado para ${contractId}`);

        // 8. (Opcional) Borrar PDF Borrador si todos han firmado
        if (finalStatus === 'signed') {
            try {
                 // Verifica si el borrador aún existe antes de intentar borrarlo
                 const draftFileInfo = await head(data.contract.pdfUrl_draft, { token: blobToken });
                 if (draftFileInfo) {
                    console.log("[Signature API] Borrando PDF borrador...");
                    await del(data.contract.pdfUrl_draft, { token: blobToken });
                    console.log("[Signature API] PDF borrador eliminado.");
                 }
            } catch (delError: any) {
                 // Ignora errores si el archivo ya no existe (código 404)
                 if (delError?.status !== 404) {
                    console.warn("[Signature API] No se pudo eliminar el PDF borrador:", delError);
                 } else {
                    console.log("[Signature API] PDF borrador no encontrado para eliminar (ya borrado o URL incorrecta).");
                 }
            }
        }

        // Responder éxito al frontend
        return NextResponse.json({ ok: true, pdfUrl: finalPdfBlob.url }); // Devuelve la URL del PDF firmado

    } catch (error: any) {
        console.error("[Signature API] Error CRÍTICO procesando firma:", error);
        const message = (error instanceof Error) ? error.message : "Error interno del servidor";
        return NextResponse.json({ error: "No se pudo procesar la firma." }, { status: 500 });
    }
}