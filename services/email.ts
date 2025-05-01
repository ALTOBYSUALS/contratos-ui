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
  // Opciones adicionales para Gmail
  tls: {
    rejectUnauthorized: false
  }
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
export async function enviarCorreo(
  to: string | string[], 
  subject: string, 
  text: string, 
  html?: string, 
  attachmentPath?: string
): Promise<boolean> {
  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
      attachments: attachmentPath ? [
        {
          filename: attachmentPath.split('/').pop() || 'contrato.pdf',
          path: attachmentPath,
        }
      ] : undefined
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado:", info.response);
    return true;
    
  } catch (error) {
    console.error("Error enviando email:", error);
    throw error; // Re-lanza para manejo en la capa superior
  }
}

// Puedes añadir más funciones de email si las necesitas aquí