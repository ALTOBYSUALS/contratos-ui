// Ruta Completa: /app/api/contracts/send-finalized/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';
import { put } from '@vercel/blob';
import { Resend } from 'resend';
import { createNotionContract, createNotionSigner } from '@/services/notion';
import type {GeneralContractData, } from '@/lib/types'; // Asegúrate de importar de /lib
import { enviarCorreo } from '@/services/email';
import os from 'os';
import path from 'path';

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

        // --- ESTA ES LA VALIDACIÓN CLAVE ---
        if (!finalHtmlContent || !participants || participants.length === 0 || !contractTitle || !generalData
            // --- ¿HAY VALIDACIONES ADICIONALES AQUÍ O DENTRO DE generalData? ---
            // || !generalData.jurisdiction // Ejemplo: ¿Es jurisdicción obligatoria?
            // || !generalData.fecha
           ) {
            console.error("[Send Finalized API] Validation Failed:", { hasHtml: !!finalHtmlContent, numParticipants: participants?.length, hasTitle: !!contractTitle, hasGeneralData: !!generalData }); // Log detallado del fallo
            return NextResponse.json({ error: "Faltan datos esenciales en la solicitud (HTML, participantes, título, datos generales)." }, { status: 400 });
        }
        // --- FIN VALIDACIÓN ---
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
            pdfBytesDraft = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' } });
            console.log(`[Send Finalized API] PDF borrador generado (${pdfBytesDraft ? (pdfBytesDraft.length / 1024).toFixed(1) : 0} KB`);
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
            // const posYFromBottom = 72 + (index * (signatureHeight + 20));
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

        // 3. Guardar el contrato en la base de datos
        // Nota: El contrato ya fue guardado en Notion con createNotionContract
        // Si necesitas esta funcionalidad, implementa 'guardarContratoEnNotion' en @/services/notion

        // --- 5. Generar Tokens FINALES y Enviar Emails ---
        console.log("[Send Finalized API] Generando tokens finales y enviando emails...");
        const emailPromises = signerTokens.map(async (signerInfo, index) => {
             const signerId = signerPageIds[index]; // ID real del firmante

             // Regenera el token con el ID de contrato CORRECTO
             const finalTokenPayload = { contractId: notionContractPageId, signerId: signerId, email: signerInfo.email };
             const finalSignatureToken = jwt.sign(finalTokenPayload, secret, { expiresIn: '7d' }); // Usa 'secret'

             const signLink = `${baseUrl}/sign/${finalSignatureToken}`; // Usa 'baseUrl'

             // Añadir antes del bloque de envío:
             if (!signerInfo.email || !signerInfo.email.includes('@')) {
                 console.error(`[Send Finalized API] Email inválido para ${signerInfo.name}: ${signerInfo.email}`);
                 return; // Retornar temprano en lugar de continue
             }

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
                       console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Resend`);
                   } catch (emailError: unknown) {
                       console.error(`[Send Finalized API] Error con Resend:`, emailError);
                       // NUEVO: FALLBACK A NODEMAILER
                       try {
                           await enviarCorreo(
                               signerInfo.email,
                               `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                               `Hola ${signerInfo.name}, Por favor firma el contrato "${contractTitle}" en: ${signLink}`,
                               `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p>`
                           );
                           console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Nodemailer (fallback)`);
                       } catch (nodemailerError) {
                           console.error(`[Send Finalized API] Error también con Nodemailer:`, nodemailerError);
                           // Aquí ambos métodos fallaron
                       }
                   }
               } else {
                   // Si Resend no está configurado, usar directamente Nodemailer
                   try {
                       await enviarCorreo(
                           signerInfo.email,
                           `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                           `Hola ${signerInfo.name}, Por favor firma el contrato "${contractTitle}" en: ${signLink}`,
                           `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p>`
                       );
                       console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Nodemailer`);
                   } catch (nodemailerError) {
                       console.error(`[Send Finalized API] Error con Nodemailer:`, nodemailerError);
                   }
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

// Función auxiliar para generar el PDF del contrato
async function generateContractPDF(htmlContent: string, title: string): Promise<string> {
  // Crear un nombre de archivo seguro
  const safeTitle = title.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
  const tempDir = os.tmpdir();
  const pdfPath = path.join(tempDir, `${safeTitle}_${Date.now()}.pdf`);
  
  // Lanzar puppeteer para generar el PDF
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    headless: true
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Añadir estilos para mejorar la apariencia del PDF
  await page.addStyleTag({
    content: `
      body { font-family: Georgia, serif; line-height: 1.6; }
      h1 { font-size: 18pt; text-align: center; }
      h2 { font-size: 14pt; }
    `
  });
  
  // Generar el PDF
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1cm',
      right: '1cm',
      bottom: '1cm',
      left: '1cm',
    },
  });
  
  await browser.close();
  return pdfPath;
}