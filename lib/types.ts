// En: lib/types.ts
// Definiciones de tipos centrales para la aplicación de contratos

// --- Tipos relacionados con Contratos Generales y Plantillas ---

export interface GeneralContractData {
    template_id: string;
    trackTitle: string;
    fecha: string; // O Date si prefieres y formateas al mostrar/enviar
    lugarDeFirma?: string;
    jurisdiction: string;
    areaArtistica?: string;
    porcentajeComision?: string | number; // string si se permite '%' en el input, number si es solo el valor
    duracionContrato?: string;
    periodoAviso?: string;
    
    // ✅ NUEVOS CAMPOS PARA PLACEHOLDERS ADICIONALES (de las imágenes):
    montoFee?: string | number;      // → [MontoFee] - Monto de la comisión
    fechaEntrega?: string;           // → [FechaEntrega] - Fecha de entrega del proyecto
  }
  
  export interface Template {
    id: string | number; // Puede venir de Notion como string o DB como number
    title: string;
    category: string;
    description: string;
    content: string; // Contenido HTML de la plantilla
  }
  
  export interface SentContract {
    id: number | string;
    title: string;
    content: string; // El contenido final que se envió
    participants: ParticipantFinal[]; // Usamos el tipo ParticipantFinal
    date: string; // Fecha ISO de envío
    status?: string; // Ej: 'Enviado', 'Firmado Parcialmente', 'Firmado', 'Rechazado'
    notionPageId?: string; // ID de la página en Notion si se crea/vincula
  }
  
  // --- Tipos relacionados con Clientes/Participantes ---
  
  export interface Client {
    id: string;
    name: string; // Nombre a mostrar (puede ser FullName o email si no hay nombre)
    firstName: string;
    lastName: string;
    email: string; // Campo clave para identificar participantes
    phone?: string;
    role?: string; // Ej: 'Artist', 'Producer', 'Label', etc.
    publisherIpi?: string; // IPI/CAE del publisher
    managementSociety?: string; // Sociedad de gestión (SGAE, ASCAP, BMI, etc.)
    dateOfBirth?: string;
    passport?: string; // DNI/Pasaporte
    expirationDate?: string; // Fecha expiración documento
    address?: string;
    country?: string;
    added?: string; // Fecha ISO de creación/añadido
    // Redes Sociales
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    // Datos Sello (si aplica)
    labelName?: string;
    labelEmail?: string;
    labelPhone?: string;
    labelAddress?: string;
    labelCountry?: string;
    // Datos Editorial (si aplica)
    publisherName?: string;
    publisherEmail?: string;
    publisherPhone?: string;
    publisherAddress?: string;
    publisherCountry?: string;
    // Campos Calculados (se generan en createClientObject)
    FullName: string; // Nombre completo calculado
    Firma: string;    // Placeholder de firma calculado
  }
  
  export interface ParticipantFinal { // Para listas de participantes en contratos enviados/finalizados
      email: string;
      name: string;
      role: string;
      percentage: number; // Asegurarse que siempre tenga un valor numérico
      // Podrías añadir clientId si lo necesitas vincular: clientId?: string;
  }
  
  
  // --- Tipos relacionados con el Proceso de Firma ---
  
  export interface SignerInfo {
      id: string; // ID único del registro del firmante (ej: ID de página Notion)
      name: string;
      email: string;
      signedAt: string | null; // Fecha ISO de firma o null
      // Coordenadas y tamaño para estampar la firma en el PDF final
      pageNumber: number; // Página donde va la firma
      posX: number;       // Posición X (desde la izquierda)
      posY: number;       // Posición Y (¡IMPORTANTE! Define si es desde arriba o abajo de la página)
      signatureWidth: number;
      signatureHeight: number;
  }
  
  export interface ContractInfo {
      id: string; // ID único del contrato (ej: ID de página Notion)
      title: string;
      pdfUrl_draft: string | null; // URL (Vercel Blob?) del PDF *sin firmar* que se muestra
      pdfUrl_signed?: string | null; // URL del PDF *firmado* (se actualiza al completar)
      status?: string; // 'EnviadoParaFirma', 'Firmado', etc.
  }
  
  // Tipo combinado usado por la API para devolver datos a la página de firma
  export type SignerAndContractDataResult = {
      signer: SignerInfo;
      contract: ContractInfo;
  };
  
  // Props para el componente cliente de la página de firma
  export interface SignatureClientProps {
      token: string;          // El token JWT de la URL
      signerName: string;     // Nombre del firmante (obtenido del token o API)
      contractPdfUrl: string; // URL del PDF borrador (obtenido de la API)
      // Añadir más props según sea necesario desde page.tsx
  }
  
  // --- FIN --- Puedes añadir otros tipos/interfaces aquí si los necesitas ---