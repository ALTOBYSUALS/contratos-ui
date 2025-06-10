import { Client } from '@notionhq/client';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { config } from '@/lib/config';

// =============================================================================
// TIPOS UNIFICADOS
// =============================================================================

export interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  status: string;
}

export interface Client_Data {
  id: string;
  FullName: string;
  firstName: string; // Nombre
  lastName: string;  // Apellido
  email: string;
  role: string;
  phone?: string;
  passport?: string;
  address?: string;
  country?: string;
  publisherIpi?: string; // IPI/CAE del publisher
  managementSociety?: string; // Sociedad de gestión (SGAE, ASCAP, BMI, etc.)
}

export interface Contract {
  id: string;
  title: string;
  status: string;
  pdfUrl_draft?: string;
  pdfUrl_signed?: string;
  signedAt?: Date;
  sha256?: string;
}

export interface Signer {
  id: string;
  name: string;
  email: string;
  contractId: string;
  signedAt?: Date;
  pageNumber: number;
  posX: number;
  posY: number;
  signatureWidth: number;
  signatureHeight: number;
}

// =============================================================================
// CONFIGURACIÓN DE CAMPOS (UNIFICADA)
// =============================================================================

const FIELD_MAPPINGS = {
  // TEMPLATES DATABASE (nombres reales de Notion)
  TEMPLATES: {
    TITLE: "Nombre del Contrato",
    CATEGORY: "Tipo de Contrato", 
    DESCRIPTION: "Descripcion",
    CONTENT: "Plantilla del Contrato",
    STATUS: "Estado"
  },

  // CLIENTS DATABASE (nombres reales de Notion)
  CLIENTS: {
    FULL_NAME: "First name", // Combinamos First name + Last name
    LAST_NAME: "Last name",
    EMAIL: "Email",
    ROLE: "Role",
    PHONE: "Phone",
    PASSPORT: "Passport", 
    ADDRESS: "Addresss", // Nota: tiene doble 's' en Notion
    COUNTRY: "Country",
    PUBLISHER_IPI: "Publisher IPI/CAE", // Campo IPI del publisher
    MANAGEMENT_SOCIETY: "Sociedades de gestión" // Sociedad de gestión
  },

  // CONTRACTS DATABASE (nombres reales de Notion)
  CONTRACTS: {
    TITLE: "ContractInstanceID",
    STATUS: "Estado",
    PDF_DRAFT: "PDF Borrador URL",
    PDF_SIGNED: "PDF Firmado", 
    SIGNED_AT: "Fecha Firma Final",
    SHA256: "SHA-256 Firmado",
    SIGNERS: "Firmantes"
  },

  // SIGNERS DATABASE (nombres reales de Notion)
  SIGNERS: {
    NAME: "Nombre Firmante (Title)",
    EMAIL: "Email", 
    CONTRACT: "Contrato Relacionado",
    SIGNED_AT: "Fecha Firma (Date)",
    PAGE_NUMBER: "Página Firma (Number)",
    POS_X: "Pos X Firma (Number)",
    POS_Y: "Pos Y Firma (Number)", 
    SIGNATURE_WIDTH: "Ancho Firma (Number)",
    SIGNATURE_HEIGHT: "Alto Firma (Number)"
  }
} as const;

// =============================================================================
// SERVICIO NOTION UNIFICADO
// =============================================================================

class UnifiedNotionService {
  private client: Client;
  private dbIds: {
    templates: string;
    clients: string;
    contracts: string;
    signers: string;
  };

  constructor() {
    this.client = new Client({ auth: config.notionToken });
    this.dbIds = {
      templates: config.notionDbTemplates || '',
      clients: config.notionDbClients || '',
      contracts: config.notionDbContracts || '',
      signers: config.notionDbSigners || ''
    };
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  private getProperty(page: PageObjectResponse, fieldName: string): any {
    return (page.properties as any)[fieldName];
  }

  private getTitle(prop: any): string {
    return prop?.title?.[0]?.plain_text || '';
  }

  private getRichText(prop: any): string {
    return prop?.rich_text?.[0]?.plain_text || '';
  }

  private getSelect(prop: any): string {
    return prop?.select?.name || '';
  }

  private getEmail(prop: any): string {
    return prop?.email || '';
  }

  private getNumber(prop: any): number {
    return prop?.number || 0;
  }

  private getDate(prop: any): Date | undefined {
    return prop?.date?.start ? new Date(prop.date.start) : undefined;
  }

  private getUrl(prop: any): string {
    return prop?.url || '';
  }

  private getRelation(prop: any): string[] {
    return prop?.relation?.map((r: any) => r.id) || [];
  }

  // =============================================================================
  // TEMPLATES
  // =============================================================================

  async getTemplates(): Promise<Template[]> {
    try {
      const response = await this.client.databases.query({
        database_id: this.dbIds.templates
        // Temporalmente sin filtro para ver todos los templates
      });

      return response.results.map((page) => {
        const p = page as PageObjectResponse;
        return {
          id: p.id,
          title: this.getTitle(this.getProperty(p, FIELD_MAPPINGS.TEMPLATES.TITLE)),
          category: this.getSelect(this.getProperty(p, FIELD_MAPPINGS.TEMPLATES.CATEGORY)),
          description: this.getRichText(this.getProperty(p, FIELD_MAPPINGS.TEMPLATES.DESCRIPTION)),
          content: this.getRichText(this.getProperty(p, FIELD_MAPPINGS.TEMPLATES.CONTENT)),
          status: this.getSelect(this.getProperty(p, FIELD_MAPPINGS.TEMPLATES.STATUS))
        };
      });
    } catch (error) {
      console.error('[UnifiedNotion] Error getting templates:', error);
      return [];
    }
  }

  // =============================================================================
  // CLIENTS
  // =============================================================================

  async getClients(): Promise<Client_Data[]> {
    try {
      const response = await this.client.databases.query({
        database_id: this.dbIds.clients
      });

      const notionClients = response.results.map((page) => {
        const p = page as PageObjectResponse;
        
        // Combinar First name + Last name para FullName
        // 🔧 CORRECCIÓN: First name es tipo 'title', no 'rich_text'
        const firstName = this.getTitle(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.FULL_NAME));
        const lastName = this.getRichText(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.LAST_NAME));
        
        // 🔧 LÓGICA MEJORADA: Crear FullName robusto basado en datos reales
        let fullName = '';
        const email = this.getEmail(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.EMAIL));
        
        if (firstName && lastName) {
          // Caso ideal: ambos campos tienen datos
          fullName = `${firstName} ${lastName}`;
        } else if (firstName && !lastName) {
          // Solo hay firstName
          fullName = firstName;
        } else if (!firstName && lastName) {
          // Solo hay lastName (caso más común en tu base de datos)
          fullName = lastName;
        } else if (email) {
          // Ambos vacíos, usar email sin @domain
          fullName = email.split('@')[0];
        } else {
          // Último recurso
          fullName = 'Cliente sin nombre';
        }
        // 🔧 CORRECCIÓN: Publisher IPI es numérico, Sociedades es multi-select  
        const publisherIpiRaw = this.getProperty(p, FIELD_MAPPINGS.CLIENTS.PUBLISHER_IPI);
        const publisherIpi = publisherIpiRaw?.number ? publisherIpiRaw.number.toString() : this.getRichText(publisherIpiRaw);
        
        const managementSocietyRaw = this.getProperty(p, FIELD_MAPPINGS.CLIENTS.MANAGEMENT_SOCIETY);
        const managementSociety = managementSocietyRaw?.multi_select ? 
          managementSocietyRaw.multi_select.map((item: any) => item.name).join(', ') : 
          this.getSelect(managementSocietyRaw);
        
        // DEBUG: Log para verificar que se están extrayendo los datos correctamente
        console.log(`[DEBUG] Client data for ${p.id}:`, {
          firstName,
          lastName,
          fullName,
          publisherIpi,
          managementSociety,
          rawProperties: Object.keys((p.properties as any)),
          // Agregar más debug para IPI y sociedades
          rawPublisherIpi: this.getProperty(p, FIELD_MAPPINGS.CLIENTS.PUBLISHER_IPI),
          rawManagementSociety: this.getProperty(p, FIELD_MAPPINGS.CLIENTS.MANAGEMENT_SOCIETY),
          // Ver el tipo de estos campos
          publisherIpiType: this.getProperty(p, FIELD_MAPPINGS.CLIENTS.PUBLISHER_IPI)?.type,
          managementSocietyType: this.getProperty(p, FIELD_MAPPINGS.CLIENTS.MANAGEMENT_SOCIETY)?.type
        });
        
        return {
          id: p.id,
          FullName: fullName,
          firstName: firstName,
          lastName: lastName,
          email: this.getEmail(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.EMAIL)),
          role: this.getSelect(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.ROLE)),
          phone: this.getRichText(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.PHONE)),
          passport: this.getRichText(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.PASSPORT)),
          address: this.getRichText(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.ADDRESS)),
          country: this.getSelect(this.getProperty(p, FIELD_MAPPINGS.CLIENTS.COUNTRY)),
          publisherIpi: publisherIpi || undefined,
          managementSociety: managementSociety || undefined
        };
      });

      // Devolver solo los clientes reales de Notion
      console.log(`[UnifiedNotion] Devolviendo ${notionClients.length} clientes de Notion`);
      
      return notionClients;
    } catch (error) {
      console.error('[UnifiedNotion] Error getting clients:', error);
      return [];
    }
  }

  // =============================================================================
  // CONTRACTS & SIGNERS
  // =============================================================================

  async createContract(data: {
    title: string;
    pdfUrl_draft: string;
    signerIds: string[];
  }): Promise<string | null> {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.dbIds.contracts },
        properties: {
          [FIELD_MAPPINGS.CONTRACTS.TITLE]: {
            title: [{ text: { content: data.title } }]
          },
          [FIELD_MAPPINGS.CONTRACTS.STATUS]: {
            select: { name: 'Pending' }
          },
          [FIELD_MAPPINGS.CONTRACTS.PDF_DRAFT]: {
            url: data.pdfUrl_draft
          },
          [FIELD_MAPPINGS.CONTRACTS.SIGNERS]: {
            relation: data.signerIds.map(id => ({ id }))
          }
        }
      });

      console.log(`[UnifiedNotion] Contract created: ${response.id}`);
      return response.id;
    } catch (error) {
      console.error('[UnifiedNotion] Error creating contract:', error);
      return null;
    }
  }

  async createSigner(data: {
    name: string;
    email: string;
    contractId: string;
    pageNumber?: number;
    posX?: number;
    posY?: number;
    width?: number;
    height?: number;
  }): Promise<string | null> {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.dbIds.signers },
        properties: {
          [FIELD_MAPPINGS.SIGNERS.NAME]: {
            title: [{ text: { content: data.name } }]
          },
          [FIELD_MAPPINGS.SIGNERS.EMAIL]: {
            email: data.email
          },
          [FIELD_MAPPINGS.SIGNERS.CONTRACT]: {
            relation: [{ id: data.contractId }]
          },
          [FIELD_MAPPINGS.SIGNERS.PAGE_NUMBER]: {
            number: data.pageNumber || 1
          },
          [FIELD_MAPPINGS.SIGNERS.POS_X]: {
            number: data.posX || 100
          },
          [FIELD_MAPPINGS.SIGNERS.POS_Y]: {
            number: data.posY || 650
          },
          [FIELD_MAPPINGS.SIGNERS.SIGNATURE_WIDTH]: {
            number: data.width || 150
          },
          [FIELD_MAPPINGS.SIGNERS.SIGNATURE_HEIGHT]: {
            number: data.height || 50
          }
        }
      });

      console.log(`[UnifiedNotion] Signer created: ${response.id}`);
      return response.id;
    } catch (error) {
      console.error('[UnifiedNotion] Error creating signer:', error);
      return null;
    }
  }

  async updateSignerAsSigned(signerId: string): Promise<boolean> {
    try {
      await this.client.pages.update({
        page_id: signerId,
        properties: {
          [FIELD_MAPPINGS.SIGNERS.SIGNED_AT]: {
            date: { start: new Date().toISOString() }
          }
        }
      });

      console.log(`[UnifiedNotion] Signer ${signerId} marked as signed`);
      return true;
    } catch (error) {
      console.error('[UnifiedNotion] Error updating signer:', error);
      return false;
    }
  }

  async getSignerAndContract(signerId: string, contractId: string): Promise<{
    signer: Signer;
    contract: Contract;
  } | null> {
    try {
      const [signerResponse, contractResponse] = await Promise.all([
        this.client.pages.retrieve({ page_id: signerId }),
        this.client.pages.retrieve({ page_id: contractId })
      ]);

      const signerPage = signerResponse as PageObjectResponse;
      const contractPage = contractResponse as PageObjectResponse;

      const signer: Signer = {
        id: signerPage.id,
        name: this.getTitle(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.NAME)),
        email: this.getEmail(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.EMAIL)),
        contractId: contractId,
        signedAt: this.getDate(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.SIGNED_AT)),
        pageNumber: this.getNumber(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.PAGE_NUMBER)),
        posX: this.getNumber(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.POS_X)),
        posY: this.getNumber(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.POS_Y)),
        signatureWidth: this.getNumber(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.SIGNATURE_WIDTH)),
        signatureHeight: this.getNumber(this.getProperty(signerPage, FIELD_MAPPINGS.SIGNERS.SIGNATURE_HEIGHT))
      };

      const contract: Contract = {
        id: contractPage.id,
        title: this.getTitle(this.getProperty(contractPage, FIELD_MAPPINGS.CONTRACTS.TITLE)),
        status: this.getSelect(this.getProperty(contractPage, FIELD_MAPPINGS.CONTRACTS.STATUS)),
        pdfUrl_draft: this.getUrl(this.getProperty(contractPage, FIELD_MAPPINGS.CONTRACTS.PDF_DRAFT)),
        pdfUrl_signed: this.getUrl(this.getProperty(contractPage, FIELD_MAPPINGS.CONTRACTS.PDF_SIGNED)),
        signedAt: this.getDate(this.getProperty(contractPage, FIELD_MAPPINGS.CONTRACTS.SIGNED_AT)),
        sha256: this.getRichText(this.getProperty(contractPage, FIELD_MAPPINGS.CONTRACTS.SHA256))
      };

      return { signer, contract };
    } catch (error) {
      console.error('[UnifiedNotion] Error getting signer and contract:', error);
      return null;
    }
  }

  async countPendingSigners(contractId: string): Promise<number> {
    try {
      const response = await this.client.databases.query({
        database_id: this.dbIds.signers,
        filter: {
          and: [
            {
              property: FIELD_MAPPINGS.SIGNERS.CONTRACT,
              relation: { contains: contractId }
            },
            {
              property: FIELD_MAPPINGS.SIGNERS.SIGNED_AT,
              date: { is_empty: true }
            }
          ]
        }
      });

      return response.results.length;
    } catch (error) {
      console.error('[UnifiedNotion] Error counting pending signers:', error);
      return -1;
    }
  }

  async finalizeContract(contractId: string, data: {
    pdfUrl_signed: string;
    sha256: string;
  }): Promise<boolean> {
    try {
      await this.client.pages.update({
        page_id: contractId,
        properties: {
          [FIELD_MAPPINGS.CONTRACTS.STATUS]: {
            select: { name: 'Completed' }
          },
          [FIELD_MAPPINGS.CONTRACTS.PDF_SIGNED]: {
            url: data.pdfUrl_signed
          },
          [FIELD_MAPPINGS.CONTRACTS.SHA256]: {
            rich_text: [{ text: { content: data.sha256 } }]
          },
          [FIELD_MAPPINGS.CONTRACTS.SIGNED_AT]: {
            date: { start: new Date().toISOString() }
          }
        }
      });

      console.log(`[UnifiedNotion] Contract ${contractId} finalized`);
      return true;
    } catch (error) {
      console.error('[UnifiedNotion] Error finalizing contract:', error);
      return false;
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const unifiedNotion = new UnifiedNotionService(); 