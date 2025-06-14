import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import { NotionError, withRetry } from '../lib/error-handling';
import { config } from '../lib/config';

const logger = console; // Use built-in console

// Interfaces exportadas (se mantienen compatibles con el servicio original)
export interface ContractTemplate { 
  id: string; 
  title: string; 
  category: string; 
  description: string; 
  content: string; 
}

export interface CrmClient { 
  id: string; 
  name: string; 
  email: string; 
  role: string; 
  phone?: string; 
  passport?: string; 
  address?: string; 
}

export interface SignerDataInput {
  contractPageId: string;
  email: string;
  name: string;
  role?: string;
  pageNumber: number;
  posX: number;
  posY: number;
  signatureWidth: number;
  signatureHeight: number;
}

export interface SignerInfo {
  id: string; 
  name: string; 
  email: string; 
  signedAt: string | null;
  pageNumber: number; 
  posX: number; 
  posY: number; 
  signatureWidth: number; 
  signatureHeight: number;
}

export interface ContractInfo {
  id: string; 
  title: string; 
  pdfUrl_draft: string | null; 
  pdfUrl_signed?: string | null; 
  status?: string;
}

export interface SignerAndContractDataResult { 
  signer: SignerInfo; 
  contract: ContractInfo; 
}

export interface SentContract {
  id: string;
  notionPageId: string;
  title: string;
  content: string;
  participants: any[];
  date: string;
  status: string;
}

// Clase singleton para el servicio de Notion
class NotionService {
  private client: Client | null = null;
  private initialized = false;
  
  // IDs de base de datos
  private dbTemplates: string = '';
  private dbContracts: string = '';
  private dbSigners: string = '';
  private dbClients: string | null = null;
  
  // --- MAPA DE PROPIEDADES (Base de Datos de CONTRATOS) ---
  // !! VERIFICAR ESTOS NOMBRES CON TU BASE DE DATOS DE CONTRATOS REAL !!
  private readonly CONTRACT_PROPS = {
    TITLE: "ContractInstanceID",        // Propiedad Title principal
    STATUS: "Estado",                   // Propiedad Select para el estado
    PDF_DRAFT_URL: "PDF Borrador URL",    // Propiedad URL para el PDF borrador
    SEND_DATE: "FechaEnvio",            // Propiedad Date para fecha de envío
    SIGNERS_RELATION: "Firmantes",          // Propiedad Relation a DB Firmantes
    TEMPLATE_RELATION: "TemplateUsado",   // Propiedad Relation a DB Plantillas (Opcional)
    GENERAL_DATA: "Datos Generales",    // Propiedad Rich Text para datos JSON (Opcional)
    PDF_SIGNED_URL: "PDF Firmado",        // Propiedad URL para PDF firmado final
    SIGNED_SHA256: "SHA-256 Firmado",   // Propiedad Rich Text para hash SHA-256
    FINAL_SIGN_DATE: "Fecha Firma Final" // Propiedad Date para fecha de firma final
  };
  
  // --- MAPA DE PROPIEDADES (Base de Datos de FIRMANTES) ---
  // !! DEFINICIÓN ACTUALIZADA BASADA EN LA CONFIGURACIÓN REAL DE NOTION !!
  private readonly PROPERTY_MAP = {
    // Nombres de propiedades exactamente como aparecen en Notion (DB Firmantes)
    titleField: "Nombre Firmante (Title)",
    emailField: "Email",
    relationField: "Contrato Relacionado",
    dateField: "Fecha Firma (Date)",
    statusField: "Estado Firma (Select)",
    pageNumberField: "Página Firma (Number)",
    posXField: "Pos X Firma (Number)",
    posYField: "Pos Y Firma (Number)",
    widthField: "Ancho Firma (Number)",
    heightField: "Alto Firma (Number)"
  };
  
  // Inicialización perezosa
  constructor() {
    this.init();
  }
  
  /**
   * Inicializa el cliente de Notion y verifica la configuración
   * @throws NotionError si la configuración es inválida
   */
  private init(): void {
    try {
      // Verificar si ya se inicializó
      if (this.initialized) return;
      
      logger.info('Initializing Notion service');
      
      // Verificar y cargar la configuración
      if (!config.notionToken) {
        throw new NotionError('NOTION_TOKEN no configurado en variables de entorno', 500);
      }

      // Inicializar el cliente
      this.client = new Client({ auth: config.notionToken });
      
      // Cargar IDs de bases de datos
      this.dbTemplates = config.notionDbTemplates;
      this.dbContracts = config.notionDbContracts;
      this.dbSigners = config.notionDbSigners;
      this.dbClients = config.notionDbClients;
      
      // Verificar bases de datos críticas
      if (!this.dbContracts) {
        throw new NotionError('NOTION_DB_CONTRACTS no configurado en variables de entorno', 500);
      }
      
      if (!this.dbSigners) {
        throw new NotionError('NOTION_DB_SIGNERS no configurado en variables de entorno', 500);
      }
      
      // Marcar como inicializado
      this.initialized = true;
      logger.info('Notion service initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error initializing Notion service: ${errorMessage}`, error);
      
      if (error instanceof NotionError) {
        throw error;
      }
      
      throw new NotionError(`Error en inicialización: ${errorMessage}`, 500);
    }
  }
  
  /**
   * Utilidades para extraer datos de propiedades de Notion
   */
  private getProp(page: PageObjectResponse, propName: string): any | undefined {
    if (!page?.properties) return undefined;
    return (page.properties as any)[propName];
  }

  private getTitlePlainText(prop: any): string | undefined {
    return prop?.title?.[0]?.plain_text;
  }

  private getRichTextPlainText(prop: any): string | undefined {
    return prop?.rich_text?.map((rt: any) => rt.plain_text).join('');
  }

  private getRichTextContent(prop: any): string | undefined {
    return prop?.rich_text?.map((rt: any) => rt.plain_text).join('\n');
  }

  private getSelectName(prop: any): string | undefined {
    return prop?.select?.name;
  }

  private getEmail(prop: any): string | undefined {
    return prop?.email;
  }

  private getPhoneNumber(prop: any): string | undefined {
    return prop?.phone_number;
  }

  private getNotionUrl(prop: any): string | null {
    return prop?.url ?? null;
  }

  private getNotionNumber(prop: any): number | null {
    return prop?.number ?? null;
  }

  private getNotionDate(prop: any): { start: string, end: string | null, time_zone: string | null } | null {
    return prop?.date ?? null;
  }

  private getRelationIds(prop: any): string[] {
    return prop?.relation?.map((r: any) => r.id) || [];
  }
  
  /**
   * Ejecuta una operación de Notion con reintentos automáticos
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Verificar inicialización
    if (!this.initialized) {
      this.init();
    }
    
    if (!this.client) {
      throw new NotionError('Cliente Notion no inicializado', 500);
    }
    
    return withRetry(
      operation,
      {
        retries: config.maxRetries,
        onRetry: (error, attempt) => {
          logger.warn(
            `Reintentando operación de Notion "${operationName}" (${attempt}/${config.maxRetries})`,
            { error: error?.message || String(error) }
          );
        }
      }
    );
  }
  
  /**
   * Obtiene plantillas activas.
   */
  public async obtenerPlantillas(): Promise<ContractTemplate[]> {
    if (!this.dbTemplates) {
      logger.warn('No se ha configurado NOTION_DB_TEMPLATES, no se pueden obtener plantillas');
      return [];
    }
    
    return this.executeWithRetry(
      async () => {
        logger.info('Obteniendo plantillas activas');
        
        const queryConfig: QueryDatabaseParameters = {
          database_id: this.dbTemplates,
          filter: { property: 'Estado', select: { equals: 'Activo' } }
        };
        
        const response = await this.client!.databases.query(queryConfig);
        const results = response.results as PageObjectResponse[];

        const templates = results.map((page): ContractTemplate | null => {
          try {
            const title = this.getTitlePlainText(this.getProp(page, 'Nombre del Contrato')) ?? 'Plantilla sin Título';
            const category = this.getSelectName(this.getProp(page, 'Tipo de Contrato')) ?? 'Sin Categoría';
            const description = this.getRichTextPlainText(this.getProp(page, 'Descripcion')) ?? '';
            const content = this.getRichTextContent(this.getProp(page, 'Plantilla del Contrato')) ?? '';

            if (!content) { 
              logger.warn(`Plantilla ${page.id} (${title}) sin contenido`);
              return null; 
            }
            
            return { id: page.id, title, category, description, content };
          } catch (mapError) { 
            logger.error(`Error mapeando template ${page.id}`, mapError);
            return null; 
          }
        }).filter((t): t is ContractTemplate => t !== null);

        logger.info(`Plantillas activas encontradas: ${templates.length}`);
        return templates;
      },
      'obtenerPlantillas'
    );
  }
  
  /**
   * Obtiene clientes del CRM (opcional).
   */
  public async listarClientes(): Promise<CrmClient[]> {
    if (!this.dbClients) {
      logger.warn('No se ha configurado DATABASE_CLIENTES_ID, no se pueden obtener clientes');
      return [];
    }
    
    return this.executeWithRetry(
      async () => {
        logger.info('Listando clientes CRM');
        
        const response = await this.client!.databases.query({ database_id: this.dbClients! });
        const results = response.results as PageObjectResponse[];

        const mappedResults = results.map((page): CrmClient | null => {
          try {
            const firstName = this.getTitlePlainText(this.getProp(page, 'First name')) ?? '';
            const lastName = this.getRichTextPlainText(this.getProp(page, 'Last name')) ?? '';
            const email = this.getEmail(this.getProp(page, 'Email'));
            const role = this.getSelectName(this.getProp(page, 'Role')) ?? 'Unknown';
            const phone = this.getPhoneNumber(this.getProp(page, 'Phone'));
            const passport = this.getRichTextPlainText(this.getProp(page, 'Passport')) ?? '';
            const address = this.getRichTextPlainText(this.getProp(page, 'Address')) ?? '';

            if (!email) { 
              logger.warn(`Cliente CRM ${page.id} omitido (sin email)`);
              return null; 
            }
            
            return { 
              id: page.id, 
              name: `${firstName} ${lastName}`.trim() || email, 
              email, 
              role, 
              phone,
              passport,
              address
            };
          } catch (mapError) { 
            logger.error(`Error mapeando cliente CRM ${page.id}`, mapError);
            return null; 
          }
        });
        
        const validClients = mappedResults.filter((c): c is CrmClient => c !== null);
        logger.info(`Clientes CRM válidos: ${validClients.length}`);
        return validClients;
      },
      'listarClientes'
    );
  }
  
  /**
   * Crea la página del contrato en la DB Contratos-Creados
   * y la enlaza a los firmantes (si se proporcionan sus IDs).
   */
  public async createNotionContract(
    contractData: {
      title: string;
      pdfUrl_draft: string;
      templateId?: string | number;
      generalData?: any;
    },
    participantSignerIds: string[] = []
  ): Promise<{ id: string } | null> {
    return this.executeWithRetry(
      async () => {
        logger.info(`Creando contrato en Notion: ${contractData.title}`);
        
        // Propiedades Base del Contrato usando CONTRACT_PROPS
        const properties: Record<string, any> = {
          [this.CONTRACT_PROPS.TITLE]: { title: [{ text: { content: contractData.title } }] },
          [this.CONTRACT_PROPS.STATUS]: { select: { name: "EnviadoParaFirma" } },
          [this.CONTRACT_PROPS.PDF_DRAFT_URL]: { url: contractData.pdfUrl_draft },
          [this.CONTRACT_PROPS.SEND_DATE]: { date: { start: new Date().toISOString().split("T")[0] } },
          [this.CONTRACT_PROPS.SIGNERS_RELATION]: { relation: participantSignerIds.map(id => ({ id })) },
        };

        // Propiedades Opcionales usando CONTRACT_PROPS
        if (contractData.templateId) {
          properties[this.CONTRACT_PROPS.TEMPLATE_RELATION] = { relation: [{ id: String(contractData.templateId) }] };
        }
        
        if (contractData.generalData) {
          properties[this.CONTRACT_PROPS.GENERAL_DATA] = { rich_text: [{ text: { content: JSON.stringify(contractData.generalData, null, 2) } }] };
        }

        // Crear la Página
        const contractPage = await this.client!.pages.create({
          parent: { database_id: this.dbContracts },
          properties: properties,
        });

        logger.info(`Contrato creado OK - pageId: ${contractPage.id}`);
        return { id: contractPage.id };
      },
      'createNotionContract'
    );
  }
  
  /**
   * Crea un registro para un firmante en la DB Firmantes,
   * enlazándolo al contrato especificado.
   */
  public async createNotionSigner(signerData: SignerDataInput): Promise<{ id: string } | null> {
    // Continuamos permitiendo PENDING como valor temporal
    if (!signerData.contractPageId) {
      throw new NotionError('Se requiere contractPageId para crear un firmante', 400);
    }
    
    return this.executeWithRetry(
      async () => {
        logger.info(`Creando firmante en Notion: ${signerData.name} (${signerData.email}) para contrato ${signerData.contractPageId}`);
        
        // Debug Schema (opcional, útil si falla)
        // try {
        //   const dbSchema = await this.client!.databases.retrieve({ database_id: this.dbSigners });
        //   logger.info(`DB Schema for signers: ${JSON.stringify(dbSchema.properties)}`);
        // } catch (e) {
        //   logger.error(`Error fetching DB schema: ${e}`);
        // }
        
        // Usar PROPERTY_MAP para los nombres
        const properties: Record<string, any> = {
          [this.PROPERTY_MAP.titleField]: { title: [{ text: { content: signerData.name } }] },
          [this.PROPERTY_MAP.emailField]: { email: signerData.email },
          [this.PROPERTY_MAP.pageNumberField]: { number: signerData.pageNumber },
          [this.PROPERTY_MAP.posXField]: { number: signerData.posX },
          [this.PROPERTY_MAP.posYField]: { number: signerData.posY },
          [this.PROPERTY_MAP.widthField]: { number: signerData.signatureWidth },
          [this.PROPERTY_MAP.heightField]: { number: signerData.signatureHeight },
        };
        
        // Manejar relación inicial si no es PENDING
        if (signerData.contractPageId !== "PENDING") {
          // Usar PROPERTY_MAP para la relación
          properties[this.PROPERTY_MAP.relationField] = { 
             relation: [{ id: signerData.contractPageId }] 
          };
        }
        // else {
           // Si es PENDING, NO establecer la relación aquí, se hará después con updateSignerContractRelation
        // }


        const signerPage = await this.client!.pages.create({
          parent: { database_id: this.dbSigners },
          properties: properties,
        });

        logger.info(`Firmante creado OK - pageId: ${signerPage.id}`);
        return { id: signerPage.id };
      },
      'createNotionSigner'
    );
  }
  
  /**
   * Obtiene la lista de contratos creados desde Notion.
   */
  public async listarContratosEnviados(): Promise<SentContract[]> {
    return this.executeWithRetry(
      async () => {
        logger.info('Listando contratos enviados/creados');
        
        const queryConfig: QueryDatabaseParameters = {
          database_id: this.dbContracts,
          sorts: [
            {
              property: this.CONTRACT_PROPS.SEND_DATE, // Usar CONTRACT_PROPS
              direction: 'descending',
            },
          ],
          page_size: 100
        };

        const response = await this.client!.databases.query(queryConfig);
        const results = response.results as PageObjectResponse[];

        logger.debug(`Contratos crudos encontrados: ${results.length}`);

        const contracts = results.map((page): SentContract | null => {
          try {
            const title = this.getTitlePlainText(this.getProp(page, this.CONTRACT_PROPS.TITLE)) ?? 'Contrato sin Título'; // Usar CONTRACT_PROPS
            const status = this.getSelectName(this.getProp(page, this.CONTRACT_PROPS.STATUS)) ?? 'Desconocido'; // Usar CONTRACT_PROPS
            const dateProp = this.getNotionDate(this.getProp(page, this.CONTRACT_PROPS.SEND_DATE)); // Usar CONTRACT_PROPS
            const sentDate = dateProp?.start || page.created_time;

            const simplifiedParticipants: SentContract['participants'] = [];
            const simplifiedContent = "";

            return {
              id: page.id,
              notionPageId: page.id,
              title: title,
              content: simplifiedContent,
              participants: simplifiedParticipants,
              date: sentDate,
              status: status,
            };
          } catch (mapError) {
            logger.error(`Error mapeando contrato ${page.id}`, mapError);
            return null;
          }
        }).filter((c): c is SentContract => c !== null);

        logger.info(`Contratos mapeados válidos: ${contracts.length}`);
        return contracts;
      },
      'listarContratosEnviados'
    );
  }
  
  /**
   * Obtiene los datos del firmante y del contrato asociado para la página de firma.
   */
  public async getSignerAndContractData(signerId: string, contractId: string): Promise<SignerAndContractDataResult | null> {
    return this.executeWithRetry(
      async () => {
        logger.info(`Buscando datos para firma - signerId: ${signerId}, contractId: ${contractId}`);
        
        let signerPage: PageObjectResponse;
        let contractPage: PageObjectResponse;

        // 1. Obtener Firmante
        try {
          signerPage = await this.client!.pages.retrieve({ page_id: signerId }) as PageObjectResponse;
          if (!signerPage?.properties) throw new Error("Respuesta inválida (firmante).");
        } catch (e: any) { 
          if (e?.code === 'object_not_found') { 
            logger.warn(`Firmante ${signerId} no encontrado`);
          } else { 
            logger.error(`Error recuperando firmante ${signerId}`, e);
          } 
          return null; 
        }
        
        const signerProps = signerPage.properties as any;

        // 2. Validar Relación (usa PROPERTY_MAP)
        const relatedContractIds = this.getRelationIds(signerProps[this.PROPERTY_MAP.relationField]);
        if (!relatedContractIds.includes(contractId)) {
          logger.error(`Error Seguridad: Firmante ${signerId} no está relacionado con contrato ${contractId} via prop '${this.PROPERTY_MAP.relationField}'. Relacionado con: ${relatedContractIds.join(', ')}`);
          return null;
        }

        // 3. Obtener Contrato
        try {
          contractPage = await this.client!.pages.retrieve({ page_id: contractId }) as PageObjectResponse;
          if (!contractPage?.properties) throw new Error("Respuesta inválida (contrato).");
        } catch (e: any) { 
          if (e?.code === 'object_not_found') { 
            logger.warn(`Contrato ${contractId} no encontrado`);
          } else { 
            logger.error(`Error recuperando contrato ${contractId}`, e);
          } 
          return null; 
        }
        
        const contractProps = contractPage.properties as any;

        // 4. Extraer Datos Clave del Contrato (usando CONTRACT_PROPS)
        const draftPdfUrl = this.getNotionUrl(contractProps[this.CONTRACT_PROPS.PDF_DRAFT_URL]);                                         
        const contractStatus = this.getSelectName(contractProps[this.CONTRACT_PROPS.STATUS]) ?? 'unknown';
        const contractTitle = this.getTitlePlainText(contractProps[this.CONTRACT_PROPS.TITLE]) ?? 'Contrato sin Título';
        const signedPdfUrl = this.getNotionUrl(contractProps[this.CONTRACT_PROPS.PDF_SIGNED_URL]) || null;

        // Obtener datos del firmante usando PROPERTY_MAP
        const signerEmail = this.getEmail(signerProps[this.PROPERTY_MAP.emailField]);
        const signerName = this.getTitlePlainText(signerProps[this.PROPERTY_MAP.titleField]) ?? 'Firmante Desconocido';
        const signedAtDate = this.getNotionDate(signerProps[this.PROPERTY_MAP.dateField]);
        const signedAt = signedAtDate?.start || null;
        
        // Validaciones mínimas (usando CONTRACT_PROPS para PDF)
        if (!draftPdfUrl) { 
          logger.error(`Contrato ${contractId} sin propiedad URL válida para PDF borrador ('${this.CONTRACT_PROPS.PDF_DRAFT_URL}' verificado).`);
          return null; 
        }
        if (!signerEmail) { 
          logger.error(`Firmante ${signerId} sin propiedad Email válida ('${this.PROPERTY_MAP.emailField}' verificado).`);
          return null; 
        }

        // 5. Construir Resultado (sin cambios significativos aquí, solo usa variables ya extraídas)
        const signerResult: SignerInfo = {
          id: signerPage.id,
          name: signerName,
          email: signerEmail,
          signedAt: signedAt,
          pageNumber: this.getNotionNumber(signerProps[this.PROPERTY_MAP.pageNumberField]) ?? 1, 
          posX: this.getNotionNumber(signerProps[this.PROPERTY_MAP.posXField]) ?? 72,
          posY: this.getNotionNumber(signerProps[this.PROPERTY_MAP.posYField]) ?? 650,
          signatureWidth: this.getNotionNumber(signerProps[this.PROPERTY_MAP.widthField]) ?? 150,
          signatureHeight: this.getNotionNumber(signerProps[this.PROPERTY_MAP.heightField]) ?? 60,
        };
        
        const contractResult: ContractInfo = {
          id: contractPage.id,
          title: contractTitle,
          pdfUrl_draft: draftPdfUrl,
          pdfUrl_signed: signedPdfUrl,
          status: contractStatus || 'unknown',
        };

        logger.info('Datos para firma recuperados OK');
        return { signer: signerResult, contract: contractResult };
      },
      'getSignerAndContractData'
    );
  }
  
  /**
   * Actualiza la página del firmante en Notion (para marcar la fecha de firma).
   */
  public async updateSignerRecord(signerId: string, data: { signedAt: Date }): Promise<void> {
    await this.executeWithRetry(
      async () => {
        logger.info(`Marcando firmante ${signerId} como firmado a las ${data.signedAt.toISOString()}`);
        
        await this.client!.pages.update({
          page_id: signerId,
          properties: {
            // Actualiza la fecha de firma
            [this.PROPERTY_MAP.dateField]: { date: { start: data.signedAt.toISOString() } },
            // Actualiza también el estado de la firma
            [this.PROPERTY_MAP.statusField]: { select: { name: "Firmado" } }
          }
        });
        
        logger.info(`Firmante ${signerId} actualizado OK`);
      },
      'updateSignerRecord'
    );
  }
  
  /**
   * Actualiza la relación del firmante con el contrato después de crearlo.
   */
  public async updateSignerContractRelation(signerId: string, contractId: string): Promise<void> {
    await this.executeWithRetry(
      async () => {
        logger.info(`Actualizando relación del firmante ${signerId} con el contrato ${contractId}`);
        
        await this.client!.pages.update({
          page_id: signerId,
          properties: {
            [this.PROPERTY_MAP.relationField]: { relation: [{ id: contractId }] }
          }
        });
        
        logger.info(`Relación de firmante ${signerId} con contrato ${contractId} actualizada correctamente`);
      },
      'updateSignerContractRelation'
    );
  }
  
  /**
   * Cuenta los firmantes pendientes (sin fecha de firma) para un contrato.
   */
  public async getPendingSignersCount(contractId: string): Promise<number> {
    return this.executeWithRetry(
      async () => {
        logger.info(`Contando firmantes pendientes para contrato ${contractId}`);
        
        let pendingCount = 0;
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
          const query: QueryDatabaseParameters = {
            database_id: this.dbSigners,
            filter: {
              and: [
                { property: this.PROPERTY_MAP.relationField, relation: { contains: contractId } },
                { property: this.PROPERTY_MAP.dateField, date: { is_empty: true } }
              ]
            },
            page_size: 100
          };
          
          if (startCursor) { 
            query.start_cursor = startCursor; 
          }

          const response = await this.client!.databases.query(query);

          pendingCount += response.results.length;
          hasMore = response.has_more;
          startCursor = response.next_cursor ?? undefined;
        }

        logger.info(`Firmantes pendientes encontrados: ${pendingCount}`);
        return pendingCount;
      },
      'getPendingSignersCount'
    );
  }
  
  /**
   * Actualiza la página del contrato a estado final ('Firmado').
   */
  public async updateFinalContractStatus(
    contractId: string,
    data: { pdfUrl_signed: string; sha256: string; signedAt: Date; }
  ): Promise<void> {
    await this.executeWithRetry(
      async () => {
        logger.info(`Actualizando estado final para contrato ${contractId}`);
        
        // Usar CONTRACT_PROPS
        const properties: Record<string, any> = {
          [this.CONTRACT_PROPS.STATUS]: { select: { name: 'Firmado' } },
          [this.CONTRACT_PROPS.PDF_SIGNED_URL]: { url: data.pdfUrl_signed },
          [this.CONTRACT_PROPS.SIGNED_SHA256]: { rich_text: [{ text: { content: data.sha256 } }] },
          [this.CONTRACT_PROPS.FINAL_SIGN_DATE]: { date: { start: data.signedAt.toISOString().split('T')[0] } }
        };

        await this.client!.pages.update({
          page_id: contractId,
          properties: properties
        });
        
        logger.info(`Contrato ${contractId} actualizado a estado final OK`);
      },
      'updateFinalContractStatus'
    );
  }

  /**
   * Obtiene los detalles completos de un contrato, incluyendo sus firmantes.
   */
  public async getContractDetails(contractId: string): Promise<{
    contract: ContractInfo;
    signers: SignerInfo[];
    generalData?: any;
  } | null> {
    return this.executeWithRetry(
      async () => {
        logger.info(`Obteniendo detalles para contrato ${contractId}`);
        
        // 1. Obtener la información del contrato
        let contractPage: PageObjectResponse;
        try {
          contractPage = await this.client!.pages.retrieve({ page_id: contractId }) as PageObjectResponse;
          if (!contractPage?.properties) throw new Error("Respuesta inválida (contrato).");
        } catch (e: any) { 
          if (e?.code === 'object_not_found') { 
            logger.warn(`Contrato ${contractId} no encontrado`);
          } else { 
            logger.error(`Error recuperando contrato ${contractId}`, e);
          } 
          return null; 
        }
        
        const contractProps = contractPage.properties as any;
        
        // 2. Extraer datos del contrato
        const title = this.getTitlePlainText(this.getProp(contractPage, this.CONTRACT_PROPS.TITLE)) ?? 'Contrato sin Título';
        const status = this.getSelectName(this.getProp(contractPage, this.CONTRACT_PROPS.STATUS)) ?? 'Desconocido';
        const dateProp = this.getNotionDate(this.getProp(contractPage, this.CONTRACT_PROPS.SEND_DATE));
        const sentDate = dateProp?.start || contractPage.created_time;
        const draftPdfUrl = this.getNotionUrl(contractProps[this.CONTRACT_PROPS.PDF_DRAFT_URL]) ?? null;
        const signedPdfUrl = this.getNotionUrl(contractProps[this.CONTRACT_PROPS.PDF_SIGNED_URL]) ?? null;
        
        // 3. Extraer datos generales (si existen)
        let generalData = null;
        try {
          const generalDataText = this.getRichTextPlainText(this.getProp(contractPage, this.CONTRACT_PROPS.GENERAL_DATA));
          if (generalDataText) {
            generalData = JSON.parse(generalDataText);
          }
        } catch (e) {
          logger.warn(`Error parseando datos generales del contrato ${contractId}`, e);
        }
        
        // 4. Buscar firmantes relacionados con este contrato en la DB de firmantes
        logger.info(`Buscando firmantes para contrato ${contractId} en DB de firmantes`);
        
        const signersQuery: QueryDatabaseParameters = {
          database_id: this.dbSigners,
          filter: {
            property: this.PROPERTY_MAP.relationField, // "Contrato Relacionado"
            relation: { contains: contractId }
          }
        };
        
        const signersResponse = await this.client!.databases.query(signersQuery);
        const signerPages = signersResponse.results as PageObjectResponse[];
        
        logger.info(`Encontrados ${signerPages.length} firmantes para contrato ${contractId}`);
        
        // 5. Si no hay firmantes, devolver solo los datos del contrato
        if (signerPages.length === 0) {
          logger.info(`Contrato ${contractId} no tiene firmantes relacionados`);
          return {
            contract: {
              id: contractId,
              title,
              pdfUrl_draft: draftPdfUrl,
              pdfUrl_signed: signedPdfUrl,
              status
            },
            signers: [],
            generalData
          };
        }
        
        // 6. Procesar datos de cada firmante
        const validSigners: SignerInfo[] = [];
        
        for (const signerPage of signerPages) {
          try {
            const signerProps = signerPage.properties as any;
            
            // Extraer datos del firmante usando PROPERTY_MAP
            const name = this.getTitlePlainText(signerProps[this.PROPERTY_MAP.titleField]) ?? 'Firmante Desconocido';
            const email = this.getEmail(signerProps[this.PROPERTY_MAP.emailField]) ?? '';
            const signedAtDate = this.getNotionDate(signerProps[this.PROPERTY_MAP.dateField]);
            const signedAt = signedAtDate?.start || null;
            const pageNumber = this.getNotionNumber(signerProps[this.PROPERTY_MAP.pageNumberField]) ?? 1;
            const posX = this.getNotionNumber(signerProps[this.PROPERTY_MAP.posXField]) ?? 0;
            const posY = this.getNotionNumber(signerProps[this.PROPERTY_MAP.posYField]) ?? 0;
            const signatureWidth = this.getNotionNumber(signerProps[this.PROPERTY_MAP.widthField]) ?? 150;
            const signatureHeight = this.getNotionNumber(signerProps[this.PROPERTY_MAP.heightField]) ?? 60;
            
            validSigners.push({
              id: signerPage.id,
              name,
              email,
              signedAt,
              pageNumber,
              posX,
              posY,
              signatureWidth,
              signatureHeight
            });
            
          } catch (e) {
            logger.error(`Error procesando firmante ${signerPage.id}`, e);
          }
        }
        
        logger.info(`Procesados ${validSigners.length} firmantes válidos para contrato ${contractId}`);
        
        // 7. Devolver datos completos
        return {
          contract: {
            id: contractId,
            title,
            pdfUrl_draft: draftPdfUrl,
            pdfUrl_signed: signedPdfUrl,
            status
          },
          signers: validSigners,
          generalData
        };
      },
      'getContractDetails'
    );
  }
}

// Exportar una única instancia del servicio como singleton
export const notionService = new NotionService(); 