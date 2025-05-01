import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config } from '../lib/config';
import { logger, EmailError, withRetry } from '../lib/error-handling';

/**
 * Interfaz para datos de envío de correo
 */
export interface EmailData {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string;
}

/**
 * Interfaz para adjuntos de correo
 */
export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
}

/**
 * Clase abstracta para proveedores de email
 */
abstract class EmailProvider {
  abstract send(emailData: EmailData): Promise<boolean>;
  abstract isConfigured(): boolean;
}

/**
 * Implementación de Nodemailer como proveedor de email
 */
class NodemailerProvider extends EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  
  constructor() {
    super();
    this.init();
  }
  
  private init(): void {
    if (this.isConfigured()) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.emailUser!,
            pass: config.emailPass!,
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        logger.info('Nodemailer provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Nodemailer provider', error);
        this.transporter = null;
      }
    } else {
      logger.warn('Nodemailer provider not configured (missing EMAIL_USER or EMAIL_PASS)');
    }
  }
  
  public isConfigured(): boolean {
    return !!(config.emailUser && config.emailPass);
  }
  
  public async send(emailData: EmailData): Promise<boolean> {
    if (!this.transporter) {
      throw new EmailError('Nodemailer no está configurado correctamente');
    }
    
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: emailData.from || config.emailUser!,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments?.map(attachment => ({
          filename: attachment.filename,
          path: attachment.path,
          content: attachment.content,
          contentType: attachment.contentType
        }))
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent via Nodemailer', { 
        messageId: info.messageId,
        to: typeof emailData.to === 'string' ? emailData.to : emailData.to.join(', ')
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending email via Nodemailer', error);
      throw new EmailError(`Error enviando email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Implementación de Resend como proveedor de email
 */
class ResendProvider extends EmailProvider {
  private client: Resend | null = null;
  
  constructor() {
    super();
    this.init();
  }
  
  private init(): void {
    if (this.isConfigured()) {
      try {
        this.client = new Resend(config.resendApiKey!);
        logger.info('Resend provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Resend provider', error);
        this.client = null;
      }
    } else {
      logger.warn('Resend provider not configured (missing RESEND_API_KEY)');
    }
  }
  
  public isConfigured(): boolean {
    return !!config.resendApiKey;
  }
  
  public async send(emailData: EmailData): Promise<boolean> {
    if (!this.client) {
      throw new EmailError('Resend no está configurado correctamente');
    }
    
    try {
      // Preparar destinatarios para Resend
      const to = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
      
      // Preparar adjuntos para Resend
      const attachments = emailData.attachments?.map(attachment => {
        if (attachment.content) {
          return {
            filename: attachment.filename,
            content: attachment.content
          };
        } else if (attachment.path) {
          // Resend requiere el contenido del archivo, no la ruta
          throw new EmailError('Resend no soporta adjuntos por ruta, solo por contenido');
        }
        return null;
      }).filter(Boolean) || [];
      
      const response = await this.client.emails.send({
        from: emailData.from || 'onboarding@resend.dev',
        to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        replyTo: emailData.replyTo,
        attachments: attachments as any
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      logger.info('Email sent via Resend', { 
        id: response.data?.id,
        to: to.join(', ')
      });
      
      return true;
    } catch (error) {
      logger.error('Error sending email via Resend', error);
      throw new EmailError(`Error enviando email con Resend: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Servicio de email que elige el proveedor adecuado
 */
class EmailService {
  private primaryProvider: EmailProvider;
  private fallbackProvider: EmailProvider | null = null;
  
  constructor() {
    // Inicializar proveedores según la configuración
    if (config.emailProvider === 'resend') {
      this.primaryProvider = new ResendProvider();
      this.fallbackProvider = new NodemailerProvider();
    } else {
      this.primaryProvider = new NodemailerProvider();
      this.fallbackProvider = new ResendProvider();
    }
    
    // Log del estado de los proveedores
    logger.info('Email service initialized', {
      primaryProvider: config.emailProvider,
      primaryConfigured: this.primaryProvider.isConfigured(),
      fallbackConfigured: this.fallbackProvider?.isConfigured() || false
    });
  }
  
  /**
   * Envía un email con reintentos automáticos y fallback a proveedor secundario
   */
  public async enviarCorreo(emailData: EmailData): Promise<boolean> {
    logger.info('Enviando correo', {
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments?.length
    });
    
    // Verificar que al menos un proveedor esté configurado
    if (!this.primaryProvider.isConfigured() && !this.fallbackProvider?.isConfigured()) {
      logger.error('No hay proveedores de email configurados');
      throw new EmailError('No hay proveedores de email configurados');
    }
    
    return withRetry(
      async () => {
        try {
          // Intentar con el proveedor primario primero
          if (this.primaryProvider.isConfigured()) {
            return await this.primaryProvider.send(emailData);
          }
          
          // Si el primario no está configurado, usar el secundario
          if (this.fallbackProvider?.isConfigured()) {
            logger.warn('Usando proveedor de email secundario debido a que el primario no está configurado');
            return await this.fallbackProvider.send(emailData);
          }
          
          throw new EmailError('No hay proveedores de email disponibles');
        } catch (error) {
          // Si el primario falla y hay fallback disponible, intentar con el fallback
          if (
            error instanceof Error && 
            this.fallbackProvider?.isConfigured() && 
            this.primaryProvider.isConfigured()
          ) {
            logger.warn(`Proveedor primario falló (${error.message}), intentando con fallback`);
            
            try {
              return await this.fallbackProvider.send(emailData);
            } catch (fallbackError) {
              logger.error('Error en proveedor fallback de email', fallbackError);
              throw new EmailError(`Ambos proveedores de email fallaron: ${error.message} / ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
            }
          }
          
          // Re-lanzar el error original si no hay fallback
          throw error;
        }
      },
      {
        retries: 2,
        delay: 1000,
        onRetry: (error, attempt) => {
          logger.warn(`Reintentando envío de email (${attempt}/2)`, { error: error?.message || String(error) });
        }
      }
    );
  }
}

// Exportar una instancia del servicio como singleton
export const emailService = new EmailService();

// También exportar la función original para mantener compatibilidad
export async function enviarCorreo(
  to: string | string[], 
  subject: string, 
  text: string, 
  html?: string, 
  attachmentPath?: string
): Promise<boolean> {
  const emailData: EmailData = {
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
  
  return emailService.enviarCorreo(emailData);
} 