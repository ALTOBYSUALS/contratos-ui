// En: lib/types.ts

// Asegúrate de que CADA interfaz/tipo que uses fuera de este archivo tenga 'export'

export interface ParticipantFinal { // Ya la tenías, asegúrate que tenga 'export'
    email: string;
    name: string;
    role: string;
    percentage: number;
  }
  
  export interface GeneralContractData { // Ya la tenías, añade los nuevos campos opcionales
    jurisdiction: string;
    fecha: string;
    trackTitle: string;
    lugarDeFirma?: string;
    // --- CAMPOS OPCIONALES AÑADIDOS ---
    areaArtistica?: string;
    duracionContrato?: string;
    periodoAviso?: string;
    // --- FIN DE CAMPOS AÑADIDOS ---
  }
  
  // --- ASEGÚRATE QUE ESTAS TAMBIÉN TENGAN 'export' ---
  
  export interface Client { // Necesaria para 'clients' y 'createClientObject'
      id: string;
      name: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      role?: string;
      publisherIpi?: string;
      dateOfBirth?: string;
      passport?: string;
      expirationDate?: string;
      address?: string;
      country?: string;
      added?: string;
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
      labelName?: string;
      labelEmail?: string;
      labelPhone?: string;
      labelAddress?: string;
      labelCountry?: string;
      publisherName?: string;
      publisherEmail?: string;
      publisherPhone?: string;
      publisherAddress?: string;
      publisherCountry?: string;
      FullName: string;
      Firma: string;
  }
  
  export interface Template { // Necesaria para 'templates' y 'selectedContract'
      id: string | number;
      title: string;
      category: string;
      description: string;
      content: string;
  }
  
  export type SentContract = { // Necesaria para 'sentContracts'
      id: number | string;
      title: string;
      content: string;
      participants: { name: string; email: string; role: string; percentage?: number }[];
      date: string;
      status?: string;
      notionPageId?: string;
  };
  
  // Puedes tener otros tipos exportados aquí también...
  // En: lib/types.ts

// ... (tus interfaces existentes: ParticipantFinal, GeneralContractData, Client, Template, SentContract) ...

// --- AÑADIR ESTAS DEFINICIONES ---

export interface SignerInfo {
    id: string; // ID de la página Notion del firmante
    name: string;
    email: string;
    signedAt: string | null; // Fecha ISO de firma o null si no ha firmado
    // Coordenadas y tamaño para colocar la firma en el PDF
    pageNumber: number;
    posX: number;
    posY: number; // Posición Y desde la parte SUPERIOR de la página (como se podría guardar en Notion)
    signatureWidth: number;
    signatureHeight: number;
}

export interface ContractInfo {
    id: string; // ID de la página Notion del contrato
    title: string;
    pdfUrl_draft: string | null; // URL del PDF borrador en Vercel Blob
    pdfUrl_signed?: string | null; // URL del PDF firmado (opcional, se rellena al final)
    status?: string; // Estado actual del contrato (ej: 'EnviadoParaFirma', 'Firmado')
}

// Tipo que combina la información para la página de firma
export type SignerAndContractDataResult = {
    signer: SignerInfo;
    contract: ContractInfo;
};

// --- FIN DE LAS DEFINICIONES A AÑADIR ---

// Puedes tener otros tipos aquí...
// En /lib/types.ts

// ... (Otras interfaces: Client, Template, SentContract, SignerInfo, etc.) ...

// --- AÑADIR O ASEGURARSE DE QUE ESTO ESTÉ EXPORTADO ---
export interface SignatureClientProps {
    token: string;          // El token JWT de la URL
    signerName: string;     // Nombre del firmante para mostrar
    contractPdfUrl: string; // URL del PDF borrador para mostrar
    // Puedes añadir más props si las necesitas pasar desde page.tsx
}
// --- FIN ---