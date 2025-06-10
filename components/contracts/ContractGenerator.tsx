import React from 'react';
import { Template, Client, GeneralContractData } from '@/lib/types';

interface ContractGeneratorProps {
  template: Template;
  selectedClients: Client[];
  participantPercentages: Record<string, number>;
  generalData: GeneralContractData;
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  template,
  selectedClients,
  participantPercentages,
  generalData
}) => {
  
  // 🎯 LÓGICA DIRECTA: Determinar roles
  const manager = selectedClients.find(client => 
    client.role?.toLowerCase() === 'manager' || 
    client.role?.toLowerCase() === 'representante' ||
    client.role?.toLowerCase() === 'producer' ||
    client.role?.toLowerCase() === 'productor'
  ) || selectedClients[0];
  
  const artist = selectedClients.find(client => 
    client !== manager && (
      client.role?.toLowerCase() === 'artista' || 
      client.role?.toLowerCase() === 'artist'
    )
  ) || selectedClients.find(c => c !== manager) || manager;

  // 🎯 FORMATEAR FECHA
  const formattedDate = generalData.fecha 
    ? new Date(generalData.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      }).replace(/\//g, '-')
    : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  // 🎯 DETERMINAR TIPO DE CONTRATO BASADO EN TEMPLATE
  const getContractTitle = () => {
    const templateName = template?.title?.toLowerCase() || '';
    if (templateName.includes('distribu')) return 'CONTRATO DE DISTRIBUCIÓN MUSICAL';
    if (templateName.includes('represent')) return 'CONTRATO DE REPRESENTACIÓN ARTÍSTICA';
    if (templateName.includes('produc')) return 'CONTRATO DE PRODUCCIÓN MUSICAL';
    return 'CONTRATO DE DISTRIBUCIÓN MUSICAL'; // Por defecto
  };

  // 🎯 GENERAR TABLA DE PARTICIPANTES (CON IPI Y SOCIEDAD DE GESTIÓN)
  const generateParticipantsTable = () => {
    if (selectedClients.length === 0) return '<tr><td colspan="6" style="text-align: center; padding: 15px; font-style: italic;">No hay participantes seleccionados</td></tr>';
    
    return selectedClients.map(client => {
      const percentage = participantPercentages[client.email] || 0;
      const role = client.role || 'Participante';
      const publisherIpi = client.publisherIpi || '---';
      const managementSociety = client.managementSociety || '---';
      
      // Separar nombre y apellido
      const firstName = client.firstName || '';
      const lastName = client.lastName || '';
      
      // Si no hay firstName/lastName individuales, intentar separar del FullName
      if (!firstName && !lastName && client.FullName) {
        const nameParts = client.FullName.split(' ');
        const calculatedFirstName = nameParts[0] || '';
        const calculatedLastName = nameParts.slice(1).join(' ') || '';
        
        return `
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${calculatedFirstName}</td>
            <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${calculatedLastName}</td>
            <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${role}</td>
            <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9; text-align: center;">${percentage > 0 ? percentage + '%' : 'N/A'}</td>
            <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9; text-align: center; font-family: monospace;">${publisherIpi}</td>
            <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9; text-align: center;">${managementSociety}</td>
          </tr>
        `;
      }
      
      return `
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${firstName}</td>
          <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${lastName}</td>
          <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${role}</td>
          <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9; text-align: center;">${percentage > 0 ? percentage + '%' : 'N/A'}</td>
          <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9; text-align: center; font-family: monospace;">${publisherIpi}</td>
          <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9; text-align: center;">${managementSociety}</td>
        </tr>
      `;
    }).join('');
  };

  // 🎯 GENERAR TABLA DE TRACKS (simulada)
  const generateTracksTable = () => {
    const trackTitle = generalData.trackTitle || 'Título de la pista';
    const artistName = artist?.FullName || 'Artista';
    
    return `
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${trackTitle}</td>
        <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">${artistName}</td>
        <td style="padding: 12px; border: 1px solid #ddd; background-color: #f9f9f9;">ISRC-XXXX-XXXX</td>
      </tr>
    `;
  };

  // 🎯 GENERAR CONTRATO PROFESIONAL
  const generateProfessionalContract = () => {
    return `
    <div class="contract-document" style="
      font-family: 'Arial', sans-serif; 
      font-size: 12pt; 
      line-height: 1.4; 
      color: #333; 
      max-width: 210mm; 
      margin: 0 auto; 
      padding: 20mm;
      background: white;
      box-sizing: border-box;
    ">
      
      <!-- ENCABEZADO PRINCIPAL -->
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #4A90E2; padding-bottom: 20px;">
        <h1 style="
          font-size: 18pt; 
          font-weight: bold; 
          margin: 0 0 10px 0; 
          color: #2C3E50;
          letter-spacing: 1px;
        ">${getContractTitle()}</h1>
        <div style="font-size: 10pt; color: #7F8C8D; margin-top: 5px;">
          Documento Legal • ${formattedDate}
        </div>
      </div>

      <!-- INFORMACIÓN BÁSICA -->
      <div style="margin-bottom: 30px;">
        <table style="
          width: 100%; 
          border-collapse: collapse; 
          font-size: 11pt;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <tr style="background-color: #4A90E2; color: white;">
            <td style="padding: 12px; font-weight: bold; text-align: center;">Fecha</td>
            <td style="padding: 12px; font-weight: bold; text-align: center;">Jurisdicción</td>
            <td style="padding: 12px; font-weight: bold; text-align: center;">Duración</td>
            <td style="padding: 12px; font-weight: bold; text-align: center;">Lugar de Firma</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">${formattedDate}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">${generalData.jurisdiction || 'Internacional'}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">${generalData.duracionContrato || '2 años'}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">${generalData.lugarDeFirma || 'Ciudad'}</td>
          </tr>
        </table>
      </div>

      <!-- TÍTULO DE LA OBRA -->
      <div style="margin-bottom: 30px;">
        <h2 style="
          font-size: 14pt; 
          font-weight: bold; 
          margin: 0 0 15px 0; 
          color: #2C3E50;
          border-left: 4px solid #4A90E2;
          padding-left: 15px;
        ">TÍTULO DE LA OBRA</h2>
        <div style="
          padding: 15px; 
          background-color: #f8f9fa; 
          border: 1px solid #e9ecef; 
          border-radius: 4px;
          font-size: 13pt;
        ">
          <strong>${generalData.trackTitle || 'Título de la obra musical'}</strong>
        </div>
      </div>

      <!-- PARTICIPANTES -->
      <div style="margin-bottom: 30px;">
        <h2 style="
          font-size: 14pt; 
          font-weight: bold; 
          margin: 0 0 15px 0; 
          color: #2C3E50;
          border-left: 4px solid #4A90E2;
          padding-left: 15px;
        ">PARTICIPANTES</h2>
        
        <table style="
          width: 100%; 
          border-collapse: collapse; 
          font-size: 11pt;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <thead>
            <tr style="background-color: #4A90E2; color: white;">
              <th style="padding: 12px; font-weight: bold; text-align: center;">Nombre</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">Apellido</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">Rol</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">Porcentaje</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">IPI/CAE</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">Sociedad de Gestión</th>
            </tr>
          </thead>
          <tbody>
            ${generateParticipantsTable()}
          </tbody>
        </table>
      </div>

      <!-- LISTA DE TRACKS -->
      <div style="margin-bottom: 40px;">
        <h2 style="
          font-size: 14pt; 
          font-weight: bold; 
          margin: 0 0 15px 0; 
          color: #2C3E50;
          border-left: 4px solid #4A90E2;
          padding-left: 15px;
        ">LISTA DE TRACKS</h2>
        
        <table style="
          width: 100%; 
          border-collapse: collapse; 
          font-size: 11pt;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <thead>
            <tr style="background-color: #4A90E2; color: white;">
              <th style="padding: 12px; font-weight: bold; text-align: center;">Título</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">Artista</th>
              <th style="padding: 12px; font-weight: bold; text-align: center;">ISRC</th>
            </tr>
          </thead>
          <tbody>
            ${generateTracksTable()}
          </tbody>
        </table>
      </div>

      <!-- TÉRMINOS ECONÓMICOS -->
      <div style="margin-bottom: 40px;">
        <h2 style="
          font-size: 14pt; 
          font-weight: bold; 
          margin: 0 0 15px 0; 
          color: #2C3E50;
          border-left: 4px solid #4A90E2;
          padding-left: 15px;
        ">TÉRMINOS ECONÓMICOS</h2>
        
        <div style="padding: 20px; background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px;">
          <div style="margin-bottom: 10px;">
            <strong>Comisión de Representación:</strong> ${generalData.porcentajeComision || '15'}%
          </div>
          <div style="margin-bottom: 10px;">
            <strong>Monto Fee:</strong> ${generalData.montoFee ? '$' + generalData.montoFee : 'Por definir'}
          </div>
                     <div>
             <strong>Porcentaje de Regalías:</strong> 50%
           </div>
        </div>
      </div>

      <!-- SECCIÓN DE FIRMAS -->
      <div style="margin-top: 60px; page-break-inside: avoid;">
        <h2 style="
          font-size: 14pt; 
          font-weight: bold; 
          margin: 0 0 30px 0; 
          color: #2C3E50;
          text-align: center;
          border-top: 2px solid #4A90E2;
          padding-top: 20px;
        ">FIRMAS</h2>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px;">
          <div style="width: 45%; text-align: center;">
            <div style="
              border-bottom: 2px solid #333; 
              height: 60px; 
              margin-bottom: 10px;
              position: relative;
            "></div>
            <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">
              ${artist?.FullName || 'Artista/Productor'}
            </div>
            <div style="font-size: 10pt; color: #666;">
              Firma del Artista/Productor
            </div>
            <div style="font-size: 9pt; color: #999; margin-top: 5px;">
              Fecha: ________________
            </div>
          </div>
          
          <div style="width: 45%; text-align: center;">
            <div style="
              border-bottom: 2px solid #333; 
              height: 60px; 
              margin-bottom: 10px;
              position: relative;
            "></div>
            <div style="font-weight: bold; font-size: 11pt; margin-bottom: 5px;">
              ${manager?.FullName || 'Representante/Distribuidor'}
            </div>
            <div style="font-size: 10pt; color: #666;">
              Firma del Distribuidor
            </div>
            <div style="font-size: 9pt; color: #999; margin-top: 5px;">
              Fecha: ________________
            </div>
          </div>
        </div>
      </div>

      <!-- PIE DE PÁGINA -->
      <div style="
        margin-top: 40px; 
        padding-top: 20px; 
        border-top: 1px solid #e9ecef; 
        text-align: center; 
        font-size: 9pt; 
        color: #999;
      ">
        <div>Este documento ha sido generado automáticamente el ${formattedDate}</div>
        <div style="margin-top: 5px;">Contrato legal vinculante - Conservar para sus registros</div>
      </div>
    </div>
    `;
  };

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: generateProfessionalContract() }}
      style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '12pt',
        lineHeight: '1.4',
        color: '#333',
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '100%',
        margin: '0 auto'
      }}
    />
  );
};

export default ContractGenerator; 