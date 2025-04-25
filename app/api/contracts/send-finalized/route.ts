// Ruta Completa: /app/api/contracts/send-finalized/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';
import { put } from '@vercel/blob';
import { Resend } from 'resend';
import { createNotionContract, createNotionSigner } from '@/services/notion';
import type {GeneralContractData, } from '@/lib/types'; // Asegúrate de importar de /lib

// --- Configuración Inicial (Leer desde .env) ---
// NOTA: Usa '!' solo si estás MUY seguro que la variable existe tras el check inicial
// Es más seguro manejar el caso donde pueda ser undefined si algo falla al leer .env
const secret = process.env.JWT_SECRET;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN; // Necesario para desarrollo si NO usas 'vercel dev'
const baseUrl = process.env.BASE_URL; // Necesario para el link de firma
const resendApiKey = process.env.RESEND_API_KEY; // Necesario si usas Resend
const emailFrom = process.env.EMAIL_FROM || 'Tu App <noreply@tuapp.com>';

// Inicializa Resend solo si la API Key existe
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// --- Tipos (Mejor si vienen de lib/types) ---
interface ParticipantInput { email: string; name: string; role?: string; }
// Asegúrate que GeneralContractData esté definida o importada
// interface GeneralDataInput { fecha: string; trackTitle: string; jurisdiction: string; lugarDeFirma?: string; }


export async function POST(request: NextRequest) {
    console.log(`[Send Finalized API] Recibida petición POST`);

    // --- Verificaciones de Configuración Críticas ---
    if (!secret) {
        console.error("SEND-FINALIZED: Falta JWT_SECRET en .env");
        return NextResponse.json({ error: "Error crítico de configuración del servidor (JWT)." }, { status: 500 });
    }
    // BLOB_READ_WRITE_TOKEN es manejado por Vercel en producción, pero necesario para 'put' localmente si no usas 'vercel dev'
    // if (!blobToken) {
    //     console.error("SEND-FINALIZED: Falta BLOB_READ_WRITE_TOKEN en .env (para desarrollo local sin 'vercel dev')");
    //     return NextResponse.json({ error: "Error crítico de configuración del servidor (Blob)." }, { status: 500 });
    // }
    if (!baseUrl) {
        console.error("SEND-FINALIZED: Falta BASE_URL en .env");
        return NextResponse.json({ error: "Error crítico de configuración del servidor (URL)." }, { status: 500 });
    }
     if (!resend) {
        console.warn("SEND-FINALIZED: Resend no configurado (falta RESEND_API_KEY), no se enviarán emails.");
        // Considera si quieres detener el proceso aquí o solo advertir
        // return NextResponse.json({ error: "Configuración de envío de email incompleta." }, { status: 500 });
     }

    let browser = null;
    try {
        const { finalHtmlContent, participants, generalData, contractTitle, localContractId }
            = await request.json() as {
                finalHtmlContent: string;
                participants: ParticipantInput[];
                generalData: GeneralContractData; // Usa el tipo importado
                contractTitle: string;
                localContractId?: string | number;
            };

        if (!finalHtmlContent || !participants || participants.length === 0 || !contractTitle || !generalData) {
            return NextResponse.json({ error: "Faltan datos esenciales en la solicitud (HTML, participantes, título, datos generales)." }, { status: 400 });
        }
        console.log(`[Send Finalized API] Iniciando para: ${contractTitle}`);

        // --- 1. Generar PDF Borrador ---
        console.log("[Send Finalized API] Generando PDF...");
        let pdfBytesDraft;
        try {
            // Añade opciones recomendadas para entornos serverless/contenedores
            browser = await puppeteer.launch({
                 headless: true,
                 args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // Importante en muchos entornos cloud/contenedores
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    // '--single-process', // Descomenta si sigue fallando en Vercel (menos eficiente)
                    '--disable-gpu'
                 ]
             });
            const page = await browser.newPage();
            await page.setContent(finalHtmlContent, { waitUntil: 'networkidle0' });
            // Opcional: añadir CSS básico
            // await page.addStyleTag({content: 'body { font-family: sans-serif; }'});
            pdfBytesDraft = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '72pt', right: '72pt', bottom: '72pt', left: '72pt' } });
            console.log(`[Send Finalized API] PDF borrador generado (${pdfBytesDraft ? (pdfBytesDraft.length / 1024).toFixed(1) : 0} KB)`);
            if (!pdfBytesDraft) throw new Error("Puppeteer no generó el buffer del PDF.");

        } catch (pdfError: unknown) { // <-- CORREGIDO: unknown
            console.error("[Send Finalized API] Error generando PDF:", pdfError);
            let errorMsg = "Fallo desconocido al generar PDF.";
            if (pdfError instanceof Error) { errorMsg = pdfError.message; }
            else if (typeof pdfError === 'string') { errorMsg = pdfError; }
            throw new Error(`Fallo al generar PDF: ${errorMsg}`); // Relanzar para el catch principal
        } finally {
             if (browser) await browser.close();
             console.log("[Send Finalized API] Navegador Puppeteer cerrado.");
        }

        // --- 2. Subir PDF Borrador ---
        console.log("[Send Finalized API] Subiendo PDF borrador...");
        const draftPdfPath = `contracts/drafts/${contractTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_draft.pdf`;
        const pdfBufferForUpload = Buffer.from(pdfBytesDraft); // Asegura que sea Buffer
        // Usa el token explícitamente si no usas 'vercel dev' o si falla la inyección automática
        const blobOptions: { access: 'public'; contentType: string; token?: string } = {
             access: 'public',
             contentType: 'application/pdf'
         };
         if (blobToken) { blobOptions.token = blobToken; } // Añadir token si existe (para dev local sin 'vercel dev')

        const { url: draftPdfUrl } = await put(draftPdfPath, pdfBufferForUpload, blobOptions);
        console.log("[Send Finalized API] PDF borrador subido a:", draftPdfUrl);

        // --- 3. Crear Registros de Firmantes en Notion (Primero para obtener IDs) ---
        console.log("[Send Finalized API] Creando registros de firmantes en Notion...");
        const signerPageIds: string[] = [];
        const signerTokens: { email: string; token: string; name: string }[] = [];

        const signerCreationPromises = participants.map(async (participant, index) => {
            // Lógica para coordenadas (ajústala según necesites)
            const pageNumber = 1; // Asumiendo página 1 por defecto
            const signatureWidth = 150; const signatureHeight = 50;
            const posX = 72; // Margen izquierdo
            // Calcula Y desde abajo para pdf-lib: Margen Inferior + espacio entre firmas + altura firma
            const posYFromBottom = 72 + (index * (signatureHeight + 20));
            // Nota: Esto es un cálculo SIMPLIFICADO. La Y real depende del alto de la página.
            // La Y que guardamos aquí es la 'posY' que espera createNotionSigner (ej. desde arriba).
            // ¡NECESITARÁS AJUSTAR ESTO O CALCULARLO MEJOR EN LA PÁGINA DE FIRMA!
            const posY = 680 - (index * (signatureHeight + 20)); // Estimación MUY básica desde arriba en A4 (842pt)

            const signerInput = {
                contractPageId: "PENDING", // Se actualiza después si es necesario (o pasa ID después)
                email: participant.email,
                name: participant.name,
                role: participant.role,
                pageNumber, posX, posY, signatureWidth, signatureHeight
            };

            const signerRecord = await createNotionSigner(signerInput); // Llama a la función del servicio

            if (!signerRecord?.id) {
                console.error(`Fallo al crear firmante ${participant.email} en Notion.`);
                return; // O lanza un error para detener todo
            }

            signerPageIds.push(signerRecord.id);

            // Generar Token (SIN contractId todavía, o con uno PENDING)
            const tokenPayload = { contractId: "PENDING", signerId: signerRecord.id, email: participant.email };
            const tempToken = jwt.sign(tokenPayload, secret, { expiresIn: '7d' }); // Usa la variable 'secret' ya validada
            signerTokens.push({ email: participant.email, token: tempToken, name: participant.name });
        });

        await Promise.all(signerCreationPromises);
        console.log("[Send Finalized API] Registros de firmantes creados en Notion:", signerPageIds);

        if (signerPageIds.length !== participants.length) {
             console.error("No todos los firmantes pudieron ser creados en Notion. Abortando.");
             // TODO: Lógica para borrar firmantes creados si falla uno
             return NextResponse.json({ error: "Error al configurar uno o más firmantes." }, { status: 500 });
        }

        // --- 4. Crear Registro del Contrato en Notion ---
        console.log("[Send Finalized API] Creando registro de contrato en Notion...");
        const contractInput = {
            title: contractTitle,
            pdfUrl_draft: draftPdfUrl,
            templateId: localContractId, // Asumiendo que viene del frontend
            generalData: generalData,
        };
        const contractRecord = await createNotionContract(contractInput, signerPageIds); // Pasa los IDs de los firmantes

        if (!contractRecord?.id) {
            console.error("Fallo CRÍTICO al crear el registro del contrato en Notion.");
            // TODO: Borrar firmantes creados
            return NextResponse.json({ error: "No se pudo crear el registro principal del contrato." }, { status: 500 });
        }
        const notionContractPageId = contractRecord.id;
        console.log("[Send Finalized API] Registro de contrato creado en Notion:", notionContractPageId);


        // --- 5. Generar Tokens FINALES y Enviar Emails ---
        console.log("[Send Finalized API] Generando tokens finales y enviando emails...");
        const emailPromises = signerTokens.map(async (signerInfo, index) => {
             const signerId = signerPageIds[index]; // ID real del firmante

             // Regenera el token con el ID de contrato CORRECTO
             const finalTokenPayload = { contractId: notionContractPageId, signerId: signerId, email: signerInfo.email };
             const finalSignatureToken = jwt.sign(finalTokenPayload, secret, { expiresIn: '7d' }); // Usa 'secret'

             const signLink = `${baseUrl}/sign/${finalSignatureToken}`; // Usa 'baseUrl'

              // Enviar Email (SOLO si Resend está configurado)
              if (resend) {
                  try {
                       await resend.emails.send({
                         from: emailFrom,
                         to: signerInfo.email,
                         subject: `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                         // TODO: Considera usar @react-email para plantillas HTML más robustas
                         html: `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p><p>Este enlace es único para ti y expirará en 7 días.</p><p>Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:</p><p><small>${signLink}</small></p>`,
                       });
                       console.log(`[Send Finalized API] Email enviado a ${signerInfo.email}`);
                   } catch (emailError: unknown) { // <-- CORREGIDO: unknown
                       console.error(`[Send Finalized API] Error enviando email a ${signerInfo.email}:`, emailError);
                       // Log más detallado si es un Error
                       if (emailError instanceof Error) {
                            console.error(`[Send Finalized API] Detalle error email: ${emailError.message}`);
                       }
                       // Decide si quieres continuar o fallar si un email no se envía
                   }
               } else {
                    // Si Resend no está configurado, al menos muestra el link en consola para pruebas
                    console.warn(`[Send Finalized API] Email no enviado a ${signerInfo.email} (Resend no config). Link de firma (para pruebas): ${signLink}`);
               }
         });

         await Promise.all(emailPromises);
         console.log("[Send Finalized API] Procesamiento de emails completado.");

        // --- 6. Responder al Frontend ---
        return NextResponse.json({
            success: true, // Añadir success flag
            message: `Contrato "${contractTitle}" enviado para firma a ${participants.length} participante(s).`,
            contractId: notionContractPageId
        });

    } catch (error: unknown) { // <-- CORREGIDO: unknown
        console.error("Error CRÍTICO en API /contracts/send-finalized:", error);
        // --- VERIFICACIÓN DE TIPO ---
        let errorMessage = "Error interno del servidor al procesar el envío."; // Mensaje por defecto
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        // --- FIN VERIFICACIÓN ---
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}