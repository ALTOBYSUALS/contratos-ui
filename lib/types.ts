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