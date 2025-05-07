export type ContractTemplate = {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string; // HTML o Markdown del contenido de la plantilla
  status: string; // Por ejemplo: 'Activa', 'Archivada'
  // ... cualquier otra propiedad que necesites para una plantilla de contrato
}; 