// Ruta Completa: /services/notion.ts

// Define SentContract interface directly in this file
export interface SentContract {
  id: string;
  notionPageId: string;
  title: string;
  content: string;
  participants: any[]; // Define more specific type if needed
  date: string;
  status: string;
}
import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";

// Importar el servicio centralizado
import { notionService } from './notion-service';

// --- Inicialización del Cliente Notion y IDs ---
export const notion = process.env.NOTION_TOKEN ? new Client({ auth: process.env.NOTION_TOKEN }) : null;

const templatesDbId = process.env.NOTION_DB_TEMPLATES || '';
const contratosDbId = process.env.NOTION_DB_CONTRACTS || ''; // DB Contratos-Creados
const firmantesDbId = process.env.NOTION_DB_SIGNERS || '';   // DB Firmantes
const clientesDbId = process.env.DATABASE_CLIENTES_ID || ''; // DB CRM (Opcional)

// --- Checks de Configuración ---
if (!process.env.NOTION_TOKEN) { console.error("[Notion Service Init] Falta NOTION_TOKEN en .env"); }
if (!templatesDbId) { console.warn("[Notion Service Init] process.env.NOTION_DB_TEMPLATES no definido."); }
if (!contratosDbId) { console.error("[Notion Service Init] NOTION_DB_CONTRACTS no definido (CRÍTICO)."); }
if (!firmantesDbId) { console.error("[Notion Service Init] NOTION_DB_SIGNERS no definido (CRÍTICO)."); }


// --- Interfaces Principales ---
export interface ContractTemplate { id: string; title: string; category: string; description: string; content: string; }
export interface CrmClient { id: string; name: string; email: string; role: string; phone?: string; passport?: string; address?: string; }

// Datos necesarios para crear un nuevo registro de firmante
export interface SignerDataInput {
    contractPageId: string; // ID de la página del Contrato al que pertenece
    email: string;
    name: string;
    role?: string;
    // Coordenadas y tamaño para la firma en el PDF final
    pageNumber: number;
    posX: number;
    posY: number;
    signatureWidth: number;
    signatureHeight: number;
}

// Datos que recuperamos de un firmante existente
export interface SignerInfo {
    id: string; name: string; email: string; signedAt: string | null; // Fecha ISO si firmó
    pageNumber: number; posX: number; posY: number; signatureWidth: number; signatureHeight: number;
}

// Datos que recuperamos de un contrato existente
export interface ContractInfo {
    id: string; title: string; pdfUrl_draft: string | null; pdfUrl_signed?: string | null; status?: string;
}

// Resultado combinado para la página de firma
export interface SignerAndContractDataResult { signer: SignerInfo; contract: ContractInfo; }
// ------------------------------------------------------------------------------


// --- Funciones Helper ---
// Ayudan a extraer datos de forma segura de las propiedades de Notion
const getProp = (page: PageObjectResponse, propName: string): any | undefined => {
    if (!page?.properties) return undefined;
    // ¡Case-sensitive y sensible a espacios!
    return (page.properties as any)[propName];
}

const getTitlePlainText = (prop: any): string | undefined => prop?.title?.[0]?.plain_text;
const getRichTextPlainText = (prop: any): string | undefined => prop?.rich_text?.map((rt: any) => rt.plain_text).join('');
const getRichTextContent = (prop: any): string | undefined => prop?.rich_text?.map((rt: any) => rt.plain_text).join('\n');
const getSelectName = (prop: any): string | undefined => prop?.select?.name;
const getEmail = (prop: any): string | undefined => prop?.email;
const getPhoneNumber = (prop: any): string | undefined => prop?.phone_number;
const getNotionUrl = (prop: any): string | null => prop?.url ?? null;
const getNotionNumber = (prop: any): number | null => prop?.number ?? null;
const getNotionDate = (prop: any): { start: string, end: string | null, time_zone: string | null } | null => prop?.date ?? null;
const getRelationIds = (prop: any): string[] => prop?.relation?.map((r: any) => r.id) || [];
// ------------------------------------------------------------------------------


// ================================================================
// --- FUNCIONES PRINCIPALES DEL SERVICIO NOTION ---
// ================================================================

/**
 * Obtiene plantillas activas.
 */
export async function obtenerPlantillas(): Promise<ContractTemplate[]> {
    if (!notion || !templatesDbId) return [];
    console.log("[Notion Service] Obteniendo plantillas activas...");
    try {
        const queryConfig: QueryDatabaseParameters = {
            database_id: templatesDbId,
             // ¡¡AJUSTA NOMBRE 'Estado' y 'Activo'!!
            filter: { property: 'Estado', select: { equals: 'Activo' } }
        };
        const response = await notion.databases.query(queryConfig);
        const results = response.results as PageObjectResponse[];

        const templates = results.map((page): ContractTemplate | null => {
            try {
                 // --- ¡¡AJUSTA NOMBRES de Propiedad!! ---
                 const title = getTitlePlainText(getProp(page, 'Nombre del Contrato')) ?? 'Plantilla sin Título';
                 const category = getSelectName(getProp(page, 'Tipo de Contrato')) ?? 'Sin Categoría';
                 const description = getRichTextPlainText(getProp(page, 'Descripcion')) ?? '';
                 const content = getRichTextContent(getProp(page, 'Plantilla del Contrato')) ?? ''; // Contenido HTML/Texto

                if (!content) { console.warn(`Plantilla ${page.id} (${title}) sin contenido.`); return null; }
                return { id: page.id, title, category, description, content };
            } catch (mapError) { console.error(`Error mapeando template ${page.id}`, mapError); return null; }
        }).filter((t): t is ContractTemplate => t !== null);

        console.log(`[Notion Service] Plantillas activas encontradas: ${templates.length}`);
        return templates;
    } catch (error: any) { console.error("[Notion Service] Error obteniendo plantillas:", error?.body || error.message); return []; }
}

/**
 * Obtiene clientes del CRM (opcional).
 */
export async function listarClientes(): Promise<CrmClient[]> {
    if (!notion || !clientesDbId) return [];
    console.log("[Notion Service] Listando clientes CRM...");
    try {
        // TODO: Implementar paginación si tienes muchos clientes
        const response = await notion.databases.query({ database_id: clientesDbId });
        const results = response.results as PageObjectResponse[];

        const mappedResults = results.map((page): CrmClient | null => {
            try {
                // --- ¡¡AJUSTA NOMBRES de Propiedad!! ---
                const firstName = getTitlePlainText(getProp(page, 'First name')) ?? '';
                const lastName = getRichTextPlainText(getProp(page, 'Last name')) ?? '';
                const email = getEmail(getProp(page, 'Email'));
                const role = getSelectName(getProp(page, 'Role')) ?? 'Unknown';
                const phone = getPhoneNumber(getProp(page, 'Phone'));
                const passport = getRichTextPlainText(getProp(page, 'Passport')) ?? '';
                const address = getRichTextPlainText(getProp(page, 'Address')) ?? '';

                if (!email) { console.warn(`Cliente CRM ${page.id} omitido (sin email).`); return null; }
                return { 
                    id: page.id, 
                    name: `${firstName} ${lastName}`.trim() || email, 
                    email, 
                    role, 
                    phone,
                    passport,
                    address
                };
            } catch (mapError) { console.error(`Error mapeando cliente CRM ${page.id}`, mapError); return null; }
        });
        const validClients = mappedResults.filter((c): c is CrmClient => c !== null);
        console.log(`[Notion Service] Clientes CRM válidos: ${validClients.length}`);
        return validClients;
    } catch (error: any) { console.error("[Notion Service] Error listando clientes CRM:", error?.body || error.message); return []; }
}

/**
 * Crea la página del contrato en la DB Contratos-Creados
 * y la enlaza a los firmantes (si se proporcionan sus IDs).
 */
export async function createNotionContract(
    contractData: {
        title: string;
        pdfUrl_draft: string;
        templateId?: string | number; // ID de la plantilla usada
        generalData?: any; // Datos extra como JSON
    },
    participantSignerIds: string[] = [] // IDs de las páginas de firmantes ya creadas
): Promise<{ id: string } | null> {
    if (!notion || !contratosDbId) {
        console.error("[createNotionContract] Notion o NOTION_DB_CONTRACTS no configurado.");
        return null;
    }
    console.log("[Notion Service] Creando contrato en Notion:", contractData.title);

    try {
        // --- Propiedades Base del Contrato ---
        const properties: Record<string, any> = {
            // --- ¡¡AJUSTA NOMBRES de Propiedad!! ---
            "ContractInstanceID": { title: [{ text: { content: contractData.title } }] }, // Propiedad Title principal
            "Estado": { select: { name: "EnviadoParaFirma" } }, // Estado inicial - ¡Ajusta opción 'EnviadoParaFirma'!
            "PDF Borrador URL": { url: contractData.pdfUrl_draft }, // URL al PDF en Vercel Blob
            "FechaEnvio": { date: { start: new Date().toISOString().split("T")[0] } }, // Fecha de hoy
             // --- ¡¡AJUSTA NOMBRE 'Firmantes'!! ---
             // Enlace a los firmantes (usando los IDs ya creados)
             "Firmantes": { relation: participantSignerIds.map(id => ({ id })) },
        };

        // --- Propiedades Opcionales ---
        if (contractData.templateId) {
             // --- ¡¡AJUSTA NOMBRE 'TemplateUsado'!! ---
            properties["TemplateUsado"] = { relation: [{ id: String(contractData.templateId) }] };
        }
        if (contractData.generalData) {
            // --- ¡¡AJUSTA NOMBRE 'Datos Generales'!! ---
             // Guarda datos extra como JSON en un campo Rich Text
            properties["Datos Generales"] = { rich_text: [{ text: { content: JSON.stringify(contractData.generalData, null, 2) } }] };
        }

        // --- Crear la Página ---
        const contractPage = await notion.pages.create({
            parent: { database_id: contratosDbId },
            properties: properties,
        });

        console.log(`[Notion Service] Contrato creado OK - pageId: ${contractPage.id}`);
        return { id: contractPage.id };

    } catch (e: any) {
        console.error("[Notion Service] Error creando contrato:", e?.body || e.message);
        return null;
    }
}

/**
 * Crea un registro para un firmante en la DB Firmantes,
 * enlazándolo al contrato especificado.
 */
export async function createNotionSigner(signerData: SignerDataInput): Promise<{ id: string } | null> {
    // Use the singleton implementation from notionService instead
    return notionService.createNotionSigner(signerData);
}

/**
 * Obtiene la lista de contratos creados desde Notion.
 * TODO: Implementar paginación si es necesario.
 * TODO: Considerar qué datos son realmente necesarios para la lista (evitar cargar HTML completo).
 */
export async function listarContratosEnviados(): Promise<SentContract[]> { // <--- ¡ASEGÚRATE DE EXPORTARLA!
    // Usa las variables de ID ya definidas al principio del archivo
    if (!notion || !contratosDbId) {
        console.warn("[listarContratosEnviados] Notion client o ID de DB Contratos no disponible.");
        return []; // Devuelve array vacío si no está configurado
    }
    console.log("[Notion Service] Listando contratos enviados/creados...");

    try {
        const queryConfig: QueryDatabaseParameters = {
            database_id: contratosDbId,
            // Opcional: Añade un filtro si solo quieres ciertos estados
            // filter: { property: 'Estado', select: { equals: 'EnviadoParaFirma' } },
            // Opcional: Ordena por fecha de envío descendente
            sorts: [
                {
                    // --- ¡¡AJUSTA NOMBRE 'FechaEnvio' si es diferente!! ---
                    property: 'FechaEnvio', // O la propiedad de fecha que prefieras ordenar
                    direction: 'descending',
                },
            ],
            page_size: 100 // Ajusta si necesitas más o implementas paginación
        };

        const response = await notion.databases.query(queryConfig);
        const results = response.results as PageObjectResponse[];

        console.log(`[Notion Service] Contratos crudos encontrados: ${results.length}`);

        // Asegúrate de que la interfaz SentContract esté importada o definida aquí también si es necesario
        // O importa las funciones helper getProp, getTitlePlainText, etc.
        const contracts = results.map((page): SentContract | null => {
            try {
                // --- ¡¡AJUSTA NOMBRES de Propiedad según tu DB "Contratos-Creados"!! ---
                const title = getTitlePlainText(getProp(page, 'ContractInstanceID')) ?? 'Contrato sin Título';
                const status = getSelectName(getProp(page, 'Estado')) ?? 'Desconocido';
                const dateProp = getNotionDate(getProp(page, 'FechaEnvio')); // O la fecha que quieras mostrar
                const sentDate = dateProp?.start || page.created_time; // Usa fecha envío o fecha creación como fallback

                // --- Simplificaciones para la vista de LISTA ---
                const simplifiedParticipants: SentContract['participants'] = []; // No cargamos participantes aquí
                const simplifiedContent = ""; // No cargamos contenido aquí

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
                console.error(`[Notion Service] Error mapeando contrato ${page.id}:`, mapError);
                return null;
            }
        }).filter((c): c is SentContract => c !== null);

        console.log(`[Notion Service] Contratos mapeados válidos: ${contracts.length}`);
        return contracts;

    } catch (error: any) {
        console.error("[Notion Service] Error listando contratos:", error?.body || error.message);
        return []; // Devuelve array vacío en caso de error
    }
}
/**
 * Obtiene los datos del firmante y del contrato asociado para la página de firma.
 */
export async function getSignerAndContractData(signerId: string, contractId: string): Promise<SignerAndContractDataResult | null> {
    console.log(`[Notion Service] getSignerAndContractData: Buscando signer ${signerId}, contract ${contractId}`);
    if (!notion || !contratosDbId || !firmantesDbId) {
        console.error("[Notion Service] getSignerAndContractData: Configuración Notion incompleta.");
        return null;
    }

    try {
        let signerPage: PageObjectResponse;
        let contractPage: PageObjectResponse;

        // 1. Obtener Firmante
        try {
            signerPage = await notion.pages.retrieve({ page_id: signerId }) as PageObjectResponse;
            if (!signerPage?.properties) throw new Error("Respuesta inválida (firmante).");
        } catch (e: any) { if (e?.code === 'object_not_found') { console.warn(`Firmante ${signerId} no encontrado.`); } else { console.error(`Error recuperando firmante ${signerId}:`, e?.body || e); } return null; }
        const signerProps = signerPage.properties as any;

        // 2. Validar Relación y Obtener ID Contrato
         // --- ¡¡AJUSTA NOMBRE 'Contrato Relacionado'!! ---
        const relatedContractIds = getRelationIds(signerProps['Contrato Relacionado']);
        if (!relatedContractIds.includes(contractId)) {
            console.error(`Error Seguridad/Lógica: Firmante ${signerId} no está relacionado con contrato ${contractId}. Relacionado con: ${relatedContractIds.join(', ')}`);
            return null; // Importante: No permitir si no hay relación explícita
        }

        // 3. Obtener Contrato
        try {
            contractPage = await notion.pages.retrieve({ page_id: contractId }) as PageObjectResponse;
            if (!contractPage?.properties) throw new Error("Respuesta inválida (contrato).");
        } catch (e: any) { if (e?.code === 'object_not_found') { console.warn(`Contrato ${contractId} no encontrado.`); } else { console.error(`Error recuperando contrato ${contractId}:`, e?.body || e); } return null; }
        const contractProps = contractPage.properties as any;

        // 4. Extraer Datos Clave (¡¡AJUSTA NOMBRES!!)
        const draftPdfUrl = getNotionUrl(contractProps['PDF Borrador URL']);
        const signerEmail = getEmail(signerProps['Email']);
        const signedAtDate = getNotionDate(signerProps['Fecha Firma']); // Obtiene el objeto Date
        const signedAt = signedAtDate?.start || null; // Fecha ISO o null
        const contractStatus = getSelectName(contractProps['Estado']);
        const contractTitle = getTitlePlainText(contractProps['ContractInstanceID']) || 'Contrato sin Título';
        const signerName = getTitlePlainText(signerProps['Nombre Firmante']) || 'Firmante Desconocido';
        const signedPdfUrl = getNotionUrl(contractProps['PDF Firmado']) || null;

        // Validaciones mínimas
        if (!draftPdfUrl) { console.error(`Contrato ${contractId} sin 'PDF Borrador URL'.`); return null; }
        if (!signerEmail) { console.error(`Firmante ${signerId} sin 'Email'.`); return null; }

        // 5. Construir Resultado
        const signerResult: SignerInfo = {
            id: signerPage.id,
            name: signerName,
            email: signerEmail,
            signedAt: signedAt,
             // --- ¡¡AJUSTA NOMBRES de coords/tamaño!! ---
            pageNumber: getNotionNumber(signerProps['Página Firma']) ?? 0,
            posX: getNotionNumber(signerProps['Pos X Firma']) ?? 72,
            posY: getNotionNumber(signerProps['Pos Y Firma']) ?? 650,
            signatureWidth: getNotionNumber(signerProps['Ancho Firma']) ?? 150,
            signatureHeight: getNotionNumber(signerProps['Alto Firma']) ?? 60,
        };
        const contractResult: ContractInfo = {
            id: contractPage.id,
            title: contractTitle,
            pdfUrl_draft: draftPdfUrl,
            pdfUrl_signed: signedPdfUrl,
            status: contractStatus || 'unknown',
        };

        console.log("[Notion Service] Datos para firma recuperados OK.");
        return { signer: signerResult, contract: contractResult };

    } catch (error: any) {
        console.error("[Notion Service] Error GENERAL en getSignerAndContractData:", error?.body || error.message || error);
        return null;
    }
}

/**
 * Actualiza la página del firmante en Notion (para marcar la fecha de firma).
 */
export async function updateSignerRecord(signerId: string, data: { signedAt: Date }): Promise<void> {
    if (!notion || !firmantesDbId) { console.warn("updateSignerRecord: Notion no config."); return; }
    console.log(`[Notion Service] Marcando firmante ${signerId} como firmado a las ${data.signedAt.toISOString()}...`);
    try {
        await notion.pages.update({
            page_id: signerId,
            properties: {
                // --- ¡¡AJUSTA NOMBRE 'Fecha Firma'!! ---
                'Fecha Firma': { date: { start: data.signedAt.toISOString() } } // Guarda fecha y hora ISO completa
                // Podrías actualizar también un campo 'Estado Firmante' si lo tienes
            }
        });
        console.log(`[Notion Service] Firmante ${signerId} actualizado OK.`);
    } catch (e: any) { console.error(`Error actualizando firmante ${signerId}:`, e?.body || e.message); }
}

/**
 * Cuenta los firmantes pendientes (sin fecha de firma) para un contrato.
 */
export async function getPendingSignersCount(contractId: string): Promise<number> {
    if (!notion || !firmantesDbId) { console.warn(`getPendingSignersCount: Notion no config. Asumiendo 0 pendientes.`); return 0; }
    console.log(`[Notion Service] Contando firmantes pendientes para contrato ${contractId}...`);
    try {
        let pendingCount = 0;
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const query: QueryDatabaseParameters = {
                database_id: firmantesDbId,
                filter: {
                    and: [
                         // --- ¡¡AJUSTA NOMBRE 'Contrato Relacionado'!! ---
                        { property: 'Contrato Relacionado', relation: { contains: contractId } },
                         // --- ¡¡AJUSTA NOMBRE 'Fecha Firma'!! ---
                        { property: 'Fecha Firma', date: { is_empty: true } } // Sin fecha de firma
                    ]
                },
                page_size: 100 // Máximo permitido por Notion
            };
            if (startCursor) { query.start_cursor = startCursor; }

            const response = await notion.databases.query(query);

            pendingCount += response.results.length;
            hasMore = response.has_more;
            startCursor = response.next_cursor ?? undefined;
        }

        console.log(`[Notion Service] Firmantes pendientes encontrados: ${pendingCount}`);
        return pendingCount;
    } catch (e:any) { console.error(`Error contando firmantes pendientes para ${contractId}:`, e?.body || e.message); return -1; } // Devuelve -1 en error
}

/**
 * Actualiza la página del contrato a estado final ('Firmado').
 */
export async function updateFinalContractStatus(
    contractId: string,
    data: { pdfUrl_signed: string; sha256: string; signedAt: Date; }
): Promise<void> {
    if (!notion || !contratosDbId) { console.warn("updateFinalContractStatus: Notion no config."); return; }
    console.log(`[Notion Service] Actualizando estado final para contrato ${contractId}...`);
    try {
        const properties: Record<string, any> = {
            // --- ¡¡AJUSTA NOMBRES!! ---
            'Estado': { select: { name: 'Firmado' } }, // ¡Ajusta opción 'Firmado'!
            'PDF Firmado': { url: data.pdfUrl_signed },
            'SHA-256 Firmado': { rich_text: [{ text: { content: data.sha256 } }] },
             // Fecha en que se completó la ÚLTIMA firma
            'Fecha Firma Final': { date: { start: data.signedAt.toISOString().split('T')[0] } }
        };

        await notion.pages.update({
            page_id: contractId,
            properties: properties
        });
        console.log(`[Notion Service] Contrato ${contractId} actualizado a estado final OK.`);
    } catch (e: any) { console.error(`Error actualizando estado final contrato ${contractId}:`, e?.body || e.message); }
}

// --- FIN del servicio Notion ---

// Archivo puente que reexporta desde el nuevo servicio refactorizado
export * from './notion-service';

// Esto asegura que todas las funciones que anteriormente se importaban desde '@/services/notion'
// ahora serán redirigidas a los métodos mejorados de la clase NotionService

export const updateSignerContractRelation = (signerId: string, contractId: string): Promise<void> => 
  notionService.updateSignerContractRelation(signerId, contractId);