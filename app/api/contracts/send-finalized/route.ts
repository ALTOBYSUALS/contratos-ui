// Ruta Completa: /app/api/contracts/send-finalized/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';
import { put } from '@vercel/blob';
import { Resend } from 'resend';
// --- ¡Importa tus funciones REALES de Notion! ---
import { createNotionContract, createNotionSigner } from '@/services/notion';
// --- (Opcional) Importa tu función de email si la separaste ---
// import { sendContractEmail } from '@/services/email';

// --- Configuración Inicial (Leer desde .env) ---
const secret = process.env.JWT_SIGNATURE_SECRET;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || 'Tu App <noreply@tuapp.com>'; // Cambia
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// --- Tipos (Asegúrate que coinciden con tu frontend/Notion) ---
interface ParticipantInput { email: string; name: string; role?: string; }
interface GeneralDataInput { fecha: string; trackTitle: string; jurisdiction: string; lugarDeFirma?: string; }

export async function POST(request: NextRequest) {
    // --- Verificaciones de Configuración ---
    if (!secret || !blobToken || !baseUrl) {
        console.error("SEND-FINALIZED: Faltan variables de entorno críticas (JWT, Blob, Base URL)");
        return NextResponse.json({ error: "Error de configuración del servidor." }, { status: 500 });
    }
     if (!resend) { console.warn("SEND-FINALIZED: Resend no configurado, no se enviarán emails."); }

    let browser = null;
    try {
        const { finalHtmlContent, participants, generalData, contractTitle, localContractId }
            : { finalHtmlContent: string; participants: ParticipantInput[]; generalData: GeneralDataInput; contractTitle: string; localContractId?: string | number; }
            = await request.json();

        if (!finalHtmlContent || !participants || !participants.length || !contractTitle) {
            return NextResponse.json({ error: "Faltan datos esenciales" }, { status: 400 });
        }
        console.log(`[Send Finalized API] Iniciando para: ${contractTitle}`);

        // --- 1. Generar PDF Borrador ---
        console.log("[Send Finalized API] Generando PDF...");
        let pdfBytesDraft;
        try {
            browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
            const page = await browser.newPage();
            await page.setContent(finalHtmlContent, { waitUntil: 'networkidle0' });
            pdfBytesDraft = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '72pt', right: '72pt', bottom: '72pt', left: '72pt' } });
            console.log(`[Send Finalized API] PDF borrador generado (${(pdfBytesDraft.length / 1024).toFixed(1)} KB)`);
        } catch (pdfError: any) { throw new Error(`Fallo al generar PDF: ${pdfError.message}`); }
        finally { if (browser) await browser.close(); }

        // --- 2. Subir PDF Borrador ---
        console.log("[Send Finalized API] Subiendo PDF borrador...");
        const draftPdfPath = `contracts/drafts/${contractTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_draft.pdf`;
        const pdfBufferForUpload = Buffer.from(pdfBytesDraft);
        const { url: draftPdfUrl } = await put(draftPdfPath, pdfBufferForUpload, { access: 'public', contentType: 'application/pdf', token: blobToken });
        console.log("[Send Finalized API] PDF borrador subido a:", draftPdfUrl);

        // --- 3. Crear Registros de Firmantes en Notion (Primero para obtener IDs) ---
        console.log("[Send Finalized API] Creando registros de firmantes en Notion...");
        const signerPageIds: string[] = [];
        const signerTokens: { email: string; token: string; name: string }[] = [];

        // ¡Asegúrate de que MAX_SIGNERS no sea necesario si usas DB separada!
        // const MAX_SIGNERS = 10; // O un límite alto si quieres alguno

        const signerCreationPromises = participants.map(async (participant, index) => {
            // if (index >= MAX_SIGNERS) return; // Quita o ajusta el límite

            // Lógica para coordenadas (ajústala)
            const pageNumber = 0; const signatureWidth = 150; const signatureHeight = 60;
            const posX = 72; const posY = 600 + (index * (signatureHeight + 20));

            const signerInput = {
                contractPageId: "PENDING", // Pondremos el ID del contrato después de crearlo
                email: participant.email,
                name: participant.name,
                role: participant.role,
                pageNumber, posX, posY, signatureWidth, signatureHeight
            };

            // Llama a tu función REAL de services/notion.ts
            const signerRecord = await createNotionSigner(signerInput);

            if (!signerRecord?.id) {
                console.error(`Fallo al crear firmante ${participant.email} en Notion.`);
                // Decide cómo manejar esto: ¿continuar sin este firmante o fallar todo?
                // Por ahora, lo saltamos pero registramos
                return;
            }

            signerPageIds.push(signerRecord.id); // Guarda el ID del firmante creado

            // Generar Token (SIN contractId todavía)
            const tokenPayload = { contractId: "PENDING", signerId: signerRecord.id, email: participant.email };
            const tempToken = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });
            signerTokens.push({ email: participant.email, token: tempToken, name: participant.name }); // Guarda token temporalmente
        });

        await Promise.all(signerCreationPromises);
        console.log("[Send Finalized API] Registros de firmantes creados en Notion:", signerPageIds);

        if (signerPageIds.length !== participants.length) {
             // Manejar caso donde no se crearon todos los firmantes en Notion
             console.error("No todos los firmantes pudieron ser creados en Notion. Abortando.");
             // TODO: Podrías borrar los firmantes que sí se crearon para consistencia
             return NextResponse.json({ error: "Error al configurar uno o más firmantes." }, { status: 500 });
        }


        // --- 4. Crear Registro del Contrato en Notion (ENLAZANDO A FIRMANTES CREADOS) ---
        console.log("[Send Finalized API] Creando registro de contrato en Notion...");
        const contractInput = {
            title: contractTitle,
            pdfUrl_draft: draftPdfUrl,
            templateId: localContractId,
            generalData: generalData,
        };
        // Llama a tu función REAL de services/notion.ts
        const contractRecord = await createNotionContract(contractInput, signerPageIds);

        if (!contractRecord?.id) {
            console.error("Fallo CRÍTICO al crear el registro del contrato en Notion.");
            // TODO: Borrar firmantes creados previamente
            return NextResponse.json({ error: "No se pudo crear el registro principal del contrato." }, { status: 500 });
        }
        const notionContractPageId = contractRecord.id;
        console.log("[Send Finalized API] Registro de contrato creado en Notion:", notionContractPageId);


        // --- 5. Generar Tokens FINALES y Enviar Emails ---
        console.log("[Send Finalized API] Generando tokens finales y enviando emails...");
        const emailPromises = signerTokens.map(async (signerInfo, index) => {
             const signerId = signerPageIds[index]; // Obtiene el ID real del firmante

             // Regenera el token con el ID de contrato CORRECTO
             const finalTokenPayload = { contractId: notionContractPageId, signerId: signerId, email: signerInfo.email };
             const finalSignatureToken = jwt.sign(finalTokenPayload, secret, { expiresIn: '7d' });

             // (Opcional) Actualizar registro Notion Firmante con el token final si tienes esa columna
             // await notion.pages.update({ page_id: signerId, properties: { 'Token Firma': { rich_text:[{text:{content: finalSignatureToken }}] } } });

             const signLink = `${baseUrl}/sign/${finalSignatureToken}`;

              // Enviar Email (si Resend está configurado)
              if (resend && emailFrom && resendApiKey) {
                  try {
                       await resend.emails.send({
                         from: emailFrom,
                         to: signerInfo.email,
                         subject: `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                         html: `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}":</p><p style="margin: 20px 0;"><a href="${signLink}" style="background-color: #4f46e5...etc">Revisar y Firmar Contrato</a></p><p>Link válido por 7 días.</p><p><small>${signLink}</small></p>`,
                       });
                       console.log(`[Send Finalized API] Email enviado a ${signerInfo.email}`);
                   } catch (emailError: any) {
                       console.error(`[Send Finalized API] Error enviando email a ${signerInfo.email}:`, emailError);
                   }
               } else {
                    console.warn(`[Send Finalized API] Email no enviado a ${signerInfo.email} (Resend no config). Link: ${signLink}`);
               }
         });

         await Promise.all(emailPromises);
         console.log("[Send Finalized API] Procesamiento de emails completado.");

        // --- 6. Responder al Frontend ---
        return NextResponse.json({
            message: `Contrato "${contractTitle}" enviado para firma a ${participants.length} participante(s).`,
            contractId: notionContractPageId // ID de Notion del Contrato
        });

    } catch (error: any) {
        console.error("Error CRÍTICO en API /contracts/send-finalized:", error);
        const message = (error instanceof Error) ? error.message : "Error interno";
        return NextResponse.json({ error: `No se pudo procesar el envío: ${message}` }, { status: 500 });
    }
}