// Script para añadir contratos de muestra al sistema
// npm run dev en otra terminal antes de ejecutar este script
// node scripts/add-sample-contracts.ts

const SAMPLE_CONTRACTS = [
  {
    title: "Contrato de Distribución Musical Digital",
    category: "ACUERDO DE DISTRIBUCIÓN", 
    description: "Contrato profesional para distribución digital de música con splits de regalías y términos comerciales completos",
    content: `
<div class="contract-document" style="font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.4; color: #333; max-width: 210mm; margin: 0 auto; padding: 20mm; background: white;">
  
  <!-- ENCABEZADO PRINCIPAL -->
  <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #4A90E2; padding-bottom: 20px;">
    <h1 style="font-size: 18pt; font-weight: bold; margin: 0 0 10px 0; color: #2C3E50; letter-spacing: 1px;">
      CONTRATO DE DISTRIBUCIÓN MUSICAL DIGITAL
    </h1>
    <div style="font-size: 10pt; color: #7F8C8D; margin-top: 5px;">
      Obra: <strong>[trackTitle]</strong> • Fecha: [Fecha]
    </div>
  </div>

  <!-- INFORMACIÓN BÁSICA -->
  <div style="margin-bottom: 30px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 11pt; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <tr style="background-color: #4A90E2; color: white;">
        <td style="padding: 12px; font-weight: bold; text-align: center;">Fecha de Firma</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Lugar de Firma</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Jurisdicción</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Duración</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[Fecha]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[LugarDeFirma]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[Jurisdiccion]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[DuracionContrato]</td>
      </tr>
    </table>
  </div>

  <!-- PARTES CONTRATANTES -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    PARTES CONTRATANTES
  </h2>
  
  <p><strong>DISTRIBUIDOR:</strong> [ManagerFullName], con documento de identidad [ManagerPassport], domiciliado en [ManagerAddress], email: [ManagerEmail], actuando como distribuidor musical.</p>
  
  <p><strong>ARTISTA:</strong> [ArtistFullName], con documento de identidad [ArtistPassport], domiciliado en [ArtistAddress], email: [ArtistEmail], titular de los derechos de la obra musical.</p>

  <!-- OBRA MUSICAL -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    OBJETO DEL CONTRATO
  </h2>
  
  <p>El presente contrato tiene por objeto la distribución digital de la obra musical titulada <strong>"[trackTitle]"</strong> en todas las plataformas digitales de música, incluyendo pero no limitándose a Spotify, Apple Music, Amazon Music, YouTube Music, Deezer y otras.</p>

  <!-- PARTICIPANTES Y SPLITS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    PARTICIPANTES Y REPARTO DE REGALÍAS
  </h2>
  
  <table style="width: 100%; border-collapse: collapse; font-size: 11pt; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
    <thead>
      <tr style="background-color: #4A90E2; color: white;">
        <th style="padding: 12px; font-weight: bold; text-align: center;">Participante</th>
        <th style="padding: 12px; font-weight: bold; text-align: center;">Rol</th>
        <th style="padding: 12px; font-weight: bold; text-align: center;">Porcentaje</th>
      </tr>
    </thead>
    <tbody>
      [ListaColaboradoresConPorcentaje]
    </tbody>
  </table>

  <!-- TÉRMINOS ECONÓMICOS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    TÉRMINOS ECONÓMICOS
  </h2>
  
  <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p><strong>• Comisión de Distribución:</strong> [PorcentajeComision]% sobre ingresos netos de plataformas digitales</p>
    <p><strong>• Fee Inicial de Setup:</strong> [MontoFee] (pago único por configuración y registro)</p>
    <p><strong>• Frecuencia de Pagos:</strong> Mensual, siguiendo el calendario de pagos de cada plataforma</p>
    <p><strong>• Retención Mínima:</strong> Los pagos se realizarán cuando superen los €50 acumulados</p>
  </div>

  <!-- OBLIGACIONES -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    OBLIGACIONES DE LAS PARTES
  </h2>
  
  <h3 style="color: #4A90E2; margin-top: 20px;">Obligaciones del Distribuidor:</h3>
  <ul style="margin-left: 20px;">
    <li>Subir y distribuir la obra en todas las plataformas digitales acordadas</li>
    <li>Gestionar los metadatos y optimización para discoverabilidad</li>
    <li>Proporcionar reportes mensuales de reproducciones e ingresos</li>
    <li>Mantener la obra disponible durante toda la duración del contrato</li>
  </ul>

  <h3 style="color: #4A90E2; margin-top: 20px;">Obligaciones del Artista:</h3>
  <ul style="margin-left: 20px;">
    <li>Garantizar la originalidad y titularidad de la obra</li>
    <li>Proporcionar archivos de audio en calidad profesional (WAV 24-bit/44.1kHz mínimo)</li>
    <li>Suministrar artwork oficial y materiales promocionales</li>
    <li>Promocionar activamente la obra en sus canales</li>
  </ul>

  <!-- DURACIÓN Y TERMINACIÓN -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    DURACIÓN Y TERMINACIÓN
  </h2>
  
  <p>Este contrato tendrá una duración de <strong>[DuracionContrato]</strong> a partir de la fecha de firma. Cualquiera de las partes podrá terminarlo con un preaviso por escrito de 30 días. En caso de terminación, la obra permanecerá en plataformas hasta el final del período contractual vigente.</p>

  <!-- FIRMAS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 40px 0 20px 0; color: #2C3E50; border-left: 4px solid #4A90E2; padding-left: 15px;">
    FIRMAS DIGITALES
  </h2>
  
  [Firmas]
  
  <div style="margin-top: 30px; padding: 15px; background-color: #f0f8ff; border: 1px solid #4A90E2; border-radius: 6px; font-size: 10pt; color: #2C3E50;">
    <strong>Nota Legal:</strong> Este documento ha sido firmado digitalmente y tiene plena validez legal. El hash SHA-256 del documento garantiza su integridad e inalterabilidad.
  </div>
</div>
    `
  },

  {
    title: "Acuerdo de Splits y Colaboración Musical",
    category: "MUSIC SPLITS",
    description: "Contrato para colaboraciones musicales con distribución equitativa de derechos, regalías y créditos autorales",
    content: `
<div class="contract-document" style="font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.4; color: #333; max-width: 210mm; margin: 0 auto; padding: 20mm; background: white;">
  
  <!-- ENCABEZADO PRINCIPAL -->
  <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #E74C3C; padding-bottom: 20px;">
    <h1 style="font-size: 18pt; font-weight: bold; margin: 0 0 10px 0; color: #2C3E50; letter-spacing: 1px;">
      ACUERDO DE SPLITS Y COLABORACIÓN MUSICAL
    </h1>
    <div style="font-size: 10pt; color: #7F8C8D; margin-top: 5px;">
      Colaboración: <strong>[trackTitle]</strong> • Fecha: [Fecha]
    </div>
  </div>

  <!-- INFORMACIÓN BÁSICA -->
  <div style="margin-bottom: 30px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 11pt; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <tr style="background-color: #E74C3C; color: white;">
        <td style="padding: 12px; font-weight: bold; text-align: center;">Fecha</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Lugar</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Jurisdicción</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Vigencia</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[Fecha]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[LugarDeFirma]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[Jurisdiccion]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[DuracionContrato]</td>
      </tr>
    </table>
  </div>

  <!-- COLABORADORES -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #E74C3C; padding-left: 15px;">
    COLABORADORES DE LA OBRA
  </h2>
  
  <p>Los siguientes artistas y profesionales han participado en la creación de la obra musical <strong>"[trackTitle]"</strong> y acuerdan los términos de colaboración establecidos en este documento:</p>

  <!-- TABLA DE COLABORADORES -->
  <table style="width: 100%; border-collapse: collapse; font-size: 11pt; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0;">
    <thead>
      <tr style="background-color: #E74C3C; color: white;">
        <th style="padding: 12px; font-weight: bold; text-align: center;">Colaborador</th>
        <th style="padding: 12px; font-weight: bold; text-align: center;">Contribución</th>
        <th style="padding: 12px; font-weight: bold; text-align: center;">% Derechos</th>
        <th style="padding: 12px; font-weight: bold; text-align: center;">% Master</th>
      </tr>
    </thead>
    <tbody>
      [ListaColaboradoresConPorcentaje]
    </tbody>
  </table>

  <!-- DERECHOS Y SPLITS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #E74C3C; padding-left: 15px;">
    DISTRIBUCIÓN DE DERECHOS
  </h2>
  
  <div style="background-color: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="color: #E74C3C; margin-top: 0;">Derechos de Autor (Publishing)</h3>
    <p>Los derechos de autor se distribuirán según los porcentajes acordados en la tabla superior. Cada colaborador recibirá royalties de:</p>
    <ul style="margin-left: 20px;">
      <li>Streaming y descargas digitales</li>
      <li>Sincronización en medios audiovisuales</li>
      <li>Radiodifusión y performance pública</li>
      <li>Usos comerciales y publicitarios</li>
    </ul>

    <h3 style="color: #E74C3C;">Derechos de Grabación (Master)</h3>
    <p>Los derechos sobre la grabación master se distribuyen según los porcentajes acordados. Incluye ingresos por:</p>
    <ul style="margin-left: 20px;">
      <li>Reproducciones en plataformas digitales</li>
      <li>Ventas físicas y digitales</li>
      <li>Licencias para remixes y samples</li>
      <li>Usos en contenido audiovisual</li>
    </ul>
  </div>

  <!-- GESTIÓN Y ADMINISTRACIÓN -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #E74C3C; padding-left: 15px;">
    GESTIÓN DE LA COLABORACIÓN
  </h2>
  
  <p><strong>Administrador Principal:</strong> [ManagerFullName] actuará como administrador principal de la obra, responsable de:</p>
  <ul style="margin-left: 20px;">
    <li>Registro en sociedades de gestión colectiva (SGAE, ASCAP, BMI, etc.)</li>
    <li>Distribución digital en plataformas de streaming</li>
    <li>Negociación de licencias y sincronizaciones</li>
    <li>Reportes trimestrales de ingresos y distribución de pagos</li>
  </ul>

  <!-- COMPROMISOS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #E74C3C; padding-left: 15px;">
    COMPROMISOS DE LOS COLABORADORES
  </h2>
  
  <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
    <p><strong>• Originalidad:</strong> Cada colaborador garantiza que su contribución es original y no infringe derechos de terceros</p>
    <p><strong>• Exclusividad:</strong> La obra no podrá ser re-grabada o versionada sin consentimiento de todos los colaboradores</p>
    <p><strong>• Promoción:</strong> Todos los colaboradores se comprometen a promocionar la obra en sus canales</p>
    <p><strong>• Créditos:</strong> Los créditos aparecerán como "[ListaColaboradores]" en todas las plataformas</p>
  </div>

  <!-- PAGOS Y TRANSPARENCIA -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #E74C3C; padding-left: 15px;">
    PAGOS Y TRANSPARENCIA
  </h2>
  
  <p>Los pagos se realizarán mensualmente según los siguientes términos:</p>
  <ul style="margin-left: 20px;">
    <li><strong>Frecuencia:</strong> Pagos mensuales, dentro de los primeros 15 días del mes siguiente</li>
    <li><strong>Mínimo de Pago:</strong> €25 por colaborador por plataforma</li>
    <li><strong>Transparencia:</strong> Dashboard compartido con datos en tiempo real</li>
    <li><strong>Comisión Administrativa:</strong> [PorcentajeComision]% para gastos de gestión y administración</li>
  </ul>

  <!-- FIRMAS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 40px 0 20px 0; color: #2C3E50; border-left: 4px solid #E74C3C; padding-left: 15px;">
    FIRMAS Y CONSENTIMIENTO
  </h2>
  
  [Firmas]
  
  <div style="margin-top: 30px; padding: 15px; background-color: #fff5f5; border: 1px solid #E74C3C; border-radius: 6px; font-size: 10pt; color: #2C3E50;">
    <strong>Validación Digital:</strong> Este acuerdo ha sido firmado digitalmente por todos los colaboradores. La firma digital tiene la misma validez legal que una firma manuscrita.
  </div>
</div>
    `
  },

  {
    title: "Contrato de Representación Artística Profesional", 
    category: "REPRESENTACIÓN",
    description: "Contrato completo de representación artística con términos comerciales, promoción y gestión de carrera musical",
    content: `
<div class="contract-document" style="font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.4; color: #333; max-width: 210mm; margin: 0 auto; padding: 20mm; background: white;">
  
  <!-- ENCABEZADO PRINCIPAL -->
  <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #8E44AD; padding-bottom: 20px;">
    <h1 style="font-size: 18pt; font-weight: bold; margin: 0 0 10px 0; color: #2C3E50; letter-spacing: 1px;">
      CONTRATO DE REPRESENTACIÓN ARTÍSTICA PROFESIONAL
    </h1>
    <div style="font-size: 10pt; color: #7F8C8D; margin-top: 5px;">
      Artista: <strong>[ArtistFullName]</strong> • Fecha: [Fecha]
    </div>
  </div>

  <!-- INFORMACIÓN BÁSICA -->
  <div style="margin-bottom: 30px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 11pt; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <tr style="background-color: #8E44AD; color: white;">
        <td style="padding: 12px; font-weight: bold; text-align: center;">Fecha de Inicio</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Lugar</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Jurisdicción</td>
        <td style="padding: 12px; font-weight: bold; text-align: center;">Duración</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[Fecha]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[LugarDeFirma]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[Jurisdiccion]</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background-color: #f8f9fa;">[DuracionContrato]</td>
      </tr>
    </table>
  </div>

  <!-- PARTES CONTRATANTES -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    PARTES CONTRATANTES
  </h2>
  
  <div style="background-color: #f8f7fc; border: 1px solid #d1c4e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p><strong>REPRESENTANTE/MANAGER:</strong></p>
    <ul style="margin-left: 20px; margin-bottom: 15px;">
      <li>Nombre: [ManagerFullName]</li>
      <li>Documento: [ManagerPassport]</li>
      <li>Dirección: [ManagerAddress]</li>
      <li>Email: [ManagerEmail]</li>
      <li>Teléfono: [ManagerPhone]</li>
    </ul>
    
    <p><strong>ARTISTA REPRESENTADO:</strong></p>
    <ul style="margin-left: 20px;">
      <li>Nombre Artístico: [ArtistFullName]</li>
      <li>Documento: [ArtistPassport]</li>
      <li>Dirección: [ArtistAddress]</li>
      <li>Email: [ArtistEmail]</li>
      <li>Teléfono: [ArtistPhone]</li>
    </ul>
  </div>

  <!-- SERVICIOS DE REPRESENTACIÓN -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    SERVICIOS DE REPRESENTACIÓN
  </h2>
  
  <p>El Representante se compromete a brindar los siguientes servicios profesionales:</p>

  <h3 style="color: #8E44AD; margin-top: 20px;">🎵 Gestión Musical y Artística</h3>
  <ul style="margin-left: 20px;">
    <li>Desarrollo y planificación estratégica de carrera artística</li>
    <li>Negociación de contratos discográficos y de distribución</li>
    <li>Gestión de derechos de autor y conexos</li>
    <li>Supervisión de grabaciones y producciones musicales</li>
  </ul>

  <h3 style="color: #8E44AD; margin-top: 20px;">🎤 Booking y Conciertos</h3>
  <ul style="margin-left: 20px;">
    <li>Booking de conciertos, festivales y giras</li>
    <li>Negociación de contratos de actuación</li>
    <li>Coordinación logística de eventos</li>
    <li>Gestión de riders técnicos y hospitality</li>
  </ul>

  <h3 style="color: #8E44AD; margin-top: 20px;">📱 Marketing y Promoción</h3>
  <ul style="margin-left: 20px;">
    <li>Estrategia de marketing digital y tradicional</li>
    <li>Gestión de redes sociales y plataformas digitales</li>
    <li>Relaciones públicas y medios de comunicación</li>
    <li>Coordinación de campañas publicitarias</li>
  </ul>

  <!-- TÉRMINOS ECONÓMICOS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    TÉRMINOS ECONÓMICOS
  </h2>
  
  <div style="background-color: #f8f7fc; border: 1px solid #d1c4e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="color: #8E44AD; margin-top: 0;">Comisiones de Representación</h3>
    <p><strong>• Comisión General:</strong> [PorcentajeComision]% sobre todos los ingresos brutos del artista</p>
    <p><strong>• Fee de Setup Inicial:</strong> [MontoFee] (pago único al inicio de la representación)</p>
    <p><strong>• Booking Comisión:</strong> 15% adicional sobre ingresos de conciertos y eventos en vivo</p>
    <p><strong>• Deals Especiales:</strong> 20% sobre contratos discográficos, sync y brand partnerships</p>
    
    <h3 style="color: #8E44AD;">Estructura de Pagos</h3>
    <p>• Pagos mensuales dentro de los primeros 15 días del mes siguiente</p>
    <p>• Reportes detallados de todas las actividades y ingresos</p>
    <p>• Acceso a dashboard en tiempo real con métricas de carrera</p>
  </div>

  <!-- OBLIGACIONES DEL ARTISTA -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    OBLIGACIONES DEL ARTISTA
  </h2>
  
  <ul style="margin-left: 20px;">
    <li><strong>Exclusividad:</strong> El artista se compromete a trabajar exclusivamente con el representante en las áreas acordadas</li>
    <li><strong>Disponibilidad:</strong> Mantener disponibilidad para reuniones, eventos y compromisos profesionales</li>
    <li><strong>Colaboración:</strong> Cooperar activamente en estrategias de marketing y promoción</li>
    <li><strong>Profesionalismo:</strong> Mantener conducta profesional en todos los eventos y apariciones públicas</li>
    <li><strong>Comunicación:</strong> Informar al representante sobre todas las oportunidades y ofertas recibidas</li>
  </ul>

  <!-- TERRITORIOS Y EXCLUSIVIDAD -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    TERRITORIOS Y EXCLUSIVIDAD
  </h2>
  
  <p>Esta representación aplica para los siguientes territorios y servicios:</p>
  <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
    <p><strong>• Territorio:</strong> Mundial (con posibilidad de sub-agentes locales)</p>
    <p><strong>• Servicios Exclusivos:</strong> Management general, booking, negociación de contratos</p>
    <p><strong>• Servicios No Exclusivos:</strong> Colaboraciones puntuales, features, producciones independientes</p>
  </div>

  <!-- TERMINACIÓN DEL CONTRATO -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 30px 0 15px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    TERMINACIÓN Y DURACIÓN
  </h2>
  
  <p>Este contrato tendrá una duración de <strong>[DuracionContrato]</strong> y podrá ser terminado por cualquiera de las partes bajo las siguientes condiciones:</p>
  <ul style="margin-left: 20px;">
    <li>Preaviso por escrito de 60 días</li>
    <li>Incumplimiento grave de las obligaciones contractuales</li>
    <li>Mutuo acuerdo entre las partes</li>
    <li>Imposibilidad sobrevenida para cumplir las obligaciones</li>
  </ul>

  <!-- FIRMAS -->
  <h2 style="font-size: 14pt; font-weight: bold; margin: 40px 0 20px 0; color: #2C3E50; border-left: 4px solid #8E44AD; padding-left: 15px;">
    FIRMAS Y ACEPTACIÓN
  </h2>
  
  [Firmas]
  
  <div style="margin-top: 30px; padding: 15px; background-color: #f8f7fc; border: 1px solid #8E44AD; border-radius: 6px; font-size: 10pt; color: #2C3E50;">
    <strong>Nota Legal:</strong> Este contrato de representación ha sido firmado digitalmente y constituye un acuerdo legalmente vinculante entre las partes. Todas las firmas digitales han sido validadas y verificadas.
  </div>
</div>
    `
  }
];

async function addSampleContracts() {
  const API_BASE = 'http://localhost:3000';
  
  console.log('🎯 Añadiendo contratos de muestra...');
  
  for (const contract of SAMPLE_CONTRACTS) {
    try {
      console.log(`📝 Creando: ${contract.title}`);
      
      const response = await fetch(`${API_BASE}/api/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contract)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ Error creando ${contract.title}:`, error);
        continue;
      }
      
      const result = await response.json();
      console.log(`✅ Creado: ${result.title} (ID: ${result.id})`);
      
    } catch (error) {
      console.error(`❌ Error con ${contract.title}:`, error);
    }
  }
  
  console.log('🎉 ¡Proceso completado!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addSampleContracts().catch(console.error);
}

module.exports = { addSampleContracts, SAMPLE_CONTRACTS }; 