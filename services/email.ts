// ARCHIVO: services/email.ts
import nodemailer from 'nodemailer';
// import fs from 'fs/promises'; // Descomenta si necesitas borrar adjuntos

// Asegúrate que EMAIL_USER y EMAIL_PASS estén en .env.local de este proyecto
const transporter = nodemailer.createTransport({
  service: 'gmail', // O tu proveedor
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Recuerda usar contraseña de aplicación si es Gmail con 2FA
  },
});

/**
 * Envía un correo electrónico.
 * @param to Destinatario(s) (puede ser string o array de strings)
 * @param subject Asunto
 * @param text Cuerpo del correo (texto plano)
 * @param html Cuerpo del correo (HTML, opcional)
 * @param attachmentPath Ruta al archivo adjunto (opcional)
 * @returns Promise<boolean> - true si se envió (o al menos se aceptó para envío), lanza error si falla.
 */
export async function enviarCorreo(to: string | string[], subject: string, text: string, html?: string, attachmentPath?: string): Promise<boolean> {
  console.log(`[Email Service] Preparando correo para: ${Array.isArray(to) ? to.join(', ') : to}, Asunto: ${subject}`);

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"MVPX Contracts" <${process.env.EMAIL_USER}>`, // Personaliza el nombre del remitente
    to, // Puede ser un string o un array
    subject,
    text,
  };

  if (html) {
    mailOptions.html = html;
  }

  if (attachmentPath) {
    mailOptions.attachments = [{ path: attachmentPath }];
    console.log(`[Email Service] Adjuntando archivo: ${attachmentPath}`);
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Correo enviado (o en cola). Message ID: ${info.messageId}`);

    // // Descomenta si necesitas borrar adjuntos y has importado fs
    // if (attachmentPath) {
    //   await fs.unlink(attachmentPath).catch(err => console.error(`[Email Service] Error borrando adjunto ${attachmentPath}:`, err));
    // }
    return true; // Indica éxito

  } catch (error) {
    console.error(`[Email Service] Error enviando correo a ${Array.isArray(to) ? to.join(', ') : to}:`, error);
    // Relanzamos el error para que el catch que llama a esta función (en la API route) lo maneje
    throw error;
  }
}

// Puedes añadir más funciones de email si las necesitas aquí