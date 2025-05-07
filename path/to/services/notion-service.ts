import { type Client } from '@/lib/types';
import { type PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { Client as NotionClient } from '@notionhq/client';

// Define el tipo localmente
interface CrmClient {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: any; // O el tipo correcto
  role: string;
  passport: string;
  address: string;
  country: string;
  dateOfBirth: any; // O el tipo correcto
  expirationDate: any; // O el tipo correcto
  publisherIpi?: string;
}

interface ContractTemplate {
  id: string;
  title: string;
  category: string; 
  description: string;
  content: string;
  status?: string;
}

class NotionService {
  // Añade la propiedad client
  private client: NotionClient | null = null;
  // Añade estas propiedades para IDs de DB
  private dbClients: string | null = null;
  private dbTemplates: string | null = null;

  // ── NUEVO: MAPA DE PROPIEDADES PARA DB CLIENTES ──
  // Ajusta estos nombres al esquema real de tu Notion
  private readonly CLIENT_PROPS = {
    FIRST_NAME:       "First name",
    LAST_NAME:        "Last name",
    EMAIL:            "Email",
    ROLE:             "Role",
    PHONE:            "Phone",
    PASSPORT:         "Passport",
    ADDRESS:          "Address",
    COUNTRY:          "Country",
    DATE_OF_BIRTH:    "Date of birth",
    EXPIRATION_DATE:  "Expiration date",
    PUBLISHER_IPI:    "Publisher IPI/CAE",
    // … añade más campos musicales aquí si lo deseas …
  };

  // ── NUEVO: MAPA DE PROPIEDADES PARA DB PLANTILLAS ──
  private readonly TEMPLATE_PROPS = {
    NAME:        "Nombre del Contrato",
    CATEGORY:    "Tipo de Contrato",
    DESCRIPTION: "Descripcion",
    CONTENT:     "Plantilla del Contrato",
    STATUS:      "Estado",
  };

  // Agrega o actualiza el constructor
  constructor() {
    // Inicialización básica
  }

  // Método para inicializar el cliente
  public init(apiKey: string, dbIds: { 
    clients?: string, 
    templates?: string 
  } = {}): void {
    this.client = new NotionClient({ auth: apiKey });
    this.dbClients = dbIds.clients || null;
    this.dbTemplates = dbIds.templates || null;
    console.log('Notion client initialized');
  }

  // Añade este método
  private getRichTextContent(prop: any): string | null { // Considera reemplazar 'any' con el tipo específico de propiedad de Notion
    if (prop && prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
      return prop.rich_text.map((rtItem: any) => rtItem.plain_text).join('');
    }
    return null;
  }

  // Método executeWithRetry (implementación básica)
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3 // Ejemplo: número máximo de reintentos
  ): Promise<T> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        console.log(`[NotionService] Attempt ${attempts + 1} for ${operationName}`);
        return await fn();
      } catch (error: any) {
        attempts++;
        console.error(`[NotionService] Error in ${operationName} (attempt ${attempts}/${maxRetries}):`, error.message);
        if (attempts >= maxRetries) {
          console.error(`[NotionService] Max retries reached for ${operationName}. Rethrowing.`);
          throw error; // O maneja el error final de otra forma
        }
        // Opcional: añadir un delay antes de reintentar
        // await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Ejemplo: 1s, 2s, etc.
      }
    }
    // Este punto no debería alcanzarse si maxRetries > 0 y siempre se lanza o retorna
    throw new Error(`[NotionService] Unexpected state in executeWithRetry for ${operationName}`);
  }

  /**
   * Obtener plantillas activas
   */
  public async obtenerPlantillas(): Promise<ContractTemplate[]> {
    // … código previo …
    return this.executeWithRetry(
      async () => {
        // … query …
        const queryConfig = { database_id: 'YOUR_DATABASE_ID_HERE', /* ... otros filtros ... */ };
        if (!this.client) throw new Error("Notion client not initialized");

        const results = (await this.client.databases.query(queryConfig)).results as PageObjectResponse[];
        return results
          .map(page => {
            // … existing try …
            const title       = this.getTitlePlainText(this.getProp(page, this.TEMPLATE_PROPS.NAME))        ?? 'Sin Título';
            const category    = this.getSelectName(this.getProp(page, this.TEMPLATE_PROPS.CATEGORY))      ?? 'Sin Categoría';
            const description = this.getRichTextPlainText(this.getProp(page, this.TEMPLATE_PROPS.DESCRIPTION)) ?? '';
            const content     = this.getRichTextContent(this.getProp(page, this.TEMPLATE_PROPS.CONTENT))     ?? '';
            // Necesitas completar el objeto ContractTemplate aquí
            return { id: page.id, title, category, description, content, status: 'Activa' /* ejemplo */ } as ContractTemplate;
          })
          // … filtro y retorno …
          .filter(Boolean); // Ejemplo de filtro simple
      },
      'obtenerPlantillas'
    );
  }

  /**
   * Listar clientes del CRM
   */
  public async listarClientes(): Promise<CrmClient[]> {
    // … validaciones …
    return this.executeWithRetry(
      async () => {
        const response = await this.client!.databases.query({ database_id: this.dbClients! });
        const results = response.results as PageObjectResponse[];
        return results
          .map((page): CrmClient | null => {
            const props = page.properties as any;
            const firstName    = this.getTitlePlainText(this.getProp(page, this.CLIENT_PROPS.FIRST_NAME))      ?? '';
            const lastName     = this.getRichTextPlainText(this.getProp(page, this.CLIENT_PROPS.LAST_NAME))    ?? '';
            const email        = this.getEmail(this.getProp(page, this.CLIENT_PROPS.EMAIL));
            const role         = this.getSelectName(this.getProp(page, this.CLIENT_PROPS.ROLE))              ?? 'Unknown';
            const phone        = this.getPhoneNumber(this.getProp(page, this.CLIENT_PROPS.PHONE));
            const passport     = this.getRichTextPlainText(this.getProp(page, this.CLIENT_PROPS.PASSPORT))    ?? '';
            const address      = this.getRichTextPlainText(this.getProp(page, this.CLIENT_PROPS.ADDRESS))     ?? '';
            const country      = this.getRichTextPlainText(this.getProp(page, this.CLIENT_PROPS.COUNTRY))     ?? '';
            const dateOfBirth  = this.getNotionDate(this.getProp(page, this.CLIENT_PROPS.DATE_OF_BIRTH))      ?? null;
            const expDate      = this.getNotionDate(this.getProp(page, this.CLIENT_PROPS.EXPIRATION_DATE))    ?? null;
            const publisherIpi = this.getRichTextPlainText(this.getProp(page, this.CLIENT_PROPS.PUBLISHER_IPI)) ?? '';

            if (!email) {
              // … log y omitido …
              return null;
            }

            return {
              id: page.id,
              name: `${firstName} ${lastName}`.trim() || email,
              email,
              firstName,
              lastName,
              phone,
              role,
              passport,
              address,
              country,
              dateOfBirth: dateOfBirth?.start ?? undefined,
              expirationDate: expDate?.start ?? undefined,
              publisherIpi: publisherIpi || undefined,
              // … FullName y Firma los calculas según tu lógica …
            };
          })
          .filter((c): c is CrmClient => c !== null);
      },
      'listarClientes'
    );
  }

  // Añade estos métodos utilitarios dentro de la clase NotionService

  private getProp(page: PageObjectResponse, propName: string): any {
    return page.properties[propName];
  }

  private getTitlePlainText(prop: any): string | null {
    if (prop && prop.type === 'title' && Array.isArray(prop.title)) {
      return prop.title.map((item: any) => item.plain_text).join('');
    }
    return null;
  }

  private getSelectName(prop: any): string | null {
    if (prop && prop.type === 'select' && prop.select) {
      return prop.select.name;
    }
    return null;
  }

  private getRichTextPlainText(prop: any): string | null {
    if (prop && prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
      return prop.rich_text.map((item: any) => item.plain_text).join('');
    }
    return null;
  }

  private getEmail(prop: any): string | null {
    if (prop && prop.type === 'email') {
      return prop.email || null;
    }
    return null;
  }

  private getPhoneNumber(prop: any): string | null {
    if (prop && prop.type === 'phone_number') {
      return prop.phone_number || null;
    }
    return null;
  }

  private getNotionDate(prop: any): { start: string; end?: string } | null {
    if (prop && prop.type === 'date' && prop.date) {
      return prop.date;
    }
    return null;
  }

  // … resto de la clase …
}

// … export singleton … 