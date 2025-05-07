/**
 * Interfaz para la configuración de la aplicación
 */
interface AppConfig {
  // Notion
  notionToken: string;
  notionDbTemplates: string;
  notionDbContracts: string;
  notionDbSigners: string;
  notionDbClients: string | null;

  // Email
  emailProvider: 'resend' | 'nodemailer';
  emailUser: string | null;
  emailPass: string | null;
  resendApiKey: string | null;

  // Almacenamiento
  blobStoreToken: string;
  
  // Seguridad
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // Aplicación
  appUrl: string;
  debugMode: boolean;
  nodeEnv: string;
  
  // Servicios
  serviceMode: 'direct' | 'queue';
  maxRetries: number;
}

// Variables de entorno requeridas (solo para logging, no bloquean el despliegue)
const recommendedEnvVars = [
  'NOTION_TOKEN',
  'NOTION_DB_CONTRACTS',
  'NOTION_DB_SIGNERS',
  'JWT_SECRET',
  'BLOB_STORE_TOKEN',
  'NEXT_PUBLIC_APP_URL'
];

// Variables con valores por defecto si no están definidas
const defaultValues: Partial<Record<keyof AppConfig, any>> = {
  emailProvider: 'resend',
  jwtExpiresIn: '7d',
  debugMode: false,
  serviceMode: 'direct',
  maxRetries: 3,
  notionToken: 'dummy-token-for-deployment',
  notionDbContracts: 'dummy-db-for-deployment',
  notionDbSigners: 'dummy-db-for-deployment',
  jwtSecret: 'dummy-secret-for-deployment',
  blobStoreToken: 'dummy-token-for-deployment',
  appUrl: 'https://example.com'
};

// Función para validar y cargar la configuración
export function loadConfig(): AppConfig {
  // Verificar variables recomendadas (solo advertencia, no bloquea)
  let missingVars = recommendedEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const warnMsg = `Missing recommended environment variables: ${missingVars.join(', ')}`;
    console.warn(warnMsg);
    // Solo registramos una advertencia en lugar de lanzar un error
  }
  
  // Determinar proveedor de email
  let emailProvider: 'resend' | 'nodemailer' = 'resend';
  
  if (process.env.EMAIL_PROVIDER) {
    if (['resend', 'nodemailer'].includes(process.env.EMAIL_PROVIDER)) {
      emailProvider = process.env.EMAIL_PROVIDER as 'resend' | 'nodemailer';
    } else {
      console.warn(`Invalid EMAIL_PROVIDER "${process.env.EMAIL_PROVIDER}", using "resend" as default`);
    }
  }

  // Validar configuración de email según el proveedor
  if (emailProvider === 'resend' && !process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing but email provider is set to "resend"');
  }
  
  if (emailProvider === 'nodemailer' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
    console.warn('EMAIL_USER or EMAIL_PASS is missing but email provider is set to "nodemailer"');
  }
  
  // Construir y devolver la configuración con valores por defecto para las variables faltantes
  const config: AppConfig = {
    // Notion
    notionToken: process.env.NOTION_TOKEN || defaultValues.notionToken as string,
    notionDbTemplates: process.env.NOTION_DB_TEMPLATES || '',
    notionDbContracts: process.env.NOTION_DB_CONTRACTS || defaultValues.notionDbContracts as string,
    notionDbSigners: process.env.NOTION_DB_SIGNERS || defaultValues.notionDbSigners as string,
    notionDbClients: process.env.DATABASE_CLIENTES_ID || null,
    
    // Email
    emailProvider,
    emailUser: process.env.EMAIL_USER || null,
    emailPass: process.env.EMAIL_PASS || null,
    resendApiKey: process.env.RESEND_API_KEY || null,
    
    // Almacenamiento
    blobStoreToken: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_TOKEN || defaultValues.blobStoreToken as string,
    
    // Seguridad
    jwtSecret: process.env.JWT_SECRET || defaultValues.jwtSecret as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || defaultValues.jwtExpiresIn as string,
    
    // Aplicación
    appUrl: process.env.NEXT_PUBLIC_APP_URL || defaultValues.appUrl as string,
    debugMode: process.env.DEBUG_MODE === 'true',
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Servicios
    serviceMode: (process.env.SERVICE_MODE as 'direct' | 'queue') || defaultValues.serviceMode as 'direct' | 'queue',
    maxRetries: parseInt(process.env.MAX_RETRIES || defaultValues.maxRetries!.toString(), 10)
  };
  
  // Log de configuración
  console.debug('App configuration loaded', { 
    config: {
      ...config,
      // No logueamos secretos
      notionToken: '***',
      jwtSecret: '***',
      emailPass: config.emailPass ? '***' : null,
      resendApiKey: config.resendApiKey ? '***' : null,
      blobStoreToken: '***'
    }
  });
  
  return config;
}

// Exportar la configuración como singleton
export const config = loadConfig();

// Función para validar que todas las configuraciones necesarias para una operación específica estén disponibles
export function validateConfigFor(operation: 'notion' | 'email' | 'storage' | 'pdf' | 'jwt'): boolean {
  switch (operation) {
    case 'notion':
      return !!config.notionToken && !!config.notionDbContracts && !!config.notionDbSigners;
    case 'email':
      return (
        (config.emailProvider === 'resend' && !!config.resendApiKey) ||
        (config.emailProvider === 'nodemailer' && !!config.emailUser && !!config.emailPass)
      );
    case 'storage':
      return !!config.blobStoreToken;
    case 'jwt':
      return !!config.jwtSecret;
    case 'pdf':
      return true; // No hay configuración específica para PDF más allá de las dependencias
    default:
      return false;
  }
} 