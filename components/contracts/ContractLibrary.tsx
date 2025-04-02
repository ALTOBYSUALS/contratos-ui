// components/contracts/ContractLibrary.tsx
'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Asegúrate de que estas rutas sean correctas según tu estructura y cómo instaló Shadcn/UI
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { jsPDF } from 'jspdf'; // Verifica que 'jspdf' esté instalado

// --- Definición de Tipos (Interfaces) ---
interface ContractTemplate {
  id: string; // ID de Notion
  title: string;
  category: string;
  description: string;
  content: string;
}

interface CrmClient {
  id: string; // ID de Notion
  name: string;
  email: string;
  role: string;
}
// --- Fin Definición de Tipos ---

// --- NO HAY ARRAYS HARCODEADOS AQUÍ ---

const ContractLibrary = () => {
  // --- Estados para datos, UI y carga ---
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showParticipants, setShowParticipants] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]); // Emails seleccionados
  const [selectedContract, setSelectedContract] = useState<ContractTemplate | null>(null);
  const [crmMode, setCrmMode] = useState(false);
  const [step, setStep] = useState(0); // 0: Library, 1: Preview, 2: Editor, 4: CRM
  const [editedContent, setEditedContent] = useState('');
  // ------------------------------------

  // --- Cargar Datos desde API Routes al inicio ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(">>> ContractLibrary: Iniciando fetch de datos...");
      try {
        const [templatesRes, clientsRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/clients')
        ]);

        // Manejo de errores de red o del servidor para Templates
        if (!templatesRes.ok) {
          const errorText = await templatesRes.text();
          console.error(">>> ContractLibrary: Error fetch templates:", templatesRes.status, errorText);
          throw new Error(`Error al cargar plantillas (${templatesRes.status})`);
        }
        // Manejo de errores de red o del servidor para Clients
        if (!clientsRes.ok) {
          const errorText = await clientsRes.text();
          console.error(">>> ContractLibrary: Error fetch clients:", clientsRes.status, errorText);
          throw new Error(`Error al cargar clientes (${clientsRes.status})`);
        }

        const templatesData: ContractTemplate[] = await templatesRes.json();
        const clientsData: CrmClient[] = await clientsRes.json();

        console.log(">>> ContractLibrary: Plantillas recibidas:", templatesData.length);
        console.log(">>> ContractLibrary: Clientes recibidos:", clientsData.length);

        setTemplates(templatesData);
        setClients(clientsData);

      } catch (err: any) {
        setError(err.message || 'Ocurrió un error cargando los datos.');
        console.error(">>> ContractLibrary: Catch Error en fetchData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Ejecutar solo al montar el componente
  // -------------------------------------------

  // --- Funciones Handler ---
  const goToHome = () => {
    setSelectedContract(null);
    setEditedContent('');
    setSelectedParticipants([]);
    setShowParticipants(false);
    setCrmMode(false);
    setStep(0);
  };

  const handleDownload = () => {
    if (!selectedContract || !editedContent) return;
    try {
       const doc = new jsPDF();
       const lines = doc.splitTextToSize(editedContent, 180); // Ancho en mm (aprox A4)
       doc.setFont("helvetica", "normal"); // Establecer fuente estándar
       doc.setFontSize(10); // Establecer tamaño de fuente
       doc.text(lines, 15, 20); // Margen izquierdo 15mm, superior 20mm
       const filename = (selectedContract.title || 'contrato').replace(/\s+/g, '_') + '.pdf';
       doc.save(filename);
    } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
        alert("Hubo un error al generar el PDF.");
    }
  };

  const applyParticipants = () => {
    setShowParticipants(false);
    // --- Tipo explícito con firma de índice para replacements ---
    const replacements: { [key: string]: string } = {
      // Escapar correctamente los corchetes para RegExp
      '\\[ArtistName\\]': clients.find(c => selectedParticipants.includes(c.email) && c.role === 'Artist')?.name || '[ArtistName]',
      '\\[ProducerName\\]': clients.find(c => selectedParticipants.includes(c.email) && c.role === 'Producer')?.name || '[ProducerName]',
      '\\[songwriter\\]': clients.find(c => selectedParticipants.includes(c.email) && c.role === 'Songwriter')?.name || '[songwriter]'
    };
    // -----------------------------------------------------------
    if (!selectedContract) {
      console.error("applyParticipants: selectedContract es null");
      return;
    }
    // Usar el contenido original del template como base si editedContent está vacío
    let baseContent = selectedContract.content;
    let updated = editedContent || baseContent; // Empezar con lo editado o lo original

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(key, 'g'); // 'g' para reemplazo global
      updated = updated.replace(regex, replacements[key]);
    });

    setEditedContent(updated); // Actualizar el contenido editado
  };

  const handleDetailChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>, placeholder: string) => {
    const { value } = e.target;
    // Reemplazar sobre el contenido actualmente editado o el original si no hay nada editado
    setEditedContent((prevContent) => {
      const currentContent = prevContent || selectedContract?.content || '';
      // Asegurarse de escapar el placeholder si contiene caracteres especiales de regex
      const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\[${escapedPlaceholder}\\]`, 'g');
      return currentContent.replace(regex, value);
    });
  };

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>, clientEmail: string) => {
      const { checked } = e.target;
      setSelectedParticipants((prev) =>
          checked
          ? [...prev, clientEmail]
          : prev.filter((email) => email !== clientEmail)
      );
  };
  // -----------------------

  // --- Renderizado condicional ---
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen p-6">Cargando datos desde Notion...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-600">Error al cargar datos: {error} <button onClick={() => window.location.reload()} className="ml-2 p-1 border rounded">Reintentar</button></div>;
  }
  // -----------------------------

  // --- JSX Principal ---
  return (
    <div className="min-h-screen bg-white text-black p-6 font-sans">
      <h1 className="text-3xl font-semibold mb-6 tracking-tight">📚 Contracts Library</h1>

      {/* Navegación */}
      <div className="mb-6 flex flex-wrap gap-2 sm:gap-4 text-sm border-b pb-4 border-gray-300">
        <Button variant={!crmMode && step === 0 ? 'default' : 'ghost'} onClick={() => { setCrmMode(false); setStep(0); goToHome(); }}>Library</Button>
        <Button variant={!crmMode && step === 1 ? 'default' : 'ghost'} onClick={() => { if(selectedContract) { setCrmMode(false); setStep(1); }}} disabled={!selectedContract}>Preview</Button>
        <Button variant={!crmMode && step === 2 ? 'default' : 'ghost'} onClick={() => { if(selectedContract) { setCrmMode(false); setStep(2); }}} disabled={!selectedContract || !editedContent /* Solo habilitar editor si hay contenido */}>Editor</Button>
        <Button variant={crmMode ? 'default' : 'ghost'} onClick={() => { setSelectedContract(null); setCrmMode(true); setStep(4); }}>CRM</Button>
      </div>

      <AnimatePresence mode="wait">
        {/* PASO 0: Library - Mapea sobre 'templates' del estado */}
        {step === 0 && !crmMode && (
          <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
             {templates.length === 0 && <p>No hay plantillas disponibles.</p>}
             {templates.map((template) => (
               <Card key={template.id} onClick={() => { setSelectedContract(template); setEditedContent(template.content); setStep(1); }} className="bg-white p-5 rounded-xl cursor-pointer hover:bg-gray-100 transition duration-200 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[150px]">
                 <div>
                   <h3 className="text-black text-lg font-medium mb-2 pb-2 border-b border-gray-200">{template.title}</h3>
                   <p className="text-gray-600 text-sm mb-3 flex-grow">{template.description || 'Sin descripción'}</p>
                 </div>
                 <span className="text-xs mt-2 self-start px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold uppercase tracking-wide">{template.category}</span>
               </Card>
             ))}
          </motion.div>
        )}

        {/* PASO 1: Preview */}
        {step === 1 && selectedContract && !crmMode && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="max-w-4xl mx-auto">
            <Card className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-200">
                 <h2 className="text-xl font-semibold text-gray-800">{selectedContract.title}</h2>
                 <Button size="sm" variant="ghost" onClick={goToHome}>← Volver a Library</Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-200 font-mono">{selectedContract.content}</pre>
              <div className="mt-6 flex justify-end gap-2">
                 <Button variant="outline" onClick={() => setStep(0)}>Volver</Button>
                 <Button onClick={() => { setEditedContent(selectedContract.content); setStep(2); }}>Ir al Editor ✏️</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASO 2: Editor */}
        {step === 2 && selectedContract && !crmMode && (
          <motion.div key="editor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="max-w-4xl mx-auto">
            <Card className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-200">
                 <h2 className="text-xl font-semibold text-gray-800">Editando: {selectedContract.title}</h2>
                 <Button size="sm" variant="ghost" onClick={goToHome}>← Volver a Library</Button>
              </div>
              <Textarea
                 className="bg-gray-50 text-sm text-gray-800 h-96 w-full mb-4 border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                 value={editedContent} // Usa el estado editedContent
                 onChange={handleTextareaChange}
              />
              {/* Participantes Seleccionados */}
              <div className="mb-4 flex flex-wrap gap-2 items-center min-h-[30px]">
                  <h3 className="text-sm font-medium text-gray-600 mr-2">Participantes:</h3>
                  {selectedParticipants.length === 0 && <span className="text-xs text-gray-500 italic">Ninguno seleccionado</span>}
                  {selectedParticipants.map((email) => {
                      const client = clients.find(c => c.email === email); // Usa el estado 'clients'
                      return (
                          <span key={email} className="text-xs px-3 py-1 bg-green-100 border border-green-300 rounded-full text-green-800 font-medium">
                          {client?.name || email}{client?.role ? ` (${client.role})` : ''}
                          </span>
                      );
                  })}
              </div>
              {/* Detalles del Contrato */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                 <h3 className="text-base font-semibold text-gray-700 mb-3">📍 Detalles del Contrato</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Campo Ciudad */}
                    <div className="flex flex-col">
                       <label htmlFor="contract-city" className="text-sm font-medium text-gray-700 mb-1">Ciudad:</label>
                       <select id="contract-city" onChange={(e) => handleDetailChange(e, 'Ciudad')} /* ... */ >
                         {/* ... Opciones ... */}
                          <option value="" disabled>Selecciona una ciudad</option>
                          <option value="San Juan">San Juan</option>
                          <option value="Santo Domingo">Santo Domingo</option>
                          <option value="Ciudad de México">Ciudad de México</option>
                          <option value="Buenos Aires">Buenos Aires</option>
                       </select>
                    </div>
                    {/* Campo Fecha */}
                    <div className="flex flex-col">
                       <label htmlFor="contract-date" className="text-sm font-medium text-gray-700 mb-1">Fecha:</label>
                       <input id="contract-date" type="date" onChange={(e) => handleDetailChange(e, 'Fecha')} /* ... */ />
                    </div>
                     {/* Campo Track Title */}
                    <div className="flex flex-col sm:col-span-2">
                       <label htmlFor="contract-trackTitle" className="text-sm font-medium text-gray-700 mb-1">Título de la Obra:</label>
                       <Input id="contract-trackTitle" type="text" placeholder="Escribe el título aquí..." onChange={(e) => handleDetailChange(e, 'trackTitle')} /* ... */ />
                    </div>
                 </div>
              </div>
              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-3 mt-6">
                 <Button variant="outline" onClick={() => setShowParticipants(true)}>👥 Seleccionar Participantes</Button>
                 <div className="flex gap-2 justify-end">
                    <div className="relative group">
                       <Button onClick={() => alert('Funcionalidad Enviar no implementada')} disabled={selectedParticipants.length === 0} /* ... */ >✉️ Enviar Contrato</Button>
                       {selectedParticipants.length === 0 && <span /* Tooltip */>Selecciona al menos un participante...</span>}
                    </div>
                    <Button onClick={handleDownload} disabled={!editedContent}>📄 Descargar PDF</Button>
                 </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASO 4: CRM - Mapea sobre 'clients' del estado */}
        {crmMode && step === 4 && (
          <motion.div key="crm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300">
              <h2 className="text-xl font-semibold text-gray-800">Gestión de Clientes (CRM)</h2>
              <Button onClick={() => alert('Formulario para añadir cliente aquí')}>➕ Añadir Cliente</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.length === 0 && <p>No hay clientes disponibles.</p>}
              {clients.map((client) => (
                <Card key={client.id} /* ... */>
                   <div>
                     <h3>{client.name}</h3>
                     <p>{client.email}</p>
                     <span /* ... */>{client.role}</span>
                   </div>
                   <div /* ... */>
                     <Button size="sm" variant="secondary" onClick={() => alert(`Editar ${client.name}`)}>Editar</Button>
                     <Button size="sm" variant="destructive" onClick={() => alert(`Eliminar ${client.name}`)}>Eliminar</Button>
                   </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Participantes - Mapea sobre 'clients' del estado */}
      {showParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <motion.div /* ... */ className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Seleccionar Participantes</h2>
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
              {clients.map((client) => (
                <label key={client.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={selectedParticipants.includes(client.email)}
                    onChange={(e) => handleCheckboxChange(e, client.email)}
                  />
                  <span className="text-sm text-gray-700">{client.name} – <span className="font-medium">{client.role}</span></span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t pt-4 border-gray-200">
              <Button variant="ghost" onClick={() => setShowParticipants(false)}>Cancelar</Button>
              {/* Llama a applyParticipants para actualizar el texto */}
              <Button onClick={applyParticipants}>Aplicar Selección</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ContractLibrary;