// Ruta Completa: /app/api/contracts/send-finalized/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
// --- NUEVAS IMPORTACIONES PARA PDF-LIB EN LUGAR DE PUPPETEER ---
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { put } from '@vercel/blob';
import { Resend } from 'resend';
import type { GeneralContractData } from '@/lib/types';
import { enviarCorreo } from '@/services/email';
import { config } from '@/lib/config';
import { createPdfWithContent } from '@/lib/pdf-generator';
import { unifiedNotion } from '@/services/notion-unified';

// --- Configuración Inicial (Leer desde .env) ---
// NOTA: Usa '!' solo si estás MUY seguro que la variable existe tras el check inicial
// Es más seguro manejar el caso donde pueda ser undefined si algo falla al leer .env
const secret = process.env.JWT_SECRET;
const blobToken = config.blobStoreToken; // Usar el token desde config
// Usar NEXT_PUBLIC_APP_URL en lugar de BASE_URL para mayor consistencia
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000';
const resendApiKey = process.env.RESEND_API_KEY; // Necesario si usas Resend
const emailFrom = process.env.EMAIL_FROM || 'Tu App <noreply@tuapp.com>';

// Inicializa Resend solo si la API Key existe
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// --- Cambiar la configuración por defecto del proveedor a Nodemailer ---
// Forzar el uso de Nodemailer en lugar de Resend para volver al comportamiento anterior
const useNodemailer = true;

// --- Tipos (Mejor si vienen de lib/types) ---
interface ParticipantInput { email: string; name: string; role?: string; }
// Asegúrate que GeneralContractData esté definida o importada
// interface GeneralDataInput { fecha: string; trackTitle: string; jurisdiction: string; lugarDeFirma?: string; }

// Eliminada función duplicada - ahora se usa la importada desde @/lib/pdf-generator

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

        // --- 1. Generar PDF Borrador con pdf-lib ---
        console.log("[Send Finalized API] Generando PDF simple...");
        
        try {
            // Usar pdf-lib para crear PDF con contenido real
            const pdfBytesDraft = await createPdfWithContent(finalHtmlContent, contractTitle);
            console.log(`[Send Finalized API] PDF borrador generado (${pdfBytesDraft ? (pdfBytesDraft.length / 1024).toFixed(1) : 0} KB`);
            
            // --- 2. Subir PDF Borrador ---
            console.log("[Send Finalized API] Subiendo PDF borrador...");
            const draftPdfPath = `contracts/drafts/${contractTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}_draft.pdf`;
            
            // Define las opciones incluyendo el token
            const blobOptions = {
              access: 'public' as const,
              token: blobToken // Pasar el token explícitamente
            };

            // Llama a put con las opciones actualizadas
            const { url: draftPdfUrl } = await put(draftPdfPath, pdfBytesDraft, blobOptions);
            console.log("[Send Finalized API] PDF borrador subido a:", draftPdfUrl);

            // --- 3. Crear Registro del Contrato en Notion (PRIMERO) ---
            console.log("[Send Finalized API] Creando registro de contrato en Notion...");
            const contractInput = {
                title: contractTitle,
                pdfUrl_draft: draftPdfUrl,
                templateId: localContractId, // Asumiendo que viene del frontend
                generalData: generalData,
            };
            const contractRecord = await unifiedNotion.createContract({
                title: contractInput.title,
                pdfUrl_draft: contractInput.pdfUrl_draft,
                signerIds: [] // Inicialmente vacío, se actualiza después
            });

            if (!contractRecord) {
                console.error("Fallo CRÍTICO al crear el registro del contrato en Notion.");
                return NextResponse.json({ error: "No se pudo crear el registro principal del contrato." }, { status: 500 });
            }
            const notionContractPageId = contractRecord;
            console.log("[Send Finalized API] Registro de contrato creado en Notion:", notionContractPageId);

            // --- 4. Crear Registros de Firmantes en Notion (DESPUÉS del contrato) ---
            console.log("[Send Finalized API] Creando registros de firmantes en Notion...");
            const signerPageIds: string[] = [];
            const signerTokens: { email: string; token: string; name: string }[] = [];

            const signerCreationPromises = participants.map(async (participant, index) => {
                // Lógica para coordenadas (ajústala según necesites)
                const pageNumber = 1; // Asumiendo página 1 por defecto
                const signatureWidth = 150; const signatureHeight = 50;
                const posX = 72; // Margen izquierdo
                const posY = 680 - (index * (signatureHeight + 20)); // Estimación desde arriba en A4

                const signerInput = {
                    contractId: notionContractPageId, // USAR EL ID REAL DEL CONTRATO
                    email: participant.email,
                    name: participant.name,
                    pageNumber, 
                    posX, 
                    posY, 
                    width: signatureWidth, 
                    height: signatureHeight
                };

                const signerRecordId = await unifiedNotion.createSigner(signerInput);

                if (!signerRecordId) {
                    console.error(`Fallo al crear firmante ${participant.email} en Notion.`);
                    return; // O lanza un error para detener todo
                }

                signerPageIds.push(signerRecordId);

                // Generar Token con el contractId REAL
                const tokenPayload = { contractId: notionContractPageId, signerId: signerRecordId, email: participant.email };
                const tempToken = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });
                signerTokens.push({ email: participant.email, token: tempToken, name: participant.name });
            });

            await Promise.all(signerCreationPromises);
            console.log("[Send Finalized API] Registros de firmantes creados en Notion:", signerPageIds);

            if (signerPageIds.length !== participants.length) {
                 console.error("No todos los firmantes pudieron ser creados en Notion. Abortando.");
                 return NextResponse.json({ error: "Error al configurar uno o más firmantes." }, { status: 500 });
            }

            // --- 5. Enviar Emails a los Firmantes ---
            console.log("[Send Finalized API] Enviando emails a los firmantes...");
            
            // AÑADIR INFORMACIÓN DE DEPURACIÓN
            console.log("[Send Finalized API DEBUG] Configuración de email:", { 
              provider: useNodemailer ? 'nodemailer' : config.emailProvider,
              resendConfigured: !!resend,
              baseUrl,
              from: emailFrom,
              participantsCount: participants.length,
              appUrl: process.env.NEXT_PUBLIC_APP_URL || 'no configurado',
              usingNodemailer: useNodemailer
            });
            
            const emailPromises = signerTokens.map(async (signerInfo, index) => {
                 const signLink = `${baseUrl}/sign/${signerInfo.token}`;

                 // Añadir antes del bloque de envío:
                 if (!signerInfo.email || !signerInfo.email.includes('@')) {
                     console.error(`[Send Finalized API] Email inválido para ${signerInfo.name}: ${signerInfo.email}`);
                     return; // Retornar temprano en lugar de continue
                 }

                 // Si forzamos Nodemailer o Resend no está configurado, usar Nodemailer directamente
                 if (useNodemailer || !resend) {
                     try {
                         await enviarCorreo(
                             signerInfo.email,
                             `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                             `Hola ${signerInfo.name}, Por favor firma el contrato "${contractTitle}" en: ${signLink}`,
                             `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p><p>Este enlace es único para ti y expirará en 7 días.</p><p>Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:</p><p><small>${signLink}</small></p>`
                         );
                         console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Nodemailer (principal)`);
                     } catch (nodemailerError) {
                         console.error(`[Send Finalized API] Error con Nodemailer:`, nodemailerError);
                         
                         // Si Nodemailer falla y Resend está disponible, intentar con Resend como fallback
                         if (resend) {
                             try {
                                 await resend.emails.send({
                                   from: emailFrom,
                                   to: signerInfo.email,
                                   subject: `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                                   html: `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p><p>Este enlace es único para ti y expirará en 7 días.</p><p>Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:</p><p><small>${signLink}</small></p>`,
                                 });
                                 console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Resend (fallback)`);
                             } catch (resendError) {
                                 console.error(`[Send Finalized API] Error también con Resend como fallback:`, resendError);
                                 // Ambos métodos fallaron
                             }
                         }
                     }
                 } else {
                     // Usar Resend como principal si está configurado y no estamos forzando Nodemailer
                     try {
                         await resend.emails.send({
                           from: emailFrom,
                           to: signerInfo.email,
                           subject: `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                           html: `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p><p>Este enlace es único para ti y expirará en 7 días.</p><p>Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:</p><p><small>${signLink}</small></p>`,
                         });
                         console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Resend`);
                     } catch (emailError: unknown) {
                         console.error(`[Send Finalized API] Error con Resend:`, emailError);
                         // FALLBACK A NODEMAILER
                         try {
                             await enviarCorreo(
                                 signerInfo.email,
                                 `Acción Requerida: Firmar Contrato - ${contractTitle}`,
                                 `Hola ${signerInfo.name}, Por favor firma el contrato "${contractTitle}" en: ${signLink}`,
                                 `<p>Hola ${signerInfo.name},</p><p>Por favor, revisa y firma el contrato "${contractTitle}" haciendo clic en el siguiente enlace:</p><p style="margin: 20px 0;"><a href="${signLink}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Revisar y Firmar Contrato</a></p><p>Este enlace es único para ti y expirará en 7 días.</p><p>Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:</p><p><small>${signLink}</small></p>`
                             );
                             console.log(`[Send Finalized API] Email enviado a ${signerInfo.email} con Nodemailer (fallback)`);
                         } catch (nodemailerError) {
                             console.error(`[Send Finalized API] Error también con Nodemailer:`, nodemailerError);
                             // Aquí ambos métodos fallaron
                         }
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
        } catch (pdfError) {
            console.error("Error generando PDF:", pdfError);
            return NextResponse.json({ 
                error: `Error generando PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}` 
            }, { status: 500 });
        }

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
/*
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
*/