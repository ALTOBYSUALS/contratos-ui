
// components/contracts/ContractLibrary.tsx
"use client";
// --- ESTA LÍNEA DEBE QUEDARSE ---

import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner"; // Using sonner
import { jsPDF } from "jspdf";
// import html2canvas from 'html2canvas'; // Keep for potential future use or complex elements, though manual is primary now
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from "docx"; // Added StyleLevel, AlignmentType
import * as mammoth from "mammoth";

// --- Shadcn/UI Imports ---
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
// --- Fin Shadcn/UI Imports ---

// --- Lucide Icons ---
import {
    X, Save, UserPlus, Download, Trash2, Edit, Percent, AlertTriangle,
    Bold, Italic, Sparkles, Upload, Search, Strikethrough, ListOrdered, List,
    ArrowLeft, Library, Send, CheckCircle, Users, Eye, Edit2, Plus, Settings2,
    Code, Quote, Underline, ImagePlus, Loader2 // Added Loader icon
} from "lucide-react";
// -----------------------

// --- Tipos (asumiendo que están en '@/lib/types') ---
import type { Client, Template, SentContract, GeneralContractData, ParticipantFinal } from '@/lib/types';
// --- FIN DE LÍNEA A MANTENER ---

import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";

const INITIAL_NEW_CLIENT_STATE: Partial<Omit<Client, "id" | "added" | "FullName" | "Firma">> = {
    firstName: "", lastName: "", email: "", phone: "", role: "", publisherIpi: "", dateOfBirth: "", passport: "", expirationDate: "", address: "", country: "", facebook: "", instagram: "", linkedin: "", twitter: "", labelName: "", labelEmail: "", labelPhone: "", labelAddress: "", labelCountry: "", publisherName: "", publisherEmail: "", publisherPhone: "", publisherAddress: "", publisherCountry: ""
};
const INITIAL_NEW_TEMPLATE_STATE = { title: "", category: "", description: "", content: "" };


// --- Helper Function: createClientObject ---
const createClientObject = (data: Record<string, any>, idOverride?: string): Client => { // Manteniendo any aquí, ya que ESLint está en 'warn'
    const firstName = data.firstName?.trim() || "";
    const lastName = data.lastName?.trim() || "";
    let calculatedFullName = `${firstName} ${lastName}`.trim();
    // Fallbacks for name calculation
    if (!calculatedFullName && data.FullName) calculatedFullName = data.FullName;
    if (!calculatedFullName && data.name) calculatedFullName = data.name;
    if (!calculatedFullName && data.labelName) calculatedFullName = data.labelName; // Use label name if person name missing
    if (!calculatedFullName && data.publisherName) calculatedFullName = data.publisherName; // Use publisher name

    // Ensure name has a fallback if everything else is empty
    const displayName = calculatedFullName || data.email || `Cliente ${data.id || 'Desconocido'}`;

    return {
        id: idOverride || data.id || `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: displayName,
        firstName, lastName,
        email: data.email?.trim() || "",
        phone: data.phone || undefined,
        role: data.role || undefined,
        publisherIpi: data.publisherIpi || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        passport: data.passport || undefined,
        expirationDate: data.expirationDate || undefined,
        address: data.address || undefined,
        country: data.country || undefined,
        added: data.added || new Date().toISOString(),
        facebook: data.facebook || undefined,
        instagram: data.instagram || undefined,
        linkedin: data.linkedin || undefined,
        twitter: data.twitter || undefined,
        labelName: data.labelName || undefined,
        labelEmail: data.labelEmail || undefined,
        labelPhone: data.labelPhone || undefined,
        labelAddress: data.labelAddress || undefined,
        labelCountry: data.labelCountry || undefined,
        publisherName: data.publisherName || undefined,
        publisherEmail: data.publisherEmail || undefined,
        publisherPhone: data.publisherPhone || undefined,
        publisherAddress: data.publisherAddress || undefined,
        publisherCountry: data.publisherCountry || undefined,
        // Calculated fields
        FullName: calculatedFullName || displayName, // Ensure FullName has a value
        Firma: `Firma: ${calculatedFullName || '_______________________'}`, // Use calculated or placeholder
    };
};
// --- END Helper ---

// --- EDITOR TOOLBAR COMPONENT (Assumed Correct and stable) ---
interface EditorToolbarProps {
    onCommand: (command: string, value?: string) => void;
    onFormatCode: () => void;
    onInsertBlockquote: () => void;
    onTriggerImageUpload: () => void;
    onFontSizeChange: (size: string) => void;
}
const EditorToolbar: React.FC<EditorToolbarProps> = ({
    onCommand, onFormatCode, onInsertBlockquote, onTriggerImageUpload, onFontSizeChange
}) => {
    return (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b bg-gray-50 rounded-t-md sticky top-0 z-10">
            <Button variant="outline" size="icon" className="h-8 w-8" title="Negrita" aria-label="Negrita" onClick={() => onCommand("bold")}> <Bold size={16} /> </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" title="Cursiva" aria-label="Cursiva" onClick={() => onCommand("italic")}> <Italic size={16} /> </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" title="Subrayado" aria-label="Subrayado" onClick={() => onCommand("underline")}> <Underline size={16} /> </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" title="Tachado" aria-label="Tachado" onClick={() => onCommand("strikeThrough")}> <Strikethrough size={16} /> </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <div className="flex items-center">
                <select
                    className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => onFontSizeChange(e.target.value)} title="Tamaño de texto" aria-label="Tamaño de texto" defaultValue=""
                >
                    <option value="">Tamaño</option> <option value="1">Muy pequeño</option> <option value="2">Pequeño</option> <option value="3">Normal</option> <option value="4">Grande</option> <option value="5">Más grande</option> <option value="6">Muy grande</option> <option value="7">Máximo</option>
                </select>
            </div>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="outline" size="icon" className="h-8 w-8" title="Lista Ordenada" aria-label="Lista Ordenada" onClick={() => onCommand("insertOrderedList")}> <ListOrdered size={16} /> </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" title="Lista Desordenada" aria-label="Lista Desordenada" onClick={() => onCommand("insertUnorderedList")}> <List size={16} /> </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="outline" size="icon" className="h-8 w-8" title="Bloque de Cita" aria-label="Bloque de Cita" onClick={onInsertBlockquote}> <Quote size={16} /> </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" title="Código" aria-label="Código" onClick={onFormatCode}> <Code size={16} /> </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="outline" size="icon" className="h-8 w-8" title="Insertar Imagen" aria-label="Insertar Imagen" onClick={onTriggerImageUpload}> <ImagePlus size={16} /> </Button>
        </div>
    );
};
// --- END EDITOR TOOLBAR COMPONENT ---

// =============================================
// --- Componente Principal: ContractLibrary ---
// =============================================
const ContractLibrary = () => { // <--- Inicio del componente

    // ***** PÉGALO AQUÍ *****
    const [generalData, setGeneralData] = useState<GeneralContractData>({
        jurisdiction: "",
        fecha: "",
        trackTitle: "",
        lugarDeFirma: "",
        areaArtistica: "",
        duracionContrato: "",
        periodoAviso: "",
    });
    // ***** FIN *****
    const [templates, setTemplates] = useState<Template[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [sentContracts, setSentContracts] = useState<SentContract[]>([]); // Consider fetching this too
    const [isLoading, setIsLoading] = useState(true); // Combined loading state for initial data
    const [isSubmitting, setIsSubmitting] = useState(false); // For forms, saving templates/clients
    const [error, setError] = useState<string | null>(null); // Combined error state
    const [isSending, setIsSending] = useState(false); // For sending the final contract
    const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false); // For AI template generation
    const [isFinalizingWithAI, setIsFinalizingWithAI] = useState(false); // (ADDED AS PER INSTRUCTIONS) For AI finalization step

    const [selectedContract, setSelectedContract] = useState<Template | null>(null);
    const [editedContent, setEditedContent] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [participantPercentages, setParticipantPercentages] = useState<{ [email: string]: number }>({});

    const [step, setStep] = useState(0); // 0: Library, 1: Preview, 2: Editor, 3: Sent, 4: CRM (via crmMode), 5: Signed
    const [crmMode, setCrmMode] = useState(false);

    const [searchQuery, setSearchQuery] = useState(""); // For participant search in editor sidebar
    const [templateSearchQuery, setTemplateSearchQuery] = useState(""); // For library/CRM search

    const [showAddClientSidebar, setShowAddClientSidebar] = useState(false);
    const [showEditClientSidebar, setShowEditClientSidebar] = useState(false);
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
    const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [viewingSentContract, setViewingSentContract] = useState<SentContract | null>(null);
    const [confirmingDeleteClient, setConfirmingDeleteClient] = useState<Client | null>(null);
    const [confirmingDeleteTemplate, setConfirmingDeleteTemplate] = useState<Template | null>(null); // For template deletion confirmation

    const [newClient, setNewClient] = useState<Partial<Client>>(INITIAL_NEW_CLIENT_STATE);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [editedClientData, setEditedClientData] = useState<Partial<Client>>({}); // Store only changes
    const [newTemplate, setNewTemplate] = useState(INITIAL_NEW_TEMPLATE_STATE);
    const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null); // Holds full template being edited
    const [aiPrompt, setAiPrompt] = useState("");

    const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    // --- Refs ---
    const addClientSidebarRef = useRef<HTMLDivElement>(null);
    const editClientSidebarRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // --- Data Fetching ---
    useEffect(() => {
        // Define la función asíncrona DENTRO del useEffect
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            console.log(">>> Fetching initial data...");
            try {
                const [templatesRes, clientsRes, sentContractsRes] = await Promise.all([
                    fetch('/api/templates'),
                    fetch('/api/clients'),
                    fetch('/api/contracts')
                ]);

                // Validaciones de respuesta...
                if (!templatesRes.ok) throw new Error(`Plantillas API Error: ${templatesRes.status} ${templatesRes.statusText}`);
                if (!clientsRes.ok) throw new Error(`Clientes API Error: ${clientsRes.status} ${clientsRes.statusText}`);
                if (!sentContractsRes.ok) console.warn(`Enviados API Warning: ${sentContractsRes.status} ${sentContractsRes.statusText}`);

                const templatesData: Template[] = await templatesRes.json();
                // --- CORRECCIÓN: Tipar correctamente clientsDataRaw ---
                const clientsDataRaw: Record<string, any>[] = await clientsRes.json(); // <-- Tipo corregido
                const sentContractsData: SentContract[] = sentContractsRes.ok ? await sentContractsRes.json() : [];

                // --- CORRECCIÓN: Usar createClientObject sin 'as' ---
                const clientsDataProcessed: Client[] = clientsDataRaw.map(clientRaw => createClientObject(clientRaw)); // <-- 'as' eliminado

                // Actualiza estados
                setTemplates(templatesData.sort((a, b) => a.title.localeCompare(b.title)));
                setClients(clientsDataProcessed.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '')));
                setSentContracts(sentContractsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

                console.log(">>> Initial Data OK:", { templates: templatesData.length, clients: clientsDataProcessed.length, sent: sentContractsData.length });

            } catch (error: unknown) { // <-- Catch corregido con unknown
                console.error(">>> Initial Fetch Error:", error);
                let errorMessage = "Ocurrió un error desconocido al cargar los datos iniciales.";
                if (error instanceof Error) { errorMessage = error.message; }
                 else if (typeof error === 'string') { errorMessage = error; }
                setError(errorMessage); // Actualiza estado de error
                toast.error("Error cargando datos iniciales", { description: errorMessage }); // Muestra toast
            } finally {
                setIsLoading(false); // Asegura quitar el estado de carga
            }
        }; // <-- Fin de la definición de fetchData

        // --- LLAMA A LA FUNCIÓN ASÍNCRONA ---
        fetchData();
        // ------------------------------------

    }, []); // <-- Array de dependencias vacío para que se ejecute solo una vez al montar


    // --- Placeholder Replacement Logic (con Logs y manejo de tipos y dependencias) ---
     const applyAllDataToContent = useCallback(() => {
        console.log(`>>> applyAllDataToContent called. Current step: ${step}`); // Log inicial

        // 1. Determinar el contenido base
        let baseContentSource = "";
        let baseContent = "";

        if (step === 2 && editorRef.current) {
            baseContent = editorRef.current.innerHTML;
            baseContentSource = "editorRef.current.innerHTML";
            console.log(`>>> applyAllDataToContent: Trying editorRef.current.innerHTML.`);
        } else if (editedContent) {
            baseContent = editedContent;
            baseContentSource = "editedContent state";
            console.log(`>>> applyAllDataToContent: Falling back to editedContent state.`);
        } else if (selectedContract?.content) {
            baseContent = selectedContract.content;
            baseContentSource = "selectedContract.content";
            console.log(`>>> applyAllDataToContent: Falling back to selectedContract.content.`);
        } else {
            baseContentSource = "None";
            console.log(`>>> applyAllDataToContent: No base content source found.`);
        }

        console.log(`>>> applyAllDataToContent: Selected source: ${baseContentSource}`);
        console.log(`>>> applyAllDataToContent: Base content (first 200): ${baseContent ? baseContent.substring(0, 200) + "..." : "EMPTY"}`);

        if (!baseContent || !baseContent.trim()) {
            console.warn(">>> applyAllDataToContent: Base content is empty or whitespace. Returning empty string.");
            return "";
        }

        let updatedContent = baseContent;

        // --- 2. Reemplazar Datos Generales ---
        try {
            console.log(">>> applyAllDataToContent: Replacing General Data...");
            updatedContent = updatedContent.replace(/\[Jurisdiccion\]/gi, generalData.jurisdiction || "");
            updatedContent = updatedContent.replace(/\[Fecha\]/gi, generalData.fecha || "");
            updatedContent = updatedContent.replace(/\[trackTitle\]/gi, generalData.trackTitle || "");
            updatedContent = updatedContent.replace(/\[LugarDeFirma\]/gi, generalData.lugarDeFirma || "");
            updatedContent = updatedContent.replace(/\[AreaArtistica\]/gi, generalData.areaArtistica || "");
            updatedContent = updatedContent.replace(/\[DuracionContrato\]/gi, generalData.duracionContrato || "");
            updatedContent = updatedContent.replace(/\[PeriodoAviso\]/gi, generalData.periodoAviso || "");

        } catch (error: unknown) { console.error("Error replacing general placeholders:", error); } // Usa unknown

        // --- 3. Reemplazar Datos de Participantes ---
        const participantReplacements: { [placeholder: string]: string } = {};
        if (selectedParticipants.length > 0 && clients.length > 0) {
            console.log(">>> applyAllDataToContent: Preparing participant replacements...");
            // --- CORRECCIÓN: Usar 'email' en lugar de '_email' ---
            selectedParticipants.forEach((email) => { // <-- Corregido
                const client = clients.find((c) => c.email === email); // <-- Corregido
                const percentageStr = (participantPercentages[email] || 0).toFixed(2); // <-- Corregido
                if (client) {
                    const clientPlaceholders: Record<string, string | undefined> = { /* ... pon aquí TODAS las claves que necesitas */
                        FullName: client.FullName, Name: client.name, FirstName: client.firstName,
                        LastName: client.lastName, Email: client.email, Phone: client.phone, Role: client.role,
                        Passport: client.passport, Address: client.address, Country: client.country, DOB: client.dateOfBirth,
                        Facebook: client.facebook, Instagram: client.instagram, Linkedin: client.linkedin, Twitter: client.twitter,
                        LabelName: client.labelName, LabelEmail: client.labelEmail, LabelPhone: client.labelPhone, LabelAddress: client.labelAddress, LabelCountry: client.labelCountry,
                        PublisherName: client.publisherName, PublisherEmail: client.publisherEmail, PublisherPhone: client.publisherPhone, PublisherAddress: client.publisherAddress, PublisherCountry: client.publisherCountry,
                        PublisherIpi: client.publisherIpi, Firma: client.Firma,
                        Percentage: percentageStr, // Usa percentageStr
                         // ... otros placeholders derivados ...
                    };
                    const rolePrefix = client.role ? client.role.charAt(0).toUpperCase() + client.role.slice(1) : "";
                    Object.entries(clientPlaceholders).forEach(([key, value]) => {
                        if (value !== undefined) {
                             if (rolePrefix) participantReplacements[`[${rolePrefix}${key}]`] = value;
                             const genericPlaceholder = `[${key}]`;
                             if (!participantReplacements[genericPlaceholder]) participantReplacements[genericPlaceholder] = value;
                        }
                    });
                }
            });
            try {
                console.log(">>> applyAllDataToContent: Performing participant replacements...");
                Object.keys(participantReplacements).sort((a, b) => b.length - a.length)
                    .forEach((placeholder) => {
                        const replacementValue = participantReplacements[placeholder] ?? "";
                        const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
                        const regex = new RegExp(escapedPlaceholder, "gi");
                        updatedContent = updatedContent.replace(regex, replacementValue);
                    });
            } catch (error: unknown) { console.error("Error replacing participant placeholders:", error); } // Usa unknown
        } else {
            console.log(">>> applyAllDataToContent: Skipping participant replacement.");
        }

        // --- 4. Generar y Reemplazar Bloques HTML (Listas/Firmas) ---
        try {
            console.log(">>> applyAllDataToContent: Generating list/signature blocks...");
            // --- Usa const y map ---
             // --- CORRECCIÓN: Usar 'email' en lugar de '_email' ---
            const collaboratorsList = selectedParticipants.map(email => { /* ... lógica para generar <li> ... */ }).join(''); // <-- Corregido
            const signaturesBlock = selectedParticipants.map(email => { /* ... lógica para generar div de firma ... */ }).join(''); // <-- Corregido
            // --- Construye HTML final de listas ---
            const collaboratorListHtml = selectedParticipants.length > 0 ? `<ul>${collaboratorsList}</ul>` : "";
            // --- CORRECCIÓN: Usar 'email' en lugar de '_email' ---
            const collaboratorListNoPercentHtml = selectedParticipants.length > 0 ? `<ul>${selectedParticipants.map(email => {/*...*/}).join('')}</ul>` : ""; // <-- Corregido
            const signaturesHtml = selectedParticipants.length > 0 ? `<div style="margin-top: 40px;">${signaturesBlock}</div>` : "";
            // --- Reemplaza ---
            updatedContent = updatedContent.replace(/\[ListaColaboradoresConPorcentaje\]/gi, collaboratorListHtml);
            updatedContent = updatedContent.replace(/\[ListaColaboradores\]/gi, collaboratorListNoPercentHtml);
            updatedContent = updatedContent.replace(/\[FirmasColaboradores\]/gi, signaturesHtml);
            updatedContent = updatedContent.replace(/\[Firmas\]/gi, signaturesHtml);
        } catch (error: unknown) { console.error("Error replacing HTML block placeholders:", error); } // Usa unknown

        console.log(`>>> applyAllDataToContent: Final content (first 200): ${updatedContent.substring(0, 200)}...`);
        return updatedContent;

    // --- CORREGIDO: Array de Dependencias Añadido ---
    }, [
        step,
        editedContent,
        selectedContract,
        generalData,
        selectedParticipants,
        clients, // <-- Añadido clients
        participantPercentages
        // editorRef no se incluye directamente para evitar re-renders excesivos
    ]); // <-- Cierre de useCallback con dependencias

    // --- CORRECCIÓN: buildParticipantsPayload ELIMINADO porque no se usa ---


    // --- Derived Calculations ---
    const totalPercentage = selectedParticipants.reduce((sum, email) => sum + (participantPercentages[email] || 0), 0);
    const filteredClientsForParticipants = clients.filter(c =>
        (c.FullName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (c.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (c.role?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );
    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
    );
    const isGeneralDataComplete = !!generalData.jurisdiction && !!generalData.fecha && !!generalData.trackTitle;

    const hasRemainingPlaceholders = useCallback(() => {
        // No hay contrato ni contenido editado? Entonces no hay placeholders.
        if (!selectedContract && !editedContent) {
             console.log("hasRemainingPlaceholders: No contract or edited content.");
             return false;
        }

        const finalContent = applyAllDataToContent();

        // --- CORRECCIÓN: Verificar si finalContent es un string válido ANTES de .match() ---
        if (typeof finalContent === 'string' && finalContent.trim()) {
            // Es un string con contenido, podemos buscar placeholders
            const remaining = finalContent.match(/\[[^\]]+\]/g); // Busca [[Algo]]
            console.log("hasRemainingPlaceholders: Found placeholders:", remaining);
            // Devuelve true si se encontró algún match (remaining no es null y tiene longitud > 0)
            return remaining !== null && remaining.length > 0;
        } else {
            // Si finalContent es "", null, undefined, o solo espacios, asumimos que no hay placeholders válidos.
            console.log("hasRemainingPlaceholders: finalContent is empty or invalid.");
            return false;
        }
        // --------------------------------------------------------------------------

        // El array de dependencias ya incluye todo lo necesario
    }, [applyAllDataToContent, selectedContract, editedContent]);

    const isEditorReadyToSend =
        selectedContract &&
        selectedParticipants.length > 0 &&
        Math.abs(totalPercentage - 100) < 0.01 && // Use a small tolerance for floating point
        isGeneralDataComplete &&
        (editedContent.trim() !== "" || (selectedContract?.content || "").trim() !== "") && // Ensure some content exists
        !hasRemainingPlaceholders(); // Check if critical placeholders are gone

    // --- Helper Function for Short Category Names ---
    const getShortCategory = (category: string): string => {
        const upperCategory = category?.toUpperCase() || "N/A";
        switch (upperCategory) {
            case "MUSIC SPLITS": return "Split";
            case "IA GENERADO": return "IA";
            case "GENÉRICO": return "Gen";
            case "SUBIDO": return "Upload";
            case "ACUERDO DE DISTRIBUCIÓN": return "Distro";
            case "LICENCIA SINCRONIZACIÓN": return "Sync";
            default: return category?.length > 8 ? category.substring(0, 6) + "..." : category || "N/A";
        }
    };

    // --- Floating Toolbar Functions ---
    const updateToolbarState = useCallback(() => {
        const editorNode = editorRef.current;
        const toolbarNode = toolbarRef.current;
        if (!editorNode || isSelecting || step !== 2) { // Only show in editor step
            setShowFormattingToolbar(false);
            setToolbarPosition(null);
            return;
        }

        const activeElement = document.activeElement;
        const isEditorFocused = editorNode.contains(activeElement);
        const isToolbarFocused = toolbarNode?.contains(activeElement);

        // Hide if focus moves completely outside editor and toolbar
        if (!isEditorFocused && !isToolbarFocused) {
            // Use a small delay to allow focus moving between toolbar buttons
            setTimeout(() => {
                const currentActiveElement = document.activeElement;
                const currentToolbarNode = toolbarRef.current; // Re-check ref in case it disappeared
                if (editorRef.current && !editorRef.current.contains(currentActiveElement) &&
                    (!currentToolbarNode || !currentToolbarNode.contains(currentActiveElement))) {
                    setShowFormattingToolbar(false);
                    setToolbarPosition(null);
                }
            }, 150);
            return;
        }

        try {
            const selection = window.getSelection();
            // Show toolbar if there's a non-collapsed selection within the editor
            if (selection && !selection.isCollapsed && selection.rangeCount > 0 && editorNode.contains(selection.getRangeAt(0).commonAncestorContainer)) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const editorRect = editorNode.getBoundingClientRect();

                // Check if selection rect is valid
                if (!rect || (rect.width === 0 && rect.height === 0)) return;

                const toolbarHeight = toolbarNode?.offsetHeight ?? 40; // Estimate or measure
                const toolbarWidth = toolbarNode?.offsetWidth ?? 200; // Estimate or measure

                const scrollY = editorNode.scrollTop; // Use editor's scroll position
                const scrollX = editorNode.scrollLeft;

                // Calculate position relative to the editor viewport
                let top = rect.top - editorRect.top + scrollY - toolbarHeight - 8; // Position above selection
                let left = rect.left - editorRect.left + scrollX + (rect.width / 2) - (toolbarWidth / 2); // Center above selection

                // Adjust if toolbar goes off-screen or overlaps selection
                if (top < scrollY || (rect.top - editorRect.top < toolbarHeight + 10)) { // If too high or would overlap
                    top = rect.bottom - editorRect.top + scrollY + 8; // Position below selection
                }

                // Keep toolbar within horizontal bounds of the editor
                const maxLeft = Math.max(editorNode.clientWidth, editorNode.scrollWidth) - toolbarWidth + scrollX - 5; // Max left position
                left = Math.max(scrollX + 5, Math.min(left, maxLeft)); // Clamp left position

                 // Keep toolbar within vertical bounds (less critical usually)
                 const maxTop = Math.max(editorNode.clientHeight, editorNode.scrollHeight) - toolbarHeight + scrollY - 5;
                 top = Math.max(scrollY + 5, Math.min(top, maxTop));

                setToolbarPosition({ top, left });
                setShowFormattingToolbar(true);
            } else {
                // Hide toolbar if selection collapses, unless the toolbar itself is focused
                if (!isToolbarFocused) {
                    setShowFormattingToolbar(false);
                    setToolbarPosition(null);
                }
            }
        } catch (error) {
            console.error("Error updating toolbar state:", error);
            setShowFormattingToolbar(false);
            setToolbarPosition(null);
        }
    }, [isSelecting, step]); // Depend on step

    // --- Editor Command Functions ---
    const execCmd = useCallback((command: string, value?: string) => {
        if (!editorRef.current) return;
        try {
            editorRef.current.focus(); // Ensure editor has focus
            document.execCommand(command, false, value);
            // Update state *after* command execution to reflect changes
            setEditedContent(editorRef.current.innerHTML);
            // Update toolbar state immediately after command
            requestAnimationFrame(updateToolbarState);
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            toast.error("Error de Edición", { description: `No se pudo ejecutar: ${command}` });
        }
    }, [updateToolbarState]); // updateToolbarState added as dependency

    const formatAsCode = useCallback(() => {
        if (!editorRef.current) return;
        try {
            editorRef.current.focus();
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return; // No selection
            const range = selection.getRangeAt(0);

            // Check if selection is within the editor
            if (!editorRef.current.contains(range.commonAncestorContainer)) return;

            const selectedText = range.toString();
            if (selectedText.length > 0) {
                // Check if already inside a code block or similar, potentially toggle off? (More complex)
                // Simple approach: Wrap selection in a <code> tag
                const codeNode = document.createElement("code");
                codeNode.textContent = selectedText;
                // Add some basic styling via class (tailwind or global CSS)
                codeNode.className = "bg-gray-200 px-1 rounded text-sm font-mono";

                range.deleteContents(); // Remove selected text
                range.insertNode(codeNode); // Insert the new <code> node

                // Move cursor after the inserted node
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.setStartAfter(codeNode);
                newRange.collapse(true);
                selection.addRange(newRange);

                setEditedContent(editorRef.current.innerHTML); // Update state
                requestAnimationFrame(updateToolbarState);
            }
        } catch (error) {
            console.error("Error formatting as code:", error);
            toast.error("Error de Formato", { description: "No se pudo aplicar formato de código." });
        }
    }, [updateToolbarState]);

    const insertBlockquote = useCallback(() => {
        if (!editorRef.current) return;
        try {
            editorRef.current.focus();
            // Use formatBlock for blockquote - more semantic than inserting raw tags
            document.execCommand("formatBlock", false, "blockquote");
            // Optionally apply styling AFTER the command if needed, e.g., by finding the new blockquote
            setEditedContent(editorRef.current.innerHTML);
            requestAnimationFrame(updateToolbarState);
        } catch (error) {
            console.error("Error inserting blockquote:", error);
            toast.error("Error de Formato", { description: "No se pudo insertar bloque de cita." });
        }
    }, [updateToolbarState]);


    // --- Reset Function ---
    const resetProcess = () => {
        setSelectedContract(null);
        setEditedContent("");
        if (editorRef.current) editorRef.current.innerHTML = ""; // Clear editor div directly
        setSelectedParticipants([]);
        setParticipantPercentages({});
        setGeneralData({ jurisdiction: "", fecha: "", trackTitle: "", lugarDeFirma: "" });
        setSearchQuery(""); // Clear participant search
        setTemplateSearchQuery(""); // Clear library search
        setStep(0); // Go back to library view
        setCrmMode(false); // Exit CRM mode
        setShowFormattingToolbar(false); setToolbarPosition(null); setIsSelecting(false);
        // Reset forms
        setNewClient(INITIAL_NEW_CLIENT_STATE);
        setEditingClient(null); setEditedClientData({});
        setNewTemplate(INITIAL_NEW_TEMPLATE_STATE);
        setTemplateToEdit(null);
        setAiPrompt("");
        // Clear errors
        setError(null);
        // Close modals/sidebars - might not be strictly needed if they close on action, but good practice
        setShowAddClientSidebar(false);
        setShowEditClientSidebar(false);
        setShowCreateTemplateModal(false);
        setShowEditTemplateModal(false);
        setShowAiModal(false);
        setViewingSentContract(null);
        setConfirmingDeleteClient(null);
        setConfirmingDeleteTemplate(null);
        console.log("Process reset to initial state.");
    };
    const goToHome = () => resetProcess(); // Alias for clarity in UI

    // --- Input Handlers ---
    const handlePercentageChange = (email: string, value: string) => {
        const p = Number.parseFloat(value);
        setParticipantPercentages((prev) => ({
            ...prev,
            // Store 0 if invalid, clamp between 0 and 100
            [email]: isNaN(p) ? 0 : Math.max(0, Math.min(100, p))
        }));
    };
    const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>, clientEmail: string) => {
        const { checked } = e.target;
        setSelectedParticipants(prev =>
            checked ? [...prev, clientEmail] : prev.filter(email => email !== clientEmail)
        );
        // If unchecked, remove percentage entry
        if (!checked) {
            setParticipantPercentages(prev => {
                 // --- CORRECCIÓN: Desactivar regla ESLint para '_' ---
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [clientEmail]: _, ...rest } = prev;
                return rest;
            });
        }
    };
    const handleFontSizeChange = useCallback((size: string) => {
        if (size) execCmd("fontSize", size); // Execute command if size is selected
    }, [execCmd]);

    const handleClientFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (showAddClientSidebar) {
            setNewClient((prev) => ({ ...prev, [name]: value }));
        } else if (showEditClientSidebar && editingClient) {
            // Store only the changed fields in editedClientData
            setEditedClientData((prev) => ({ ...prev, [name]: value }));
        }
    };
    const handleTemplateFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (showCreateTemplateModal) {
            setNewTemplate(prev => ({ ...prev, [name]: value }));
        } else if (showEditTemplateModal && templateToEdit) {
            // Update the templateToEdit state directly
            setTemplateToEdit(prev => (prev ? { ...prev, [name]: value } : null));
        }
    };

    // --- File Handling ---
    const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!editorRef.current) return;
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    // Insert image using execCommand (base64 encoded)
                    execCmd("insertImage", e.target.result as string);
                }
            };
            reader.onerror = () => toast.error("Error al cargar imagen");
            reader.readAsDataURL(file);
        } else if (file) {
             toast.warning("Archivo no válido", { description: "Selecciona un archivo de imagen." });
        }
        // Reset input value to allow selecting the same file again
        if (event.target) event.target.value = "";
    };
    const triggerImageUpload = () => imageInputRef.current?.click();
    const triggerFileUpload = () => fileInputRef.current?.click();

    // Creates template via API (Helper for handleFileChange)
    const createTemplateFromFile = async (content: string, fileName: string) => {
        const title = fileName.replace(/\.[^/.]+$/, "") || "Plantilla Subida"; // Extract title from filename
        const newTplData: Omit<Template, 'id'> = { // Use Omit as ID is generated by backend
            title,
            category: "SUBIDO", // Default category for uploads
            description: `Subida desde archivo: ${fileName}`,
            content // The processed HTML content
        };

        setIsSubmitting(true); // Use submitting state for this action
        let savedTemplate: Template | null = null;
        try {
            const res = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTplData)
            });
            savedTemplate = await res.json();
            if (!res.ok) {
                 throw new Error(savedTemplate?.error || `Error del servidor (${res.status})`);
            }

            // Add the newly created template to the local state
            setTemplates((prev) => [savedTemplate!, ...prev].sort((a, b) => a.title.localeCompare(b.title)));
            toast.success("Plantilla Subida y Guardada", { description: `"${title}" añadida a la biblioteca.` });
            // Optionally select the new template and go to preview (or stay in library)
            // setSelectedContract(savedTemplate); setEditedContent(savedTemplate.content); setStep(1);
        } catch (err: unknown) {
            console.error("Error saving uploaded template:", err);
            const message = err instanceof Error ? err.message : String(err); // Safe error message access
            toast.error("Error al guardar plantilla subida", { description: message });
            // Handle potential rollback or cleanup if needed
        } finally {
            setIsSubmitting(false);
        }
         return savedTemplate; // Return the saved template or null
    };

    // Handles .txt and .docx file uploads to create new templates
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const fileName = file.name;
        const fileExt = fileName.split(".").pop()?.toLowerCase();

        if (fileExt !== "txt" && fileExt !== "docx") {
            toast.error("Archivo no soportado", { description: "Solo se admiten archivos .txt y .docx." });
            if (event.target) event.target.value = ""; // Reset input
            return;
        }

        const toastId = toast.loading("Procesando archivo...", { description: fileName });
        setIsSubmitting(true); // Indicate processing

        try {
            let htmlContent = "";
            if (fileExt === "txt") {
                const text = await file.text();
                // Basic conversion: wrap lines in <p>, escape HTML, preserve line breaks
                htmlContent = text
                    .split('\n')
                    .map(line => `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "<br>"}</p>`) // Handle empty lines with <br>
                    .join('');
            } else { // docx
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                htmlContent = result.value; // Mammoth provides HTML output
                // Log any messages from mammoth (e.g., unsupported features)
                if (result.messages && result.messages.length > 0) {
                    console.warn("Mensajes de Mammoth durante la conversión de DOCX:", result.messages);
                    // Optionally show a toast warning about potential conversion issues
                    // toast.info("Conversión DOCX", { description: "Algunos elementos pueden no haberse convertido perfectamente." });
                }
            }

            // Ensure content is not empty after processing
            if (!htmlContent.trim()) {
                 throw new Error("El archivo parece estar vacío o no se pudo procesar el contenido.");
            }

            // Call the API helper function to save the template
            const saved = await createTemplateFromFile(htmlContent, fileName);

            if (saved) {
                toast.success("Archivo procesado", { id: toastId, description: `"${fileName}" procesado y plantilla creada.` });
            } else {
                 // If createTemplateFromFile handled the error toast, we might not need another one
                 // toast.error("Error al guardar", { id: toastId, description: `No se pudo guardar la plantilla desde "${fileName}".` });
                 if (document.getElementById(String(toastId))) { // Check if toast still exists
                     toast.dismiss(toastId); // Dismiss loading if save failed internally
                 }
            }

        } catch (error: unknown) {
            console.error("Error procesando archivo:", error);
            const message = error instanceof Error ? error.message : String(error); // Safe error message access
            toast.error("Error al procesar archivo", { id: toastId, description: message });

        } finally {
            setIsSubmitting(false); // End processing indicator
            // Reset file input to allow uploading the same file again
            if (event.target) event.target.value = "";
        }
    };

    // --- Download Functions ---
    // PDF Download using MANUAL jsPDF text/drawing
    const downloadPdfContent = async (content: string, title: string) => {
        if (!content?.trim()) { toast.error("Sin Contenido", { description: "No hay nada que descargar como PDF." }); return; }
        const safeTitle = (title || "contrato").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
        const filename = `${safeTitle}.pdf`;
        const toastId = toast.loading("Generando PDF...", { duration: 8000 }); // Longer duration for complex docs
        setIsSubmitting(true);

        try {
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt", // Use points for consistency with typical document sizes
                format: "a4"
            });

            const margins = { top: 72, bottom: 72, left: 72, right: 72 }; // Standard 1-inch margins in points
            const contentWidth = pdf.internal.pageSize.getWidth() - margins.left - margins.right;
            let currentY = margins.top;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const maxY = pageHeight - margins.bottom; // Maximum Y position before new page

            // Base font settings (can be overridden)
            const baseFontSize = 10;
            const baseLineHeight = baseFontSize * 1.4; // Adjust multiplier as needed

            // Helper to add text, handle styles, and pagination
            const addText = (text: string, options: { fontSize?: number; fontStyle?: string; isListItem?: boolean; listPrefix?: string; indent?: number } = {}) => {
                if (!text?.trim()) return;

                const fontSize = options.fontSize || baseFontSize;
                const fontName = 'helvetica'; // Base font
                const fontStyle = options.fontStyle || 'normal';
                const lineHeight = fontSize * 1.4;
                const indent = options.indent || 0;
                const textX = margins.left + indent;
                const availableWidth = contentWidth - indent;

                pdf.setFontSize(fontSize);
                 try {
                    pdf.setFont(fontName, fontStyle);
                 } catch(e: unknown) {
                    console.error(`jsPDF setFont error (Fuente: ${fontName}, Estilo: ${fontStyle}):`, e instanceof Error ? e.message : e);
                    try { pdf.setFont('courier', 'normal'); } catch { /* Ignorar si todo falla */ }
                 }

                const lines = pdf.splitTextToSize(text, availableWidth);

                lines.forEach((line: string) => {
                    if (currentY + lineHeight > maxY) {
                        pdf.addPage();
                        currentY = margins.top;
                        pdf.setFontSize(fontSize); // Reapply size
                        try {
                            pdf.setFont(fontName, fontStyle); // Reapply font/style
                         } catch(e: unknown) {
                             console.warn("jsPDF setFont new page warning:", e);
                             try { pdf.setFont('courier', 'normal'); } catch {}
                         }
                    }
                    pdf.text(line, textX, currentY);
                    currentY += lineHeight;
                });
            }; // Fin de addText

            // --- Process the HTML content manually ---
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = content; // Parse the HTML string

            // Recursive function to process DOM nodes
            const processNode = (node: Node, currentStyle: { fontSize?: number; fontStyle?: string; indent?: number; listLevel?: number; listType?: 'ol' | 'ul'; listCounter?: number } = {}) => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                    addText(node.textContent.trim(), { ...currentStyle });
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as Element;
                    const tagName = el.tagName.toLowerCase();
                    // --- CORRECCIÓN: Usar const para newStyle ---
                    const newStyle = { ...currentStyle }; // Inherit styles

                    // Basic Style Tags
                    if (tagName === 'strong' || tagName === 'b') newStyle.fontStyle = currentStyle.fontStyle === 'italic' ? 'bolditalic' : 'bold';
                    if (tagName === 'em' || tagName === 'i') newStyle.fontStyle = currentStyle.fontStyle === 'bold' ? 'bolditalic' : 'italic';

                    // Heading Tags
                    if (tagName.match(/^h[1-6]$/)) {
                        const level = parseInt(tagName[1]);
                        newStyle.fontSize = Math.max(baseFontSize, 16 - (level - 1) * 2);
                        newStyle.fontStyle = 'bold';
                         if (currentY > margins.top + baseLineHeight) currentY += baseLineHeight * 0.5;
                    }

                    // Paragraphs and Divs
                    if (tagName === 'p' || tagName === 'div' || tagName.match(/^h[1-6]$/) || tagName === 'blockquote') {
                         Array.from(el.childNodes).forEach(child => processNode(child, newStyle));
                         currentY += baseLineHeight * 0.3;
                         if (tagName === 'blockquote') newStyle.indent = (newStyle.indent || 0) + 20;
                    }
                    // Lists
                    else if (tagName === 'ul' || tagName === 'ol') {
                        const listLevel = (currentStyle.listLevel || 0) + 1;
                        const indentSize = 20;
                        newStyle.indent = (currentStyle.indent || 0) + indentSize;
                        newStyle.listLevel = listLevel;
                        newStyle.listType = tagName as ('ul' | 'ol');
                        newStyle.listCounter = 1;

                        Array.from(el.children).forEach(li => {
                            if (li.tagName.toLowerCase() === 'li') {
                                 const prefix = newStyle.listType === 'ol' ? `${newStyle.listCounter++}. ` : '- ';
                                 Array.from(li.childNodes).forEach(child => processNode(child, { ...newStyle, isListItem: true, listPrefix: prefix }));
                            }
                         });
                         currentY += baseLineHeight * 0.3;
                    }
                    // Line Break
                    else if (tagName === 'br') {
                        currentY += baseLineHeight;
                    }
                    // Horizontal Rule
                    else if (tagName === 'hr') {
                         if (currentY + 10 > maxY) { pdf.addPage(); currentY = margins.top; }
                         pdf.setDrawColor(150, 150, 150);
                         pdf.line(margins.left, currentY, margins.left + contentWidth, currentY);
                         currentY += baseLineHeight;
                    }
                    // Image Tag
                    else if (tagName === 'img') {
                         // --- CORRECCIÓN: Eliminar variable imgSrc no usada ---
                         console.warn("PDF Export: Images are currently not fully supported in manual PDF generation.");
                         addText("[Imagen no soportada en PDF]", { fontStyle: 'italic', fontSize: 8 });
                    }
                    // Default: Process children
                    else {
                        Array.from(el.childNodes).forEach(child => processNode(child, newStyle));
                    }
                }
            };

            // Start processing
            processNode(tempDiv);

            // Save the PDF
            pdf.save(filename);
            toast.success("PDF Descargado", { id: toastId, description: `${filename} (Estilo simplificado)` });

        } catch (e: unknown) {
            console.error("Error generando PDF manual:", e);
            const message = e instanceof Error ? e.message : String(e); // Safe error message access
            toast.error("Error al generar PDF", { id: toastId, description: `Ocurrió un error: ${message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Word Download - Uses docx library
    const downloadWordContent = async (content: string, title: string) => {
        if (!content?.trim()) { toast.error("Sin Contenido", { description: "No hay nada que descargar como Word." }); return; }
        const safeTitle = (title || "contrato").replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
        const filename = `${safeTitle}.docx`;
        const toastId = toast.loading("Generando Word (.docx)...", { duration: 5000 });
        setIsSubmitting(true);

        try {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = content; // Assume content is valid HTML

            // Recursive function to traverse DOM and create docx elements
            const processNode = (node: Node): (Paragraph | TextRun)[] => {
                const elements: (Paragraph | TextRun)[] = [];

                if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                    let isBold = false, isItalic = false, isUnderline = false, isStrike = false;
                    let current: Node | null = node.parentNode;
                    while (current && current !== tempDiv) {
                        const tagName = (current as HTMLElement).tagName?.toLowerCase();
                        if (tagName === 'strong' || tagName === 'b') isBold = true;
                        if (tagName === 'em' || tagName === 'i') isItalic = true;
                        if (tagName === 'u') isUnderline = true;
                        if (tagName === 's' || tagName === 'strike' || tagName === 'del') isStrike = true;
                        current = current.parentNode;
                    }
                    if (node.textContent.trim()) {
                        elements.push(new TextRun({
                            text: node.textContent,
                            bold: isBold,
                            italics: isItalic,
                            underline: isUnderline ? {} : undefined,
                            strike: isStrike,
                        }));
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as HTMLElement;
                    const tagName = el.tagName.toLowerCase();
                    const children = Array.from(el.childNodes).flatMap(child => processNode(child));

                    // Handle block elements
                    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].includes(tagName)) {
                        let headingLevelValue: typeof HeadingLevel[keyof typeof HeadingLevel] | undefined = undefined;
                        if (tagName.match(/^h[1-6]$/)) {
                            switch (tagName) {
                                case 'h1': headingLevelValue = HeadingLevel.HEADING_1; break;
                                case 'h2': headingLevelValue = HeadingLevel.HEADING_2; break;
                                case 'h3': headingLevelValue = HeadingLevel.HEADING_3; break;
                                case 'h4': headingLevelValue = HeadingLevel.HEADING_4; break;
                                case 'h5': headingLevelValue = HeadingLevel.HEADING_5; break;
                                case 'h6': headingLevelValue = HeadingLevel.HEADING_6; break;
                            }
                             if (headingLevelValue === undefined) {
                                 console.warn(`Could not map heading level for ${tagName}`);
                             }
                        }
                        const textRunsInChildren = children.filter(c => c instanceof TextRun) as TextRun[];
                        if (textRunsInChildren.length > 0 || tagName === 'p') {
                            elements.push(new Paragraph({
                                children: textRunsInChildren,
                                heading: headingLevelValue,
                                style: tagName === 'blockquote' ? "IntenseQuote" : undefined,
                                spacing: { after: tagName.match(/^h/) ? 200 : 100 },
                            }));
                        }
                        elements.push(...children.filter(c => c instanceof Paragraph));
                    }
                    // Handle lists
                    else if (tagName === 'ul' || tagName === 'ol') {
                        // --- CORRECCIÓN: Remover 'index' no usado ---
                         Array.from(el.children).forEach((li) => { // <-- 'index' removido
                             if(li.tagName.toLowerCase() === 'li') {
                                const liContentRuns = Array.from(li.childNodes)
                                    .flatMap(child => processNode(child))
                                    .filter(c => c instanceof TextRun) as TextRun[];

                                if (liContentRuns.length > 0) {
                                    elements.push(new Paragraph({
                                        children: liContentRuns,
                                        numbering: tagName === 'ol'
                                            ? { reference: "default-numbering", level: 0 }
                                            : undefined,
                                        bullet: tagName === 'ul'
                                            ? { level: 0 }
                                            : undefined,
                                        spacing: { after: 50 }
                                    }));
                                } else {
                                     elements.push(new Paragraph({ bullet: tagName === 'ul' ? { level: 0 } : undefined, numbering: tagName === 'ol' ? { reference: "default-numbering", level: 0 } : undefined}));
                                }
                             }
                         });
                    }
                    // Handle <br> (omit for simplicity)
                    else if (tagName === 'br') {
                        // elements.push(new Paragraph({}));
                    }
                     // Handle <hr>
                     else if (tagName === 'hr') {
                        elements.push(new Paragraph({
                            children: [],
                            border: { bottom: { color: "auto", space: 1, style: "single", size: 6 } }
                        }));
                     }
                    // Handle <img> (placeholder)
                    else if (tagName === 'img') {
                        const imgElement = el as HTMLImageElement;
                        const src = imgElement.src;
                        console.warn("Word Export: Images require fetching/embedding - currently adding placeholder.");
                        elements.push(new Paragraph({
                            children: [new TextRun({ text: `[Image: ${imgElement.alt || src.substring(0, 50)}]`, italics: true })]
                        }));
                    }
                    // Pass children up for inline elements
                    else {
                        elements.push(...children);
                    }
                }
                return elements;
            };

            const docxElements = processNode(tempDiv);
            const finalDocxChildren = docxElements.filter(el => el instanceof Paragraph) as Paragraph[];
            if (finalDocxChildren.length === 0) {
                finalDocxChildren.push(new Paragraph({ children: [new TextRun("")] }));
            }

            const doc = new Document({
                numbering: {
                    config: [ {
                            reference: "default-numbering",
                            levels: [ { level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } } ],
                        }, ],
                },
                styles: {
                    paragraphStyles: [ { id: "IntenseQuote", name: "Intense Quote", basedOn: "Normal", next: "Normal", run: { italics: true, color: "5A5A5A" }, paragraph: { indent: { left: 720 }, spacing: { before: 100, after: 100 } } } ]
                },
                sections: [{ properties: {}, children: finalDocxChildren }]
            });

            // Pack and download
            const buffer = await Packer.toBuffer(doc);
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Word Descargado", { id: toastId, description: `${filename}` });
        } catch (e: unknown) {
            console.error("Error generando Word:", e);
            const message = e instanceof Error ? e.message : String(e); // Safe error message access
            toast.error("Error al generar Word", { id: toastId, description: `Ocurrió un error: ${message}` });
        } finally {
             setIsSubmitting(false);
        }
    };

    // Wrapper for download buttons (REVISED FOR PDF generation via Backend API)
    const handleDownload = async (format: "pdf" | "word" = "pdf") => {
        setIsSubmitting(true);
        const toastId = toast.loading(`Generando ${format}...`, { duration: format === 'pdf' ? 15000 : 5000 });

        try {
            const finalHtmlContent = applyAllDataToContent();
            const title = generalData.trackTitle || selectedContract?.title || "documento";

            if (!finalHtmlContent?.trim()) {
                toast.error("Contenido vacío", { id: toastId, description: "No hay nada para generar el documento." });
                setIsSubmitting(false);
                return;
            }

            if (format === "pdf") {
                console.log(">>> Frontend: Requesting PDF generation from backend for title:", title);
                const response = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify({ htmlContent: finalHtmlContent, title: title }),
                });

                if (!response.ok) {
                    let errorMsg = `Error del servidor (${response.status})`;
                    try { const errData = await response.json(); errorMsg = errData.error || errorMsg; }
                    // --- CORRECCIÓN: Usar 'catch' sin variable ---
                    catch { /* Ignora si la respuesta de error no es JSON */ } // <-- 'e' removido
                    console.error(">>> Frontend: PDF generation API error:", response.status, errorMsg);
                    throw new Error(errorMsg);
                }

                console.log(">>> Frontend: PDF response OK, processing Blob...");
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeTitle = title.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
                a.download = `${safeTitle}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                console.log(">>> Frontend: PDF download triggered for:", a.download);

                toast.success("PDF Descargado", { id: toastId, description: "El archivo se ha generado con formato." });

            } else { // format === "word"
                console.log(">>> Frontend: Generating Word document locally...");
                await downloadWordContent(finalHtmlContent, title);
                 if (document.getElementById(String(toastId))) {
                    toast.dismiss(toastId);
                 }
            }
        } catch (error: unknown) {
            console.error(`>>> Frontend: Error generating ${format}:`, error);
            const message = error instanceof Error ? error.message : String(error); // Safe error message access
            toast.error(`Error al generar ${format}`, { id: toastId, description: message });
        } finally {
            setIsSubmitting(false);
        }
    };


    // --- API Interaction Functions ---

    // Helper to save a new client (used by sidebar form)
    const handleSaveClient = async () => {
         // Basic validation
         if (!newClient.firstName?.trim() || !newClient.lastName?.trim() || !newClient.email?.trim()) {
             toast.error("Campos Requeridos", { description: "Nombre, Apellido y Email son obligatorios." });
             return;
         }
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (!emailRegex.test(newClient.email)) {
             toast.error("Email Inválido"); return;
         }
         if (clients.some((c) => c.email.toLowerCase() === newClient.email?.toLowerCase())) {
             toast.error("Email Duplicado", { description: "Este email ya está registrado." });
             return;
         }

         setIsSubmitting(true);
         try {
             // Create the full client object using the helper
             const clientPayload = createClientObject(newClient);

             const res = await fetch('/api/clients', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(clientPayload) // Send the full object expected by createClientObject structure
             });
             const savedClientData = await res.json();
             if (!res.ok) {
                 throw new Error(savedClientData.error || `Error del servidor (${res.status})`);
             }
             // Process the response with createClientObject to ensure consistency
             const savedClient = createClientObject(savedClientData);

             setClients((prev) => [...prev, savedClient].sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '')));
             setNewClient(INITIAL_NEW_CLIENT_STATE); // Reset form
             setShowAddClientSidebar(false); // Close sidebar
             toast.success("Cliente Añadido", { description: `"${savedClient.name}" añadido correctamente.` });

         } catch (err: unknown) {
             console.error("Error saving client:", err);
             const message = err instanceof Error ? err.message : String(err); // Safe error message access
             toast.error("Error al guardar cliente", { description: message });
         } finally {
             setIsSubmitting(false);
         }
     };

    const handleUpdateClient = async () => {
        if (!editingClient || !Object.keys(editedClientData).length) {
             toast.info("Sin cambios", {description: "No hay cambios para guardar."});
             setShowEditClientSidebar(false); setEditingClient(null); setEditedClientData({});
             return;
        }

        // Combine original data with changes for validation
        const combinedData = { ...editingClient, ...editedClientData };

        // Validation
        if (!combinedData.firstName?.trim() || !combinedData.lastName?.trim() || !combinedData.email?.trim()) {
            toast.error("Campos Requeridos", { description: "Nombre, Apellido y Email no pueden estar vacíos." });
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(combinedData.email)) {
            toast.error("Email Inválido"); return;
        }
        // Check for duplicate email (excluding the current client being edited)
        if (clients.some((c) => c.id !== editingClient.id && c.email.toLowerCase() === combinedData.email?.toLowerCase())) {
            toast.error("Email Duplicado", { description: "Email ya usado por otro cliente." });
            return;
        }

        setIsSubmitting(true);
        try {
            // Send *only* the changed fields (payload = editedClientData)
            const payload = editedClientData;
            const res = await fetch(`/api/clients/${editingClient.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const updatedData = await res.json(); // API should return the *full* updated client object
            if (!res.ok) {
                throw new Error(updatedData.error || `Error del servidor (${res.status})`);
            }

            // Process the full updated object returned by the API
            const updatedClient = createClientObject(updatedData);
            setClients((prev) =>
                prev.map((c) => (c.id === editingClient.id ? updatedClient : c))
                   .sort((a, b) => (a.FullName || '').localeCompare(b.FullName || ''))
            );
            toast.success("Cliente Actualizado", { description: `"${updatedClient.name}" actualizado.` });
            setShowEditClientSidebar(false); // Close sidebar
            setEditingClient(null); // Clear editing state
            setEditedClientData({}); // Clear changes

        } catch (err: unknown) {
            console.error("Error updating client:", err);
             const message = err instanceof Error ? err.message : String(err); // Safe error message access
            toast.error("Error al actualizar cliente", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Opens the confirmation dialog for client deletion
     const requestDeleteClient = (client: Client) => {
         setConfirmingDeleteClient(client);
     };

    const handleConfirmDeleteClient = async () => {
        if (!confirmingDeleteClient) return;
        const clientToDelete = confirmingDeleteClient;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/clients/${clientToDelete.id}`, { method: 'DELETE' });

            if (!res.ok) {
                 let errorMsg = `Error del servidor (${res.status})`;
                 try {
                     const errData = await res.json();
                     if (errData.error) errorMsg = errData.error;
                 // --- CORRECCIÓN: Usar 'catch' sin variable ---
                 } catch { // <-- 'parseError' removido
                     // Ignore if response is not JSON
                 }
                 throw new Error(errorMsg);
            }

            // Remove client from local state
            setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
            // Remove client from participants if they were selected
            setSelectedParticipants((prev) => prev.filter((email) => email !== clientToDelete.email));
             // --- CORRECCIÓN: Desactivar regla ESLint para '_' ---
            setParticipantPercentages((prev) => {
                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [clientToDelete.email]: _, ...rest } = prev; // <-- Comentario añadido
                return rest;
            });

            toast.success("Cliente Eliminado", { description: `"${clientToDelete.name}" eliminado correctamente.` });
            setConfirmingDeleteClient(null); // Close confirmation dialog

            // If the deleted client was being edited, close the edit sidebar
            if (editingClient?.id === clientToDelete.id) {
                setShowEditClientSidebar(false);
                setEditingClient(null);
                 setEditedClientData({});
            }
        } catch (err: unknown) {
            console.error("Error deleting client:", err);
             const message = err instanceof Error ? err.message : String(err); // Safe error message access
            toast.error("Error al eliminar cliente", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to ensure content is basic HTML (wrap plain text in <p>)
    const ensureHtmlContent = (content: string): string => {
        const trimmed = content.trim();
        // Simple check: if it doesn't look like HTML (no tags), wrap lines in <p>
        if (!trimmed.startsWith("<") && !trimmed.includes("</")) {
            return trimmed.split("\n")
                .map((l) => (l.trim() === "" ? "<p><br></p>" : `<p>${l.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`))
                .join("");
        }
        // Assume it's already HTML (or intended to be)
        return content;
    };

    const handleCreateTemplate = async () => {
        // Validation
        if (!newTemplate.title?.trim() || !newTemplate.category?.trim() || !newTemplate.content?.trim()) {
            toast.error("Campos Requeridos", { description: "Título, Categoría y Contenido son obligatorios." });
            return;
        }

        const payload = {
            ...newTemplate,
            content: ensureHtmlContent(newTemplate.content) // Ensure content is HTML
        };
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const savedTemplate = await res.json();
            if (!res.ok) {
                throw new Error(savedTemplate.error || `Error del servidor (${res.status})`);
            }
            // Add to local state and sort
            setTemplates((prev) => [...prev, savedTemplate].sort((a, b) => a.title.localeCompare(b.title)));
            setNewTemplate(INITIAL_NEW_TEMPLATE_STATE); // Reset form
            setShowCreateTemplateModal(false); // Close modal
            toast.success("Plantilla Creada", { description: `"${savedTemplate.title}" creada.` });
        } catch (err: unknown) {
            console.error("Error creating template:", err);
            const message = err instanceof Error ? err.message : String(err); // Safe error message access
            toast.error("Error al crear plantilla", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateTemplate = async () => {
        if (!templateToEdit) return;
        // Validation
        if (!templateToEdit.title?.trim() || !templateToEdit.category?.trim() || !templateToEdit.content?.trim()) {
            toast.error("Campos Requeridos", { description: "Título, Categoría y Contenido son obligatorios." });
            return;
        }

        const payload = {
            ...templateToEdit,
            content: ensureHtmlContent(templateToEdit.content) // Ensure HTML content
        };
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/templates/${templateToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Send the whole updated object
            });
            const updatedTemplate = await res.json();
            if (!res.ok) {
                throw new Error(updatedTemplate.error || `Error del servidor (${res.status})`);
            }
            // Update local state
            setTemplates((prev) =>
                prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
                   .sort((a, b) => a.title.localeCompare(b.title))
            );
            setShowEditTemplateModal(false); // Close modal
            setTemplateToEdit(null); // Clear editing state
            toast.success("Plantilla Actualizada", { description: `"${updatedTemplate.title}" actualizada.` });

            // If the updated template was the currently selected one, update selection/editor
             if (selectedContract?.id === updatedTemplate.id) {
                 setSelectedContract(updatedTemplate);
                 // If in editor, update editor content, otherwise just update editedContent state
                 if (step === 2 && editorRef.current) {
                     editorRef.current.innerHTML = updatedTemplate.content;
                     setEditedContent(updatedTemplate.content); // Sync state too
                 } else {
                     setEditedContent(updatedTemplate.content);
                 }
             }

        } catch (err: unknown) {
            console.error("Error updating template:", err);
            const message = err instanceof Error ? err.message : String(err); // Safe error message access
            toast.error("Error al actualizar plantilla", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

     // Opens the confirmation dialog for template deletion
     const requestDeleteTemplate = (template: Template) => {
         setConfirmingDeleteTemplate(template);
     };

    // Performs the actual deletion after confirmation
    const handleConfirmDeleteTemplate = async () => {
        if (!confirmingDeleteTemplate) return;
        const templateToDelete = confirmingDeleteTemplate;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/templates/${templateToDelete.id}`, { method: 'DELETE' });

            if (!res.ok) {
                 let errorMsg = `Error del servidor (${res.status})`;
                 // --- CORRECCIÓN: Usar 'catch' sin variable ---
                 try { const errData = await res.json(); if (errData.error) errorMsg = errData.error; } catch {} // <-- 'e' removido
                 throw new Error(errorMsg);
            }

            // Remove from local state
            setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
            // If the deleted template was selected, reset the process
            if (selectedContract?.id === templateToDelete.id) {
                resetProcess();
            }
            toast.success("Plantilla Eliminada", { description: `"${templateToDelete.title}" eliminada.` });
            setConfirmingDeleteTemplate(null); // Close confirmation

            // If delete happened from edit modal, close it
            if (showEditTemplateModal && templateToEdit?.id === templateToDelete.id) {
                setShowEditTemplateModal(false);
                setTemplateToEdit(null);
            }
        } catch (err: unknown) {
            console.error("Error deleting template:", err);
            const message = err instanceof Error ? err.message : String(err); // Safe error message access
            toast.error("Error al eliminar plantilla", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

   // --- Function to GENERATE the final contract with AI ---
       const handleFinalizeWithAI = async () => {
        /* --- Validaciones previas (sin cambios) ------------------------------ */
        if (!selectedContract) { toast.warning('Selecciona una plantilla primero'); return }
        if (selectedParticipants.length === 0) { toast.warning('Añade participantes'); return }
        if (Math.abs(totalPercentage - 100) > 0.01) { toast.warning('Los porcentajes deben sumar 100 %'); return }
        if (!isGeneralDataComplete) { toast.warning('Completa los Datos Generales (*)'); return }

        // ***** PASO 1.1: Pre-rellenar el contenido ANTES de enviar *****
        console.log(">>> Frontend: Applying user data to template before sending to AI...");
        const contentToSendToAI = applyAllDataToContent();

        if (!contentToSendToAI?.trim()) {
            toast.error("Error al preparar contenido", { description: "El contenido resultante después de aplicar los datos está vacío. Revisa la función applyAllDataToContent y la plantilla." });
            return;
        }
        console.log(">>> Frontend: Content prepared for AI (first 200 chars):", contentToSendToAI.substring(0, 200) + "...");

        /* --- Construir payload (AJUSTADO) ------------------------------------ */
        const payload = {
          currentHtmlContent: contentToSendToAI,
          contextTitle: generalData.trackTitle || selectedContract.title,
        };
        console.log(">>> Frontend: Payload for AI API:", payload); // Log para ver qué se envía

        /* --- Llamada a la API (Backend) ------------------------------------- */
        setIsFinalizingWithAI(true)
        const toastId = toast.loading('Finalizando contrato con IA...', { description: 'Aplicando datos y refinando...' })

        try {
          console.log(">>> Frontend: Sending PRE-FILLED content to AI for finalization...");
          const res = await fetch('/api/ai/finalize-contract', { // Tu ruta backend
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) // Envía el contenido pre-rellenado
          })

          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.error || `Error de IA (${res.status})`)
          }

          const { refinedContent } = await res.json();

          if (!refinedContent?.trim()) {
            throw new Error('La IA no devolvió contenido refinado.');
          }
          console.log(">>> Frontend: Refined content received from AI.");

          /* --- Actualizar el editor ----------------------------------------- */
          if (editorRef.current) {
              editorRef.current.innerHTML = refinedContent;
          }
          setEditedContent(refinedContent);

          toast.success('Contrato Finalizado por IA', { id: toastId, description: 'El contenido ha sido actualizado y refinado.' });

        } catch (e: unknown) {
          console.error("Error finalizing contract with AI:", e);
          const message = e instanceof Error ? e.message : String(e); // Safe error message access
          toast.error('Error IA', { id: toastId, description: message });
        } finally {
          setIsFinalizingWithAI(false);
        }
    }; // Fin de handleFinalizeWithAI

    // --- AI Template Generation --- (Kept the existing logic)
    const generateAITemplate = async () => {
        if (!aiPrompt.trim()) {
            toast.error("Descripción Requerida", { description: "Describe qué tipo de contrato necesitas." });
            return;
        }
        setIsGeneratingTemplate(true); // Use specific loading state for AI button
        const toastId = toast.loading("Generando con IA...", { description: "Esperando respuesta..." });

        try {
             console.log("Calling AI generation API with prompt:", aiPrompt);
              const aiResponse = await fetch('/api/ai/generate-template', { // Your AI endpoint
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt: aiPrompt })
              });
              if (!aiResponse.ok) {
                  const errorData = await aiResponse.json().catch(() => ({}));
                  throw new Error(errorData.error || `Error de IA (${aiResponse.status})`);
              }
              const aiResult = await aiResponse.json(); // Expect { title: string, content: string }

             if (!aiResult?.title || !aiResult?.content) {
                 throw new Error("La respuesta de la IA no tuvo el formato esperado.");
             }

            // Prepare data for saving the generated template via standard template API
            const genTplData: Omit<Template, 'id'> = {
                title: aiResult.title,
                category: "IA GENERADO", // Specific category
                description: `Generado por IA basado en: "${aiPrompt}"`,
                content: ensureHtmlContent(aiResult.content) // Ensure HTML
            };

            // Save the generated template using the existing API endpoint
             const savedTemplate = await createTemplateFromData(genTplData); // Reuse logic slightly adapted

            if (savedTemplate) {
                 toast.success("Contrato IA Generado", { id: toastId, description: "Plantilla añadida. ¡Revísala y edítala!" });
                 setAiPrompt(""); // Clear prompt
                 setShowAiModal(false); // Close modal
            } else {
                  if (document.getElementById(String(toastId))) toast.dismiss(toastId); // Dismiss if not already handled
            }

        } catch (error: unknown) {
            console.error("AI generation or saving error:", error);
            const message = error instanceof Error ? error.message : String(error); // Safe error message access
            toast.error("Error IA", { id: toastId, description: message || "No se pudo generar o guardar la plantilla." });
        } finally {
            setIsGeneratingTemplate(false);
        }
    };

     // Helper similar to createTemplateFromFile but takes data object (Used by AI generation)
    const createTemplateFromData = async (templateData: Omit<Template, 'id'>): Promise<Template | null> => {
         setIsSubmitting(true);
         let savedTemplate: Template | null = null;
         try {
             const res = await fetch('/api/templates', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(templateData)
             });
             savedTemplate = await res.json();
             if (!res.ok) {
                  throw new Error(savedTemplate?.error || `Error del servidor (${res.status})`);
             }
             setTemplates((prev) => [savedTemplate!, ...prev].sort((a, b) => a.title.localeCompare(b.title)));
             // Success toast is handled by the caller (generateAITemplate)
         } catch (err: unknown) {
             console.error("Error saving template from data:", err);
             const message = err instanceof Error ? err.message : String(err); // Safe error message access
             toast.error("Error al Guardar Plantilla IA", { description: message });
             savedTemplate = null; // Ensure null is returned on error
         } finally {
             setIsSubmitting(false);
         }
         return savedTemplate;
     };

    // --- Send Contract ---
    const handleSendContract = async () => {
        // 1. Validate Prerequisites (Keep existing validations)
        if (!selectedContract) { toast.error("Selecciona Contrato", { description: "Primero elige una plantilla." }); return; }
        if (selectedParticipants.length === 0) { toast.error("Faltan Participantes", { description: "Añade al menos un participante." }); return; }
        if (Math.abs(totalPercentage - 100) > 0.01) { toast.error("Error Porcentajes", { description: `La suma es ${totalPercentage.toFixed(2)}%, debe ser exactamente 100%.` }); return; }
        if (!isGeneralDataComplete) { toast.error("Faltan Datos Generales", { description: "Completa Jurisdicción, Fecha y Título del Track (*)." }); return; }

        // 2. Get the *current* content from the editor (could be original, edited, or AI-finalized)
        const finalContent = editorRef.current?.innerHTML || editedContent || selectedContract.content || ""; // Prioritize live editor content
        const remainingPlaceholders = finalContent.match(/\[[^\]]+\]/g);

        // Check for remaining placeholders (keep existing logic)
        if (remainingPlaceholders?.length) {
            const critical = ['[Jurisdiccion]', '[Fecha]', '[trackTitle]', '[FullName]', '[Email]', '[Firma]', '[Percentage]', '[Porcentaje', '[Address]', '[Passport]'];
            const criticalRemaining = remainingPlaceholders.filter(p =>
                 critical.some(crit => p.toLowerCase().includes(crit.toLowerCase().replace('[','').replace(']','')))
             );

            if (criticalRemaining.length > 0) {
                 toast.error("Placeholders Críticos Pendientes", {
                     description: `Por favor, completa o elimina: ${criticalRemaining.slice(0, 3).join(", ")}${criticalRemaining.length > 3 ? '...' : ''}`,
                     duration: 5000,
                 });
                 return;
             } else {
                 toast.warning("Placeholders Restantes Detectados", {
                     description: `El contrato aún contiene: ${remainingPlaceholders.slice(0, 3).join(", ")}${remainingPlaceholders.length > 3 ? '...' : ''}. ¿Continuar?`,
                     duration: 6000,
                     // action: { label: "Continuar", onClick: () => proceedWithSend(finalContent) } // Optional confirm button
                 });
                 // Proceed automatically after warning for now.
             }
        }

        // 3. Proceed with sending
        proceedWithSend(finalContent);
    };

    // Actual sending logic, separated for potential confirmation flow
    const proceedWithSend = async (finalContent: string) => {
         if (!selectedContract) return; // Should not happen if called from handleSendContract

         setIsSending(true);
         setError(null);
         console.log(">>> Iniciando envío de contrato...");

         try {
             const payload = {
                 templateId: selectedContract.id,
                 templateTitle: selectedContract.title,
                 finalHtmlContent: finalContent, // Send the final generated HTML
                 participants: selectedParticipants.map(email => {
                     const c = clients.find(cl => cl.email === email);
                     return {
                         email: email,
                         name: c?.FullName || c?.name || email, // Use best available name
                         role: c?.role || 'Participante',
                         percentage: participantPercentages[email] ?? 0 // Ensure percentage exists
                         // Add client ID if your backend needs it: clientId: c?.id
                     };
                 }),
                 generalData: generalData, // Send general data fields
             };
             console.log(">>> Payload para /api/contracts/send-finalized:", payload);

             // --- Actual API Call ---
             const res = await fetch('/api/contracts/send-finalized', { // Ensure endpoint is correct
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });
             const result = await res.json(); // Expecting { success: boolean, message?: string, sentContract?: SentContract, error?: string }
             // --- End API Call ---

             if (!res.ok || !result.success) {
                 throw new Error(result.error || `Error del servidor (${res.status})`);
             }

             // Update local state with the sent contract data from the response
             if (result.sentContract) {
                 const newSentContract : SentContract = { // Ensure typing matches
                    id: result.sentContract.id || `sent-${Date.now()}`,
                    title: result.sentContract.title || selectedContract.title,
                    content: finalContent, // Use the content that was actually sent
                    participants: payload.participants, // Use the participant list sent
                    date: result.sentContract.date || new Date().toISOString(),
                    status: result.sentContract.status || "Enviado",
                    notionPageId: result.sentContract.notionPageId // Capture if returned
                 };
                  setSentContracts((prev) => [newSentContract, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
             } else {
                 // Fallback if API doesn't return full object (less ideal)
                 console.warn("API did not return full sent contract object, using local data.");
                 const fallbackSentData: SentContract = {
                    id: `sent-${Date.now()}`, title: selectedContract.title, content: finalContent,
                    participants: payload.participants, date: new Date().toISOString(), status: "Enviado"
                 };
                  setSentContracts((prev) => [fallbackSentData, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
             }

             toast.success("¡Contrato Enviado!", { description: result.message || `"${selectedContract.title}" enviado correctamente.` });
             resetProcess(); // Go back to library view after successful send

         } catch (err: unknown) {
             const message = err instanceof Error ? err.message : String(err); // Safe error message access
             setError(`Error al enviar: ${message}`);
             toast.error("Error al Enviar Contrato", { description: message });
             console.error(">>> Send Error:", err);
         } finally {
             setIsSending(false);
         }
     };


    // --- Effects ---
    // Click outside sidebars to close them
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            // Close Add Client Sidebar
            if (showAddClientSidebar && addClientSidebarRef.current && !addClientSidebarRef.current.contains(target)) {
                // Check if the click target is NOT the button that opens the sidebar
                const openButton = document.querySelector('button[aria-label="Añadir Cliente"]');
                if (!openButton || !openButton.contains(target)) {
                    setShowAddClientSidebar(false);
                }
            }

            // Close Edit Client Sidebar
            if (showEditClientSidebar && editClientSidebarRef.current && !editClientSidebarRef.current.contains(target)) {
                 // Check if click was on an Edit button that might reopen it immediately
                const isEditButton = (target as HTMLElement).closest('button[aria-label^="Editar"]');
                 if (!isEditButton) {
                    setShowEditClientSidebar(false);
                    setEditingClient(null); // Clear editing state when closing via outside click
                     setEditedClientData({});
                 }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAddClientSidebar, showEditClientSidebar]); // Dependencies ensure listener updates if state changes

    // Sync editing client data when 'editingClient' changes
    useEffect(() => {
        if (editingClient) {
             setEditedClientData({ ...editingClient });
        } else {
             setEditedClientData({}); // Clear when no client is being edited
        }
    }, [editingClient]);

    // Sync templateToEdit when modal opens
    useEffect(() => {
         if (showEditTemplateModal && templateToEdit) {
             // No action needed here if templateToEdit is set correctly when opening modal
         } else if (!showEditTemplateModal) {
             setTemplateToEdit(null); // Clear when modal closes
         }
    }, [showEditTemplateModal, templateToEdit]);


    // Extract general data from template content (only on first load into editor)
    const extractGeneralData = useCallback((content: string) => {
         if (!content?.trim()) return;
         // Only extract if the general data fields are currently empty
         if (generalData.fecha || generalData.trackTitle || generalData.lugarDeFirma || generalData.jurisdiction) {
             return;
         }

         try {
             const tempDiv = document.createElement("div");
             tempDiv.innerHTML = content;
             const text = tempDiv.textContent || "";

             const fechaMatch = text.match(/(?:Fecha:|a\s+)(\[?(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})\]?)/i);
             const fecha = fechaMatch?.[2]?.replace(/[[\]]/g, '');
             const trackMatch = text.match(/(?:titulada|obra musical|track|canción)\s+["“'](\[?.*?\]?)["”']/i);
             const track = trackMatch?.[1]?.replace(/[[\]]/g, '');
             const lugarMatch = text.match(/(?:En\s+|Lugar:\s*)(\[?[\w\sÁÉÍÓÚáéíóúñÑ,\s]+\]?)(?=\s*,?\s*(?:a\s+|en\s+)?\[?Fecha|Jurisdic]|\(?en adelante\)?)/i);
             const lugar = lugarMatch?.[1]?.replace(/[[\]]/g, '').trim();
             const jurisMatch = text.match(/(?:Jurisdicci[oó]n:)\s*(\[?[\w\sÁÉÍÓÚáéíóúñÑ,\s-]+\]?)/i);
             const juris = jurisMatch?.[1]?.replace(/[[\]]/g, '').trim();

             console.log("Extraction attempt:", { fecha, track, lugar, juris });

             // Update state only if values were found and are not already set
             setGeneralData((prev) => ({
                 jurisdiction: !prev.jurisdiction && juris ? juris : prev.jurisdiction,
                 fecha: !prev.fecha && fecha ? fecha : prev.fecha,
                 trackTitle: !prev.trackTitle && track ? track : prev.trackTitle,
                 lugarDeFirma: !prev.lugarDeFirma && lugar ? lugar : prev.lugarDeFirma,
                 // Preserve existing non-extracted fields
                 areaArtistica: prev.areaArtistica,
                 duracionContrato: prev.duracionContrato,
                 periodoAviso: prev.periodoAviso
             }));
         } catch (error) {
             console.error("Error extracting general data from template:", error);
         }
     }, [generalData]); // Rerun only if generalData changes (to avoid overwriting)

    // Effect for editor content management & initial data extraction
    useEffect(() => {
        const node = editorRef.current;
        if (!node || step !== 2 || !selectedContract) return; // Only run in editor step with a contract

        const targetContent = editedContent || selectedContract.content || "";

        if (node.innerHTML !== targetContent) {
            node.innerHTML = targetContent;
        }

        node.style.fontFamily = "Arial, sans-serif";
        node.style.fontSize = "11pt";
        node.style.lineHeight = "1.4";

        if (!editedContent && targetContent && !generalData.jurisdiction && !generalData.fecha && !generalData.trackTitle && !generalData.lugarDeFirma) {
            extractGeneralData(targetContent);
        }
    }, [step, selectedContract, editedContent, extractGeneralData, generalData]); // Add generalData dependency


    // Effect for floating toolbar listeners
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || step !== 2) { // Only add listeners when in editor step
            setShowFormattingToolbar(false); // Ensure toolbar is hidden if not in editor
            return () => {}; // Return empty cleanup function
        }

        const handleMouseDown = (e: MouseEvent) => {
            if (editor?.contains(e.target as Node)) {
                setIsSelecting(true);
            }
        };

        const handleSelectionOrMouseUp = () => {
             requestAnimationFrame(() => {
                 updateToolbarState();
                 setIsSelecting(false); // Reset selection flag
             });
        };

        const handleBlur = (e: FocusEvent) => {
             const isToolbarFocused = toolbarRef.current?.contains(e.relatedTarget as Node);
             if (!isToolbarFocused) {
                 setTimeout(() => {
                      const currentFocus = document.activeElement;
                      const editorStillFocused = editorRef.current?.contains(currentFocus);
                      const toolbarStillFocused = toolbarRef.current?.contains(currentFocus);
                      if (!editorStillFocused && !toolbarStillFocused) {
                          setShowFormattingToolbar(false);
                          setToolbarPosition(null);
                      }
                  }, 150);
             }
        };

        // Add listeners
        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("selectionchange", handleSelectionOrMouseUp);
        document.addEventListener("mouseup", handleSelectionOrMouseUp);
        editor.addEventListener("scroll", updateToolbarState);
        editor.addEventListener("focus", updateToolbarState);
        editor.addEventListener("blur", handleBlur);

        // Cleanup listeners
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("selectionchange", handleSelectionOrMouseUp);
            document.removeEventListener("mouseup", handleSelectionOrMouseUp);
            editor?.removeEventListener("scroll", updateToolbarState);
            editor?.removeEventListener("focus", updateToolbarState);
            editor?.removeEventListener("blur", handleBlur);
        };
    }, [updateToolbarState, step]); // Re-run if updateToolbarState logic changes or step changes


    // --- RENDER ---
    // Initial Loading State
    if (isLoading && !templates.length && !clients.length && !error) {
         return <div className="flex justify-center items-center min-h-screen text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando datos iniciales...</div>;
    }
    // Error State during initial load
    if (error && !isLoading && !templates.length && !clients.length) {
        return <div className="flex flex-col justify-center items-center min-h-screen text-red-600 p-4 text-center">
            <AlertTriangle size={40} className="mb-4 text-red-500"/>
            <p className="font-semibold text-lg text-red-700">Error al Cargar Datos</p>
            <p className="text-sm text-red-600 my-2 max-w-md">{error}</p>
            <Button onClick={() => window.location.reload()} variant="destructive" size="sm" className="mt-4">
                Reintentar Conexión
            </Button>
         </div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 p-4 md:p-6 flex flex-col">
            {/* Hidden Inputs for File Uploads */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.docx" style={{ display: "none" }} aria-hidden="true" />
            <input type="file" ref={imageInputRef} onChange={handleImageFileChange} accept="image/*" style={{ display: "none" }} aria-hidden="true" />

            {/* Header Navigation */}
            <header className="mb-4 pb-4 border-b border-gray-300 sticky top-0 bg-gray-100 z-30">
                <nav className="flex flex-wrap gap-1 sm:gap-2 text-sm justify-center md:justify-start items-center">
                     {/* Back Button (only visible when not in library/CRM home) */}
                     {(step !== 0 || crmMode) && (
                         <Button size="sm" variant="ghost" onClick={goToHome} className="mr-auto md:mr-2">
                             <ArrowLeft size={14} className="mr-1" /> Volver
                         </Button>
                     )}
                     {/* Main Navigation Buttons */}
                    <Button size="sm" variant={!crmMode && step === 0 ? 'secondary' : 'ghost'} onClick={() => { setCrmMode(false); goToHome(); }} aria-current={!crmMode && step === 0 ? "page" : undefined}> <Library size={14} className="mr-1" /> Biblioteca </Button>
                    <Button size="sm" variant={!crmMode && step === 1 ? 'secondary' : 'ghost'} onClick={() => { if (selectedContract) setStep(1); }} disabled={!selectedContract} aria-current={!crmMode && step === 1 ? "page" : undefined}> <Eye size={14} className="mr-1" /> Preview </Button>
                    <Button size="sm" variant={!crmMode && step === 2 ? 'secondary' : 'ghost'} onClick={() => { if (selectedContract) setStep(2); }} disabled={!selectedContract} aria-current={!crmMode && step === 2 ? "page" : undefined}> <Edit2 size={14} className="mr-1" /> Editor </Button>
                    <Button size="sm" variant={!crmMode && step === 3 ? 'secondary' : 'ghost'} onClick={() => { setCrmMode(false); setStep(3); }} aria-current={!crmMode && step === 3 ? "page" : undefined}> <Send size={14} className="mr-1" /> Enviados </Button>
                    {/* <Button size="sm" variant={!crmMode && step === 5 ? 'secondary' : 'ghost'} onClick={() => { setCrmMode(false); setStep(5); }} aria-current={!crmMode && step === 5 ? "page" : undefined}> <CheckCircle size={14} className="mr-1" /> Firmados </Button> */}
                    <Button size="sm" variant={crmMode ? 'secondary' : 'ghost'} onClick={() => { resetProcess(); setCrmMode(true); setStep(4); }} aria-current={crmMode ? "page" : undefined}> <Users size={14} className="mr-1" /> CRM </Button>
                </nav>
                 {/* Display non-critical loading/submitting state */}
                 {(isSubmitting || isSending || isGeneratingTemplate || isFinalizingWithAI) && !isLoading && ( // Added isFinalizingWithAI here
                     <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-[-10px] text-xs text-indigo-600 flex items-center">
                         <Loader2 className="h-3 w-3 mr-1 animate-spin"/> Procesando...
                     </div>
                 )}
            </header>

            {/* Main Content Area */}
            <main className="flex-grow relative">
                <AnimatePresence mode="wait">
                    {/* --- Step 0: Library View --- */}
                    {step === 0 && !crmMode && (
                        <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Plantillas de Contratos</h2>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-wrap">
                                    {/* Action Buttons */}
                                    <Button onClick={triggerFileUpload} variant="outline" size="sm" className="flex items-center gap-2 justify-center" disabled={isSubmitting}> <Upload size={16} /> Subir (.txt/.docx) </Button>
                                    <Button onClick={() => setShowAiModal(true)} variant="outline" size="sm" className="flex items-center gap-2 justify-center" disabled={isSubmitting || isGeneratingTemplate}> <Sparkles size={16} /> Generar con IA </Button>
                                    <Button onClick={() => { setNewTemplate(INITIAL_NEW_TEMPLATE_STATE); setShowCreateTemplateModal(true); }} size="sm" className="flex items-center gap-2 justify-center bg-indigo-600 text-white hover:bg-indigo-700" disabled={isSubmitting}> <Plus size={16} /> Crear Nueva </Button>
                                </div>
                            </div>
                            {/* Search Bar */}
                            <div className="mb-6 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input type="text" placeholder="Buscar plantillas por título, categoría o descripción..." value={templateSearchQuery} onChange={(e) => setTemplateSearchQuery(e.target.value)} className="pl-10 w-full" disabled={isLoading || isSubmitting}/>
                            </div>
                            {/* Template Grid */}
                            {isLoading && templates.length === 0 ? (
                                <p className="text-center text-gray-500 mt-10"><Loader2 className="inline-block mr-2 h-5 w-5 animate-spin" />Cargando plantillas...</p>
                             ) : !isLoading && templates.length === 0 ? (
                                 <div className="text-center text-gray-500 mt-10 py-8 border rounded-lg bg-white shadow-sm">
                                     <Library size={40} className="mx-auto mb-3 text-gray-400"/>
                                     <p className="font-semibold">No hay plantillas disponibles.</p>
                                     <p className="text-sm mt-1">Puedes <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowCreateTemplateModal(true)}>crear una nueva</Button>, <Button variant="link" size="sm" className="p-0 h-auto" onClick={triggerFileUpload}>subir un archivo</Button> o <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowAiModal(true)}>generarla con IA</Button>.</p>
                                 </div>
                             ) : filteredTemplates.length === 0 ? (
                                 <p className="text-center text-gray-500 mt-10">No se encontraron plantillas para "{templateSearchQuery}".</p>
                             ) : (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                    {filteredTemplates.map((template) => (
                                        <Card key={template.id} className="bg-white rounded-lg hover:shadow-lg transition duration-200 border shadow-sm overflow-hidden flex flex-col group">
                                            {/* Clickable Area */}
                                            <div onClick={() => {
                                                    if(isSubmitting || isSending || isFinalizingWithAI) return; // Prevent action during submission/sending/AI
                                                    setSelectedContract(template);
                                                    setEditedContent(template.content || ""); // Set initial content for preview/editor
                                                    // Reset dynamic data for the new contract
                                                    setSelectedParticipants([]);
                                                    setParticipantPercentages({});
                                                    setGeneralData({ jurisdiction: "", fecha: "", trackTitle: "", lugarDeFirma: "", areaArtistica: "", duracionContrato: "", periodoAviso: "" }); // Reset ALL general data
                                                    setSearchQuery(""); // Reset participant search
                                                    setStep(1); // Go to Preview step
                                                }}
                                                className="cursor-pointer flex-grow flex flex-col"
                                                aria-label={`Seleccionar plantilla: ${template.title}`}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.currentTarget.click(); }}}
                                            >
                                                {/* Placeholder Image */}
                                                <div className="w-full h-32 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-400 group-hover:from-indigo-100 group-hover:to-indigo-200 group-hover:text-indigo-400 transition-colors">
                                                    <Library size={40} strokeWidth={1.5} />
                                                </div>
                                                {/* Card Header */}
                                                <CardHeader className="p-4 pb-2 flex-shrink-0">
                                                    <CardTitle className="text-md font-semibold mb-1 line-clamp-2" title={template.title}>
                                                        {template.title}
                                                    </CardTitle>
                                                    <p className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium inline-block truncate max-w-full" title={template.category}>
                                                        {getShortCategory(template.category)}
                                                    </p>
                                                </CardHeader>
                                                {/* Card Content (Description) */}
                                                <CardContent className="p-4 pt-0 text-sm text-gray-600 line-clamp-3 flex-grow">
                                                    {template.description || <span className="italic text-gray-400">Sin descripción.</span>}
                                                </CardContent>
                                            </div>
                                            {/* Card Footer (Actions) */}
                                            <CardFooter className="p-3 pt-2 border-t bg-gray-50 flex justify-end items-center gap-1 flex-shrink-0">
                                                 {/* Edit Button */}
                                                <Button
                                                    size="icon" variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent triggering card click
                                                        if(!isSubmitting) {
                                                            setTemplateToEdit(template); // Set the template to edit
                                                            setShowEditTemplateModal(true); // Open the modal
                                                        }
                                                    }}
                                                    className="h-7 w-7 text-gray-600 hover:text-indigo-600 hover:bg-indigo-100"
                                                    aria-label={`Editar plantilla ${template.title}`}
                                                    disabled={isSubmitting}
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                {/* Delete Button */}
                                                <Button
                                                    size="icon" variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isSubmitting) {
                                                            requestDeleteTemplate(template); // Open confirmation dialog
                                                        }
                                                    }}
                                                    className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-100"
                                                    aria-label={`Eliminar plantilla ${template.title}`}
                                                    disabled={isSubmitting}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                             )}
                        </motion.div>
                    )}

                    {/* --- Step 1: Preview View --- */}
                     {step === 1 && selectedContract && (
                         <motion.div
                             key="preview"
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -10 }}
                             transition={{ duration: 0.3 }}
                             className="max-w-4xl mx-auto" // Center content
                         >
                             <Card className="bg-white p-4 md:p-6 rounded-xl border shadow-md flex flex-col">
                                 {/* Header */}
                                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-4 gap-3 flex-shrink-0">
                                     <h2 className="text-xl font-semibold text-gray-800 flex-1 truncate" title={selectedContract.title}>
                                         Vista Previa: {selectedContract.title}
                                     </h2>
                                     <div className="flex gap-2 w-full sm:w-auto">
                                         <Button size="sm" variant="outline" onClick={goToHome} className="flex-1 sm:flex-none">
                                             <Library size={14} className="mr-1" /> Biblioteca
                                         </Button>
                                         <Button size="sm" onClick={() => setStep(2)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white">
                                             Ir al Editor <Edit2 size={14} className="ml-1" />
                                         </Button>
                                     </div>
                                 </div>

                                 {/* Content Area */}
                                  {/* Use ScrollArea for potentially long content, set max height */}
                                 <ScrollArea className="flex-grow w-full border rounded-md max-h-[70vh]">
                                     <div
                                         className="prose prose-sm max-w-none bg-gray-50 p-4 md:p-6 min-h-full" // Use prose for basic HTML styling
                                         dangerouslySetInnerHTML={{ __html: applyAllDataToContent() || "<p class='text-gray-400 italic'>Contenido no disponible o vacío.</p>" }}
                                     />
                                 </ScrollArea>

                                 {/* Footer Actions (Optional: Add download buttons here too) */}
                                 <CardFooter className="p-3 pt-3 border-t flex justify-end gap-2 mt-4">
                                     <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleDownload("pdf")}
                                        disabled={isSubmitting || (!editedContent && !selectedContract?.content)}
                                      >
                                          <Download size={16} className="mr-1" /> PDF
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleDownload("word")}
                                        disabled={isSubmitting || (!editedContent && !selectedContract?.content)}
                                      >
                                          <Download size={16} className="mr-1" /> Word
                                      </Button>
                                 </CardFooter>
                             </Card>
                         </motion.div>
                     )}

                    {/* --- Step 2: Editor View --- */}
                    {step === 2 && selectedContract && (
                      <motion.div
                         key="editor"
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -10 }}
                         transition={{ duration: 0.3 }}
                         className="flex flex-col md:flex-row gap-4 lg:gap-6 h-full"
                       >
                         {/* ------------ Left Column: Editor ------------ */}
                         <div className="flex flex-col flex-grow md:w-2/3 lg:w-3/4 h-full">
                           <Card className="bg-white rounded-xl border shadow-md flex flex-col flex-grow overflow-hidden">
                             {/* Editor Header */}
                             <div className="p-3 border-b flex flex-col sm:flex-row justify-between items-center flex-shrink-0 bg-gray-50 rounded-t-xl">
                               <h2 className="text-lg font-semibold text-gray-700 truncate mb-2 sm:mb-0" title={selectedContract.title}>
                                 Editando: {selectedContract.title}
                               </h2>
                               <div className="flex items-center gap-1 flex-wrap">
                                 <Button size="sm" variant="ghost" onClick={() => setStep(1)} title="Volver a Vista Previa">
                                   <ArrowLeft size={14} className="mr-1" /> Preview
                                 </Button>
                                 <Button size="sm" variant="ghost" onClick={goToHome} title="Volver a la Biblioteca">
                                   <Library size={14} className="mr-1" /> Biblioteca
                                 </Button>
                               </div>
                             </div>

                             {/* Fixed Toolbar */}
                             <EditorToolbar
                               onCommand={execCmd}
                               onFormatCode={formatAsCode}
                               onInsertBlockquote={insertBlockquote}
                               onTriggerImageUpload={triggerImageUpload}
                               onFontSizeChange={handleFontSizeChange}
                             />

                             {/* Editable Area with Scroll */}
                             <ScrollArea className="flex-grow min-h-0 w-full border-t focus-within:ring-1 focus-within:ring-indigo-500 relative bg-white">
                               {/* Floating Toolbar */}
                               <AnimatePresence>
                                 {showFormattingToolbar && toolbarPosition && (
                                   <motion.div
                                     ref={toolbarRef}
                                     key="floating-toolbar"
                                     initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                     animate={{ opacity: 1, scale: 1, y: 0 }}
                                     exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                     transition={{ duration: 0.1, ease: "easeOut" }}
                                     className="absolute bg-gray-800 text-white rounded-lg shadow-xl px-2 py-1 flex items-center gap-0.5 z-50"
                                     style={{
                                       top: `${toolbarPosition.top}px`,
                                       left: `${toolbarPosition.left}px`,
                                     }}
                                     onMouseDown={(e) => e.preventDefault()} // Prevent editor losing focus when clicking toolbar
                                   >
                                      {/* Toolbar Buttons (Simplified) */}
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-gray-700" title="Negrita" onClick={() => execCmd("bold")}><Bold size={16} /></Button>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-gray-700" title="Cursiva" onClick={() => execCmd("italic")}><Italic size={16} /></Button>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-gray-700" title="Subrayado" onClick={() => execCmd("underline")}><Underline size={16} /></Button>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-gray-700" title="Tachado" onClick={() => execCmd("strikeThrough")}><Strikethrough size={16} /></Button>
                                   </motion.div>
                                 )}
                               </AnimatePresence>

                               {/* Editor Div */}
                               <div
                                 ref={editorRef}
                                 contentEditable
                                 dangerouslySetInnerHTML={{ __html: editedContent || selectedContract.content }}
                                 onInput={(e: React.SyntheticEvent<HTMLDivElement>) => {
                                     const currentContent = (e.target as HTMLDivElement).innerHTML;
                                     if (editorRef.current && currentContent !== editedContent) {
                                         setEditedContent(currentContent);
                                     }
                                 }}
                                 onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
                                      const currentContent = e.target.innerHTML;
                                      if (editorRef.current && currentContent !== editedContent) {
                                          setEditedContent(currentContent);
                                      }
                                      requestAnimationFrame(updateToolbarState);
                                 }}
                                 onFocus={updateToolbarState} // Update toolbar on focus
                                 onKeyDown={(e) => {
                                     if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        document.execCommand("insertParagraph", false);
                                     }
                                 }}
                                 className="prose prose-sm max-w-none w-full p-4 focus:outline-none whitespace-pre-wrap break-words min-h-full"
                                 style={{ wordBreak: "break-word", overflowWrap: "break-word", hyphens: "auto" }}
                                 suppressContentEditableWarning // Suppress React warning about managing contenteditable
                                 aria-label="Editor de contenido del contrato"
                                 role="textbox"
                                 aria-multiline="true"
                               />
                             </ScrollArea>

                             {/* ------------ Editor Footer (UPDATED BUTTONS) ------------ */}
                              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 border-t bg-gray-50 flex-shrink-0">
                                  {/* Download Buttons */}
                                  <div className="flex gap-2 w-full sm:w-auto justify-start">
                                      <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleDownload("pdf")}
                                          disabled={isSubmitting || isSending || isFinalizingWithAI || !editorRef.current?.innerHTML?.trim()}
                                      >
                                          <Download size={16} className="mr-1" /> PDF
                                      </Button>
                                      <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleDownload("word")}
                                          disabled={isSubmitting || isSending || isFinalizingWithAI || !editorRef.current?.innerHTML?.trim()}
                                      >
                                          <Download size={16} className="mr-1" /> Word
                                      </Button>
                                  </div>

                                  {/* --- Action Buttons --- */}
                                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                                      {/* --- FINALIZAR CON IA --- */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleFinalizeWithAI}
                                        disabled={
                                          !selectedContract ||
                                          selectedParticipants.length === 0 ||
                                          Math.abs(totalPercentage - 100) >= 0.01 ||
                                          !isGeneralDataComplete ||
                                          isSubmitting || isSending || isFinalizingWithAI
                                        }
                                        className="border-purple-500 text-purple-700 hover:bg-purple-50"
                                      >
                                        {isFinalizingWithAI
                                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          : <Sparkles className="mr-1 text-yellow-500" size={16} />}
                                        Finalizar con IA
                                      </Button>

                                      {/* --- ENVIAR --- */}
                                      <Button
                                        onClick={handleSendContract}
                                        disabled={
                                            !isEditorReadyToSend ||
                                            isSubmitting || isSending || isFinalizingWithAI
                                        }
                                        className={`bg-green-600 hover:bg-green-700 text-white ${
                                            (!isEditorReadyToSend || isSending || isSubmitting || isFinalizingWithAI) ? "opacity-50 cursor-not-allowed" : ""
                                        }`}
                                        aria-live="polite"
                                      >
                                        {isSending
                                          ? <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando… </>
                                          : <> <Send className="mr-1" size={16} /> Enviar Contrato Finalizado </>
                                        }
                                      </Button>
                                  </div>
                              </CardFooter>
                           </Card>
                         </div> {/* End Left Column */}

                         {/* ------------ Right Column: Sidebar ------------ */}
                         <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col h-full flex-shrink-0">
                           <Card className="bg-white rounded-xl border shadow-md flex flex-col flex-grow overflow-hidden">
                             {/* Sidebar Scroll Area */}
                             <ScrollArea className="flex-grow min-h-0">
                               <div className="p-4 space-y-6">

                                 {/* ---------- Participants Section ---------- */}
                                 <section aria-labelledby="participants-heading">
                                    <h3 id="participants-heading" className="text-md font-semibold mb-3 flex items-center text-gray-700">
                                        <Users size={18} className="mr-2 text-indigo-600" /> Participantes
                                    </h3>
                                    {/* Search Clients */}
                                    <div className="mb-3 relative">
                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                      <Input
                                        type="text"
                                        placeholder="Buscar cliente por nombre o email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 h-9 text-sm"
                                        disabled={isLoading || isSubmitting || isSending || isFinalizingWithAI}
                                      />
                                    </div>
                                    {/* Client List */}
                                     <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 bg-gray-50">
                                     {isLoading && clients.length === 0 ? (
                                        <p className="text-center text-xs text-gray-500 py-3"><Loader2 className="inline-block mr-1 h-3 w-3 animate-spin" />Cargando...</p>
                                    ) : filteredClientsForParticipants.length === 0 ? (
                                        <p className="text-center text-xs text-gray-500 py-3">
                                        {searchQuery ? `No hay resultados para "${searchQuery}"` : clients.length === 0 ? "No hay clientes." : "No se encontraron clientes."}
                                        </p>
                                    ) : (
                                        filteredClientsForParticipants.map((client) => (
                                        <div key={client.id} className="flex items-center p-1.5 rounded hover:bg-indigo-50 text-sm transition-colors">
                                            <input
                                            type="checkbox"
                                            id={`sidebar-client-select-${client.id}`}
                                            checked={selectedParticipants.includes(client.email)}
                                            onChange={(e) => handleCheckboxChange(e, client.email)}
                                            className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            disabled={isSubmitting || isSending || isFinalizingWithAI}
                                            aria-labelledby={`label-client-${client.id}`}
                                            />
                                            <label
                                                htmlFor={`sidebar-client-select-${client.id}`}
                                                id={`label-client-${client.id}`}
                                                className="flex-1 cursor-pointer select-none"
                                            >
                                            <span className="font-medium block truncate" title={client.FullName || client.email}>
                                                {client.FullName || client.email}
                                            </span>
                                            <span className="text-xs text-gray-500">({client.role || "Sin rol"})</span>
                                            </label>
                                        </div>
                                        ))
                                    )}
                                    </div>
                                      <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => setShowAddClientSidebar(true)} disabled={isSubmitting || isSending || isFinalizingWithAI}>
                                          <UserPlus size={14} className="mr-1"/> Añadir Nuevo Cliente
                                      </Button>
                                 </section>

                                 <Separator />

                                 {/* ---------- Percentages Section ---------- */}
                                 {selectedParticipants.length > 0 && (
                                    <section aria-labelledby="percentages-heading-sidebar">
                                     <h3 id="percentages-heading-sidebar" className="text-md font-semibold mb-3 flex items-center text-gray-700">
                                         <Percent size={18} className="mr-2 text-indigo-600" /> Porcentajes (%)
                                     </h3>
                                     <div className="space-y-2">
                                     {selectedParticipants.map((email) => {
                                         const c = clients.find((cl) => cl.email === email);
                                         return (
                                         <div key={email} className="flex items-center gap-2 text-sm justify-between">
                                             <Label
                                                 htmlFor={`sidebar-perc-${email}`}
                                                 className="flex-1 truncate pr-2 text-xs select-none"
                                                 title={c?.FullName || email}
                                             >
                                                {c?.FullName || email}
                                             </Label>
                                             <div className="flex items-center gap-1 w-20 flex-shrink-0">
                                                <Input
                                                     id={`sidebar-perc-${email}`}
                                                     type="number"
                                                     min="0" max="100" step="0.01" // Allow decimals
                                                     value={participantPercentages[email] ?? ""} // Use empty string if undefined
                                                     onChange={(e) => handlePercentageChange(email, e.target.value)}
                                                     className="h-7 px-1.5 text-xs rounded w-full appearance-none" // Hide number spinners
                                                     style={{MozAppearance: 'textfield'}} // Firefox hide spinners
                                                     placeholder="0"
                                                     aria-label={`Porcentaje para ${c?.FullName || email}`}
                                                     disabled={isSubmitting || isSending || isFinalizingWithAI} // Disable during operations
                                                 />
                                                <span className="text-xs text-gray-400">%</span>
                                             </div>
                                         </div>
                                         );
                                     })}
                                     </div>
                                     {/* Total Percentage Indicator */}
                                     <div className={`text-right text-sm font-semibold mt-2 pr-1 ${
                                         Math.abs(totalPercentage - 100) < 0.01 ? "text-green-600" : "text-red-600"
                                     }`}>
                                         Total: {totalPercentage.toFixed(2)}%
                                         {Math.abs(totalPercentage - 100) >= 0.01 && (
                                         <AlertTriangle size={14} className="inline ml-1 mb-0.5" aria-label="Alerta: El total no es 100%" />
                                         )}
                                     </div>
                                     {Math.abs(totalPercentage - 100) >= 0.01 && (
                                         <p role="alert" className="text-xs text-red-600 text-center mt-1">
                                             La suma de porcentajes debe ser exactamente 100%.
                                         </p>
                                     )}
                                    </section>
                                 )}

                                 <Separator />

                                 {/* ---------- General Data Section ---------- */}
                                 <section aria-labelledby="general-data-heading-sidebar">
                                     <h3 id="general-data-heading-sidebar" className="text-md font-semibold mb-3 flex items-center text-gray-700">
                                         <Settings2 size={18} className="mr-2 text-indigo-600" /> Datos Generales
                                     </h3>
                                     <div className="space-y-3">
                                          {/* Lugar de Firma */}
                                         <div>
                                             <Label htmlFor="sidebar-general-lugar" className="mb-1 block text-xs">Lugar de Firma</Label>
                                             <Input id="sidebar-general-lugar" type="text" placeholder="Ej: Madrid, España" value={generalData.lugarDeFirma || ""} onChange={(e) => setGeneralData((p) => ({ ...p, lugarDeFirma: e.target.value })) } className="w-full text-sm h-9" disabled={isSubmitting || isSending || isFinalizingWithAI}/>
                                         </div>
                                         {/* Jurisdicción */}
                                         <div>
                                              <Label htmlFor="sidebar-general-jurisdiction" className="mb-1 block text-xs"> Jurisdicción<span className="text-red-500 ml-1">*</span> </Label>
                                              <select id="sidebar-general-jurisdiction" value={generalData.jurisdiction} onChange={(e) => setGeneralData((p) => ({ ...p, jurisdiction: e.target.value })) } className="w-full text-sm h-9 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white" required aria-required="true" disabled={isSubmitting || isSending || isFinalizingWithAI} >
                                                 <option value="" disabled> Selecciona...</option>
                                                 {/* Add common jurisdictions */}
                                                 <option value="España">España</option>
                                                 <option value="México">México</option>
                                                 <option value="Argentina">Argentina</option>
                                                 <option value="Colombia">Colombia</option>
                                                 <option value="Chile">Chile</option>
                                                 <option value="Perú">Perú</option>
                                                 <option value="Estados Unidos">Estados Unidos</option>
                                                 <option value="Reino Unido">Reino Unido</option>
                                                 <option value="Otro">Otro</option>
                                               </select>
                                          </div>
                                          {/* Fecha */}
                                          <div>
                                              <Label htmlFor="sidebar-general-fecha" className="mb-1 block text-xs"> Fecha del Contrato<span className="text-red-500 ml-1">*</span> </Label>
                                              <Input id="sidebar-general-fecha" type="date" value={generalData.fecha} onChange={(e) => setGeneralData((p) => ({ ...p, fecha: e.target.value })) } className="w-full text-sm h-9" required aria-required="true" disabled={isSubmitting || isSending || isFinalizingWithAI} />
                                           </div>
                                           {/* Track Title */}
                                           <div>
                                               <Label htmlFor="sidebar-general-track" className="mb-1 block text-xs"> Título Track / Obra<span className="text-red-500 ml-1">*</span> </Label>
                                               <Input id="sidebar-general-track" type="text" placeholder="Ej: Corazón Digital" value={generalData.trackTitle} onChange={(e) => setGeneralData((p) => ({ ...p, trackTitle: e.target.value })) } className="w-full text-sm h-9" required aria-required="true" disabled={isSubmitting || isSending || isFinalizingWithAI} />
                                           </div>
                                            {/* Otros campos generales */}
                                           <div> <Label htmlFor="sidebar-general-area" className="mb-1 block text-xs">Área Artística</Label> <Input id="sidebar-general-area" type="text" placeholder="Ej: Música Grabada" value={generalData.areaArtistica || ""} onChange={(e) => setGeneralData(p => ({ ...p, areaArtistica: e.target.value }))} className="w-full text-sm h-9" disabled={isSubmitting || isSending || isFinalizingWithAI}/> </div>
                                           <div> <Label htmlFor="sidebar-general-duracion" className="mb-1 block text-xs">Duración Contrato</Label> <Input id="sidebar-general-duracion" type="text" placeholder="Ej: 3 años" value={generalData.duracionContrato || ""} onChange={(e) => setGeneralData(p => ({ ...p, duracionContrato: e.target.value }))} className="w-full text-sm h-9" disabled={isSubmitting || isSending || isFinalizingWithAI}/> </div>
                                           <div> <Label htmlFor="sidebar-general-aviso" className="mb-1 block text-xs">Periodo Aviso (Renovación/Term.)</Label> <Input id="sidebar-general-aviso" type="text" placeholder="Ej: 60 días" value={generalData.periodoAviso || ""} onChange={(e) => setGeneralData(p => ({ ...p, periodoAviso: e.target.value }))} className="w-full text-sm h-9" disabled={isSubmitting || isSending || isFinalizingWithAI}/> </div>

                                           {/* Validation Message */}
                                           {!isGeneralDataComplete && selectedParticipants.length > 0 && ( // Show only if participants selected but data missing
                                               <p role="alert" className="text-xs text-red-600 text-center mt-1">
                                                  Completa los campos requeridos (*).
                                               </p>
                                           )}
                                     </div>
                                 </section>

                               </div> {/* End p-4 */}
                             </ScrollArea>
                           </Card>
                         </div> {/* End Right Column */}
                      </motion.div> // End Editor Layout
                    )}

                    {/* --- Step 3: Sent Contracts View --- */}
                     {step === 3 && !crmMode && (
                         <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                             <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">Contratos Enviados</h2>
                             {isLoading && sentContracts.length === 0 ? (
                                 <p className="text-center text-gray-500 mt-10"><Loader2 className="inline-block mr-2 h-5 w-5 animate-spin" />Cargando enviados...</p>
                             ) : sentContracts.length === 0 ? (
                                 <div className="text-center text-gray-500 mt-10 py-8 border rounded-lg bg-white shadow-sm">
                                      <Send size={40} className="mx-auto mb-3 text-gray-400"/>
                                      <p className="font-semibold">No hay contratos enviados.</p>
                                      <p className="text-sm mt-1">Empieza seleccionando una plantilla en la <Button variant="link" size="sm" className="p-0 h-auto" onClick={goToHome}>biblioteca</Button>.</p>
                                 </div>
                             ) : (
                                 <div className="space-y-4">
                                     {sentContracts.map((contract) => (
                                         <Card key={contract.id} className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                             <div className="flex-grow">
                                                 <h3 className="font-semibold text-md truncate" title={contract.title}>{contract.title}</h3>
                                                 <p className="text-xs text-gray-500">Enviado: {new Date(contract.date).toLocaleDateString()} {new Date(contract.date).toLocaleTimeString()}</p>
                                                 <div className="text-xs mt-1">
                                                    {contract.participants.slice(0, 3).map(p => p.name).join(', ')}
                                                    {contract.participants.length > 3 ? '...' : ''}
                                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${contract.status === 'Signed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {contract.status || 'Enviado'}
                                                    </span>
                                                 </div>
                                             </div>
                                             <div className="flex gap-2 flex-shrink-0 mt-2 sm:mt-0">
                                                 <Button size="sm" variant="outline" onClick={() => setViewingSentContract(contract)}>
                                                     <Eye size={14} className="mr-1"/> Ver
                                                 </Button>
                                                 {/* Add other actions like Resend, Track Status, etc. */}
                                             </div>
                                         </Card>
                                     ))}
                                 </div>
                             )}
                         </motion.div>
                     )}

                    {/* --- Step 4: CRM View --- */}
                    {crmMode && step === 4 && (
                        <motion.div key="crm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                 <h2 className="text-xl md:text-2xl font-semibold text-gray-800">Gestión de Clientes (CRM)</h2>
                                 <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                     {/* CRM Search */}
                                     <div className="relative w-full sm:w-64">
                                         <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                         <Input type="text" placeholder="Buscar por nombre, email, rol..." value={templateSearchQuery} // Using templateSearchQuery also for CRM
                                             onChange={(e) => setTemplateSearchQuery(e.target.value)} className="pl-10 w-full" aria-label="Buscar clientes en CRM" disabled={isLoading || isSubmitting}/>
                                     </div>
                                     {/* Add Client Button */}
                                     <Button onClick={() => { setNewClient(INITIAL_NEW_CLIENT_STATE); setShowAddClientSidebar(true); }} className="flex items-center gap-2 justify-center sm:justify-start bg-indigo-600 hover:bg-indigo-700 text-white" aria-label="Añadir Nuevo Cliente" disabled={isSubmitting}>
                                          <UserPlus size={16} /> Añadir Cliente
                                      </Button>
                                 </div>
                            </div>
                            {/* CRM Client Grid */}
                            {(() => {
                                const filteredCRMClients = clients.filter(c =>
                                    (c.FullName?.toLowerCase() || "").includes(templateSearchQuery.toLowerCase()) ||
                                    (c.email?.toLowerCase() || "").includes(templateSearchQuery.toLowerCase()) ||
                                    (c.role?.toLowerCase() || "").includes(templateSearchQuery.toLowerCase())
                                );
                                return isLoading && clients.length === 0 ? (
                                     <p className="text-center text-gray-500 mt-10"><Loader2 className="inline-block mr-2 h-5 w-5 animate-spin" />Cargando clientes...</p>
                                 ) : !isLoading && clients.length === 0 ? (
                                     <div className="text-center text-gray-500 mt-10 py-8 border rounded-lg bg-white shadow-sm">
                                         <Users size={40} className="mx-auto mb-3 text-gray-400"/>
                                         <p className="font-semibold">No hay clientes registrados.</p>
                                         <p className="text-sm mt-1">Puedes <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowAddClientSidebar(true)}>añadir el primero</Button>.</p>
                                     </div>
                                 ) : filteredCRMClients.length === 0 ? (
                                     <p className="text-center text-gray-500 mt-10"> No se encontraron clientes para "{templateSearchQuery}". </p>
                                 ) : (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                                         {filteredCRMClients.map((client) => (
                                             <Card key={client.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                                                 {/* Client Info */}
                                                 <div>
                                                      <h3 className="font-semibold truncate text-sm" title={client.FullName}>
                                                          {client.FullName || client.email}
                                                      </h3>
                                                      <p className="text-xs text-gray-500 truncate" title={client.email}>
                                                          {client.email}
                                                      </p>
                                                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium ${client.role ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"} `}>
                                                          {client.role || "Sin rol"}
                                                      </span>
                                                      {client.phone && (
                                                          <p className="text-xs text-gray-500 mt-1 truncate" title={client.phone}>
                                                              📞 {client.phone}
                                                          </p>
                                                      )}
                                                 </div>
                                                 {/* Actions */}
                                                 <div className="flex justify-end gap-1 mt-3 pt-2 border-t">
                                                     <Button size="icon" variant="ghost" onClick={() => { if(!isSubmitting) { setEditingClient(client); setShowEditClientSidebar(true); } }} className="h-7 w-7 text-gray-600 hover:text-indigo-600 hover:bg-indigo-100" aria-label={`Editar cliente ${client.name}`} disabled={isSubmitting}>
                                                          <Edit size={14} />
                                                      </Button>
                                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => {if(!isSubmitting) requestDeleteClient(client)}} aria-label={`Eliminar cliente ${client.name}`} disabled={isSubmitting}>
                                                          <Trash2 size={14} />
                                                      </Button>
                                                 </div>
                                             </Card>
                                         ))}
                                     </div>
                                 );
                            })()}
                        </motion.div>
                    )}

                    {/* --- Step 5: Signed View (Placeholder) --- */}
                     {step === 5 && !crmMode && (
                        <motion.div key="signed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="text-center text-gray-600 py-10">
                             <CheckCircle size={48} className="mx-auto mb-4 text-green-500"/>
                             <p className="text-lg font-semibold">Contratos Firmados</p>
                             <p className="text-sm mt-2">(Esta sección mostrará los contratos completados - Funcionalidad Futura)</p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* --- Modals & Sidebars --- */}

            {/* Add Client Sidebar */}
             <AnimatePresence> {showAddClientSidebar && (
                 <motion.div
                     ref={addClientSidebarRef}
                     key="add-client-sidebar"
                     initial={{ opacity: 0, x: "100%" }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: "100%" }}
                     transition={{ duration: 0.3, ease: "easeInOut" }}
                     className="fixed inset-y-0 right-0 w-full sm:w-[600px] max-w-[95vw] bg-white shadow-xl z-[60] overflow-hidden flex flex-col border-l"
                     role="dialog" aria-modal="true" aria-labelledby="add-client-title"
                 >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                        <h2 id="add-client-title" className="text-xl font-semibold text-gray-800">Añadir Nuevo Cliente</h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowAddClientSidebar(false)} aria-label="Cerrar panel de añadir cliente"> <X size={20}/> </Button>
                    </div>
                    {/* Form Area */}
                    <ScrollArea className="flex-1">
                        {/* Using Tabs for organization */}
                        <Tabs defaultValue="personal" className="p-4 md:p-6">
                            <TabsList className="mb-4 grid w-full grid-cols-3 lg:grid-cols-5 text-xs sm:text-sm">
                                <TabsTrigger value="personal">Personal</TabsTrigger>
                                <TabsTrigger value="contact">Contacto</TabsTrigger>
                                <TabsTrigger value="social">Social</TabsTrigger>
                                <TabsTrigger value="label">Sello</TabsTrigger>
                                <TabsTrigger value="publisher">Editorial</TabsTrigger>
                            </TabsList>

                            {/* Tab Content */}
                            <TabsContent value="personal" className="mt-4 space-y-4">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                           <Label htmlFor="add-firstName">Nombre<span className="text-red-500 ml-1">*</span></Label>
                                           <Input id="add-firstName" name="firstName" value={newClient.firstName || ""} onChange={handleClientFormChange} required aria-required="true" placeholder="Ej: Ana" disabled={isSubmitting}/>
                                      </div>
                                      <div>
                                           <Label htmlFor="add-lastName">Apellido<span className="text-red-500 ml-1">*</span></Label>
                                           <Input id="add-lastName" name="lastName" value={newClient.lastName || ""} onChange={handleClientFormChange} required aria-required="true" placeholder="Ej: García" disabled={isSubmitting}/>
                                      </div>
                                 </div>
                                 <div>
                                      <Label htmlFor="add-role">Rol Principal</Label>
                                       <select id="add-role" name="role" value={newClient.role || ""} onChange={handleClientFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white" disabled={isSubmitting}>
                                           <option value="">Seleccionar Rol...</option>
                                           <option value="Artist">Artista</option>
                                           <option value="Producer">Productor</option>
                                           <option value="Songwriter">Compositor</option>
                                           <option value="Manager">Manager</option>
                                           <option value="Label">Sello</option>
                                           <option value="Publisher">Editorial</option>
                                           <option value="Other">Otro</option>
                                       </select>
                                 </div>
                                 <div>
                                      <Label htmlFor="add-passport">DNI / Pasaporte</Label>
                                      <Input id="add-passport" name="passport" value={newClient.passport || ""} onChange={handleClientFormChange} placeholder="Número de identificación" disabled={isSubmitting}/>
                                 </div>
                            </TabsContent>

                            <TabsContent value="contact" className="mt-4 space-y-4">
                                <div>
                                     <Label htmlFor="add-email">Email<span className="text-red-500 ml-1">*</span></Label>
                                     <Input id="add-email" name="email" type="email" value={newClient.email || ""} onChange={handleClientFormChange} required aria-required="true" placeholder="ejemplo@dominio.com" disabled={isSubmitting}/>
                                </div>
                                <div>
                                     <Label htmlFor="add-phone">Teléfono</Label>
                                     <Input id="add-phone" name="phone" type="tel" value={newClient.phone || ""} onChange={handleClientFormChange} placeholder="+34 600 000 000" disabled={isSubmitting}/>
                                </div>
                                <div>
                                     <Label htmlFor="add-address">Dirección</Label>
                                     <Input id="add-address" name="address" value={newClient.address || ""} onChange={handleClientFormChange} placeholder="Calle, Número, Ciudad" disabled={isSubmitting}/>
                                </div>
                                <div>
                                     <Label htmlFor="add-country">País</Label>
                                     <Input id="add-country" name="country" value={newClient.country || ""} onChange={handleClientFormChange} placeholder="Ej: España" disabled={isSubmitting}/>
                                </div>
                            </TabsContent>

                            <TabsContent value="social" className="mt-4 space-y-4">
                                <div> <Label htmlFor="add-instagram">Instagram</Label> <Input id="add-instagram" name="instagram" value={newClient.instagram || ""} onChange={handleClientFormChange} placeholder="@usuario" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-facebook">Facebook</Label> <Input id="add-facebook" name="facebook" value={newClient.facebook || ""} onChange={handleClientFormChange} placeholder="URL perfil o página" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-twitter">Twitter / X</Label> <Input id="add-twitter" name="twitter" value={newClient.twitter || ""} onChange={handleClientFormChange} placeholder="@usuario" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-linkedin">LinkedIn</Label> <Input id="add-linkedin" name="linkedin" value={newClient.linkedin || ""} onChange={handleClientFormChange} placeholder="URL perfil" disabled={isSubmitting}/> </div>
                            </TabsContent>

                             <TabsContent value="label" className="mt-4 space-y-4">
                                <div> <Label htmlFor="add-labelName">Nombre del Sello</Label> <Input id="add-labelName" name="labelName" value={newClient.labelName || ""} onChange={handleClientFormChange} disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-labelEmail">Email del Sello</Label> <Input id="add-labelEmail" name="labelEmail" type="email" value={newClient.labelEmail || ""} onChange={handleClientFormChange} disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-labelPhone">Teléfono Sello</Label> <Input id="add-labelPhone" name="labelPhone" type="tel" value={newClient.labelPhone || ""} onChange={handleClientFormChange} disabled={isSubmitting}/> </div>
                            </TabsContent>

                             <TabsContent value="publisher" className="mt-4 space-y-4">
                                <div> <Label htmlFor="add-publisherName">Nombre Editorial</Label> <Input id="add-publisherName" name="publisherName" value={newClient.publisherName || ""} onChange={handleClientFormChange} disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-publisherIpi">IPI / CAE</Label> <Input id="add-publisherIpi" name="publisherIpi" value={newClient.publisherIpi || ""} onChange={handleClientFormChange} placeholder="Número IPI/CAE" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-publisherEmail">Email Editorial</Label> <Input id="add-publisherEmail" name="publisherEmail" type="email" value={newClient.publisherEmail || ""} onChange={handleClientFormChange} disabled={isSubmitting}/> </div>
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                    {/* Footer Actions */}
                    <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 flex-shrink-0">
                        <Button variant="outline" onClick={() => setShowAddClientSidebar(false)} disabled={isSubmitting}> Cancelar </Button>
                        <Button onClick={handleSaveClient} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                             {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Guardando...</> : <><Save size={16} className="mr-2" /> Guardar Cliente</>}
                        </Button>
                    </div>
                 </motion.div>
            )} </AnimatePresence>

            {/* Edit Client Sidebar */}
            <AnimatePresence> {showEditClientSidebar && editingClient && (
                <motion.div
                    ref={editClientSidebarRef}
                    key="edit-client-sidebar"
                    initial={{ opacity: 0, x: "100%" }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: "100%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="fixed inset-y-0 right-0 w-full sm:w-[600px] max-w-[95vw] bg-white shadow-xl z-[60] overflow-hidden flex flex-col border-l"
                    role="dialog" aria-modal="true" aria-labelledby="edit-client-title"
                >
                     {/* Header */}
                     <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                         <h2 id="edit-client-title" className="text-xl font-semibold text-gray-800 truncate pr-2"> Editando: {editingClient.name} </h2>
                         <Button variant="ghost" size="icon" onClick={() => { setShowEditClientSidebar(false); setEditingClient(null); setEditedClientData({}); }} aria-label="Cerrar panel de edición"> <X size={20}/> </Button>
                     </div>
                     {/* Form Area */}
                     <ScrollArea className="flex-1">
                         <Tabs defaultValue="personal" className="p-4 md:p-6">
                              <TabsList className="mb-4 grid w-full grid-cols-3 lg:grid-cols-5 text-xs sm:text-sm">
                                  <TabsTrigger value="personal">Personal</TabsTrigger>
                                  <TabsTrigger value="contact">Contacto</TabsTrigger>
                                  <TabsTrigger value="social">Social</TabsTrigger>
                                  <TabsTrigger value="label">Sello</TabsTrigger>
                                  <TabsTrigger value="publisher">Editorial</TabsTrigger>
                              </TabsList>
                              {/* Form fields using editedClientData and handleClientFormChange */}
                               <TabsContent value="personal" className="mt-4 space-y-4">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                           <Label htmlFor="edit-firstName">Nombre<span className="text-red-500 ml-1">*</span></Label>
                                           <Input id="edit-firstName" name="firstName" value={editedClientData.firstName ?? editingClient.firstName ?? ''} onChange={handleClientFormChange} required aria-required="true" disabled={isSubmitting}/>
                                      </div>
                                      <div>
                                           <Label htmlFor="edit-lastName">Apellido<span className="text-red-500 ml-1">*</span></Label>
                                           <Input id="edit-lastName" name="lastName" value={editedClientData.lastName ?? editingClient.lastName ?? ''} onChange={handleClientFormChange} required aria-required="true" disabled={isSubmitting}/>
                                      </div>
                                 </div>
                                 <div>
                                      <Label htmlFor="edit-role">Rol Principal</Label>
                                       <select id="edit-role" name="role" value={editedClientData.role ?? editingClient.role ?? ''} onChange={handleClientFormChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white" disabled={isSubmitting}>
                                           <option value="">Seleccionar Rol...</option>
                                           <option value="Artist">Artista</option> <option value="Producer">Productor</option> <option value="Songwriter">Compositor</option> <option value="Manager">Manager</option> <option value="Label">Sello</option> <option value="Publisher">Editorial</option> <option value="Other">Otro</option>
                                       </select>
                                 </div>
                                 <div>
                                      <Label htmlFor="edit-passport">DNI / Pasaporte</Label>
                                      <Input id="edit-passport" name="passport" value={editedClientData.passport ?? editingClient.passport ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/>
                                 </div>
                             </TabsContent>
                             <TabsContent value="contact" className="mt-4 space-y-4">
                                 <div>
                                      <Label htmlFor="edit-email">Email<span className="text-red-500 ml-1">*</span></Label>
                                      <Input id="edit-email" name="email" type="email" value={editedClientData.email ?? editingClient.email ?? ''} onChange={handleClientFormChange} required aria-required="true" disabled={isSubmitting}/>
                                 </div>
                                 <div>
                                      <Label htmlFor="edit-phone">Teléfono</Label>
                                      <Input id="edit-phone" name="phone" type="tel" value={editedClientData.phone ?? editingClient.phone ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/>
                                 </div>
                                 <div>
                                      <Label htmlFor="edit-address">Dirección</Label>
                                      <Input id="edit-address" name="address" value={editedClientData.address ?? editingClient.address ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/>
                                 </div>
                                 <div>
                                      <Label htmlFor="edit-country">País</Label>
                                      <Input id="edit-country" name="country" value={editedClientData.country ?? editingClient.country ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/>
                                 </div>
                             </TabsContent>
                             <TabsContent value="social" className="mt-4 space-y-4">
                                <div><Label htmlFor="edit-instagram">Instagram</Label><Input id="edit-instagram" name="instagram" value={editedClientData.instagram ?? editingClient.instagram ?? ''} onChange={handleClientFormChange} placeholder="@usuario" disabled={isSubmitting}/></div>
                                <div><Label htmlFor="edit-facebook">Facebook</Label><Input id="edit-facebook" name="facebook" value={editedClientData.facebook ?? editingClient.facebook ?? ''} onChange={handleClientFormChange} placeholder="URL perfil o página" disabled={isSubmitting}/></div>
                                <div><Label htmlFor="edit-twitter">Twitter / X</Label><Input id="edit-twitter" name="twitter" value={editedClientData.twitter ?? editingClient.twitter ?? ''} onChange={handleClientFormChange} placeholder="@usuario" disabled={isSubmitting}/></div>
                                <div><Label htmlFor="edit-linkedin">LinkedIn</Label><Input id="edit-linkedin" name="linkedin" value={editedClientData.linkedin ?? editingClient.linkedin ?? ''} onChange={handleClientFormChange} placeholder="URL perfil" disabled={isSubmitting}/></div>
                             </TabsContent>
                             <TabsContent value="label" className="mt-4 space-y-4">
                                 <div><Label htmlFor="edit-labelName">Nombre Sello</Label><Input id="edit-labelName" name="labelName" value={editedClientData.labelName ?? editingClient.labelName ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/></div>
                                 <div><Label htmlFor="edit-labelEmail">Email Sello</Label><Input id="edit-labelEmail" name="labelEmail" type="email" value={editedClientData.labelEmail ?? editingClient.labelEmail ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/></div>
                                 <div><Label htmlFor="edit-labelPhone">Teléfono Sello</Label><Input id="edit-labelPhone" name="labelPhone" type="tel" value={editedClientData.labelPhone ?? editingClient.labelPhone ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/></div>
                             </TabsContent>
                             <TabsContent value="publisher" className="mt-4 space-y-4">
                                  <div><Label htmlFor="edit-publisherName">Nombre Editorial</Label><Input id="edit-publisherName" name="publisherName" value={editedClientData.publisherName ?? editingClient.publisherName ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/></div>
                                  <div><Label htmlFor="edit-publisherIpi">IPI / CAE</Label><Input id="edit-publisherIpi" name="publisherIpi" value={editedClientData.publisherIpi ?? editingClient.publisherIpi ?? ''} onChange={handleClientFormChange} placeholder="Número IPI/CAE" disabled={isSubmitting}/></div>
                                  <div><Label htmlFor="edit-publisherEmail">Email Editorial</Label><Input id="edit-publisherEmail" name="publisherEmail" type="email" value={editedClientData.publisherEmail ?? editingClient.publisherEmail ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/></div>
                                  <div><Label htmlFor="edit-publisherPhone">Teléfono Editorial</Label><Input id="edit-publisherPhone" name="publisherPhone" type="tel" value={editedClientData.publisherPhone ?? editingClient.publisherPhone ?? ''} onChange={handleClientFormChange} disabled={isSubmitting}/></div>
                             </TabsContent>
                         </Tabs>
                     </ScrollArea>
                     {/* Footer Actions */}
                     <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 flex-shrink-0">
                         <Button variant="outline" onClick={() => { setShowEditClientSidebar(false); setEditingClient(null); setEditedClientData({}); }} disabled={isSubmitting}> Cancelar </Button>
                         <Button onClick={handleUpdateClient} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                             {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Actualizando...</> : <><Save size={16} className="mr-2" /> Guardar Cambios</>}
                         </Button>
                     </div>
                 </motion.div>
            )} </AnimatePresence>

             {/* View Sent Contract Modal */}
             <Dialog open={!!viewingSentContract} onOpenChange={(open: boolean) => !open && setViewingSentContract(null)}>
                 <DialogContent className="max-w-3xl"> {/* Wider modal for content */}
                     <DialogHeader>
                          <DialogTitle>Detalles del Contrato Enviado</DialogTitle>
                          <DialogDescription> &ldquo;{viewingSentContract?.title}&rdquo; </DialogDescription> {/* CORRECCIÓN: Comillas escapadas */}
                      </DialogHeader>
                     <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-2"> {/* Scroll content if needed */}
                         <div className="flex justify-between text-sm text-gray-600 border-b pb-2 mb-3">
                             <span>Enviado: {viewingSentContract ? new Date(viewingSentContract.date).toLocaleString() : "N/A"}</span>
                             <span>Estado: <span className={`font-medium ${viewingSentContract?.status === 'Signed' ? 'text-green-600' : 'text-blue-600'}`}>{viewingSentContract?.status || 'Enviado'}</span></span>
                         </div>

                         <div>
                             <p className="font-medium mb-2 text-gray-700">Participantes:</p>
                             <ul className="list-none space-y-1 text-sm">
                                 {viewingSentContract?.participants.map((p, idx) => (
                                     <li key={idx} className="flex justify-between items-center border-b border-gray-100 py-1">
                                         <span>{p.name} ({p.role}) - {p.email}</span>
                                         <span className="font-medium">{p.percentage?.toFixed(2) ?? 0}%</span>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                         <hr/>
                         <div>
                             <p className="font-medium mb-2 text-gray-700">Contenido Enviado:</p>
                             {/* Use ScrollArea for the content itself */}
                             <ScrollArea className="max-h-[40vh] w-full border rounded-md bg-gray-50">
                                 <div
                                     className="prose prose-sm max-w-none p-4"
                                     dangerouslySetInnerHTML={{ __html: viewingSentContract?.content || "<p class='italic text-gray-400'>Contenido no disponible.</p>" }}
                                 />
                             </ScrollArea>
                         </div>
                     </div>
                     <DialogFooter className="mt-6 gap-2 flex-wrap justify-end">
                          <Button variant="secondary" onClick={() => viewingSentContract && downloadPdfContent(viewingSentContract.content, viewingSentContract.title)} disabled={isSubmitting}> <Download size={16} className="mr-1"/> PDF </Button>
                          <Button variant="secondary" onClick={() => viewingSentContract && downloadWordContent(viewingSentContract.content, viewingSentContract.title)} disabled={isSubmitting}> <Download size={16} className="mr-1"/> Word </Button>
                          <Button variant="outline" onClick={() => setViewingSentContract(null)}> Cerrar </Button>
                      </DialogFooter>
                 </DialogContent>
             </Dialog>

             {/* Confirm Delete Client Modal */}
             <Dialog open={!!confirmingDeleteClient} onOpenChange={(open: boolean) => !open && setConfirmingDeleteClient(null)}>
                 <DialogContent className="max-w-md">
                      <DialogHeader>
                           <DialogTitle className="flex items-center text-red-600">
                               <AlertTriangle className="mr-2" size={22}/> Confirmar Eliminación
                           </DialogTitle>
                           {/* CORRECCIÓN: Comillas escapadas */}
                           <DialogDescription>
                               ¿Estás seguro de que quieres eliminar permanentemente a &ldquo;{confirmingDeleteClient?.name}&rdquo;? Esta acción no se puede deshacer.
                           </DialogDescription>
                       </DialogHeader>
                       <DialogFooter className="flex justify-end gap-3 mt-4">
                           <Button variant="outline" onClick={() => setConfirmingDeleteClient(null)} disabled={isSubmitting}> Cancelar </Button>
                           <Button onClick={handleConfirmDeleteClient} variant="destructive" disabled={isSubmitting}>
                               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                               Sí, Eliminar Cliente
                           </Button>
                       </DialogFooter>
                  </DialogContent>
             </Dialog>

              {/* Confirm Delete Template Modal */}
              <Dialog open={!!confirmingDeleteTemplate} onOpenChange={(open: boolean) => !open && setConfirmingDeleteTemplate(null)}>
                  <DialogContent className="max-w-md">
                       <DialogHeader>
                            <DialogTitle className="flex items-center text-red-600">
                                <AlertTriangle className="mr-2" size={22}/> Confirmar Eliminación
                            </DialogTitle>
                            {/* CORRECCIÓN: Comillas escapadas */}
                            <DialogDescription>
                                ¿Estás seguro de que quieres eliminar permanentemente la plantilla &ldquo;{confirmingDeleteTemplate?.title}&rdquo;? Esta acción no se puede deshacer.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={() => setConfirmingDeleteTemplate(null)} disabled={isSubmitting}> Cancelar </Button>
                            <Button onClick={handleConfirmDeleteTemplate} variant="destructive" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Sí, Eliminar Plantilla
                            </Button>
                        </DialogFooter>
                   </DialogContent>
              </Dialog>

            {/* Create Template Modal */}
             <Dialog open={showCreateTemplateModal} onOpenChange={setShowCreateTemplateModal}>
                 <DialogContent className="max-w-2xl"> {/* Wider for content */}
                     <DialogHeader> <DialogTitle>Crear Nueva Plantilla</DialogTitle> </DialogHeader>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Scrollable content */}
                         {/* Left Column: Meta Data */}
                         <div className="space-y-4">
                             <div>
                                 <Label htmlFor="new-title">Título de la Plantilla<span className="text-red-500 ml-1">*</span></Label>
                                 <Input id="new-title" name="title" value={newTemplate.title} onChange={handleTemplateFormChange} required placeholder="Ej: Acuerdo de Split Simple" disabled={isSubmitting}/>
                             </div>
                             <div>
                                 <Label htmlFor="new-category">Categoría<span className="text-red-500 ml-1">*</span></Label>
                                 <Input id="new-category" name="category" value={newTemplate.category} onChange={handleTemplateFormChange} required placeholder="Ej: Music Splits, Licencia" disabled={isSubmitting}/>
                             </div>
                             <div>
                                 <Label htmlFor="new-description">Descripción (Opcional)</Label>
                                 <Textarea id="new-description" name="description" value={newTemplate.description} onChange={handleTemplateFormChange} rows={3} placeholder="Breve descripción del propósito de la plantilla" disabled={isSubmitting}/>
                             </div>
                         </div>
                         {/* Right Column: Content */}
                         <div>
                             <Label htmlFor="new-content">Contenido (HTML o Texto)<span className="text-red-500 ml-1">*</span></Label>
                             <Textarea
                                 id="new-content" name="content"
                                 value={newTemplate.content} onChange={handleTemplateFormChange}
                                 className="w-full font-mono text-xs mt-1" // Monospace for better HTML/code view
                                 rows={12} // Adjust rows as needed
                                 placeholder="Pega aquí el contenido HTML o escribe texto plano. Usa placeholders como [FullName], [ArtistName], [Fecha], [Firmas]..."
                                 required
                                 disabled={isSubmitting}
                             />
                             <p className="text-xs text-gray-500 mt-1">El texto plano se convertirá automáticamente a párrafos HTML. Puedes usar HTML directamente.</p>
                         </div>
                     </div>
                     <DialogFooter>
                         <Button variant="outline" onClick={() => setShowCreateTemplateModal(false)} disabled={isSubmitting}> Cancelar </Button>
                         <Button onClick={handleCreateTemplate} disabled={isSubmitting}>
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                             Crear Plantilla
                         </Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>

             {/* Edit Template Modal */}
             <Dialog open={showEditTemplateModal} onOpenChange={(open: boolean) => { if (!open) setTemplateToEdit(null); setShowEditTemplateModal(open); }}>
                 <DialogContent className="max-w-2xl"> {/* Wider modal */}
                     <DialogHeader>
                          <DialogTitle>Editar Plantilla</DialogTitle>
                          {/* CORRECCIÓN: Comillas escapadas */}
                          <DialogDescription>Modificando: &ldquo;{templateToEdit?.title}&rdquo;</DialogDescription>
                      </DialogHeader>
                      {/* Check if templateToEdit exists before rendering form */}
                      {templateToEdit ? (
                         <>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                                 {/* Left Column: Meta Data */}
                                 <div className="space-y-4">
                                     <div>
                                         <Label htmlFor="edit-tpl-title">Título<span className="text-red-500 ml-1">*</span></Label>
                                         <Input id="edit-tpl-title" name="title" value={templateToEdit.title || ""} onChange={handleTemplateFormChange} required disabled={isSubmitting}/>
                                     </div>
                                     <div>
                                         <Label htmlFor="edit-tpl-category">Categoría<span className="text-red-500 ml-1">*</span></Label>
                                         <Input id="edit-tpl-category" name="category" value={templateToEdit.category || ""} onChange={handleTemplateFormChange} required disabled={isSubmitting}/>
                                     </div>
                                     <div>
                                         <Label htmlFor="edit-tpl-description">Descripción</Label>
                                         <Textarea id="edit-tpl-description" name="description" value={templateToEdit.description || ""} onChange={handleTemplateFormChange} rows={3} disabled={isSubmitting}/>
                                     </div>
                                 </div>
                                 {/* Right Column: Content */}
                                 <div>
                                     <Label htmlFor="edit-tpl-content">Contenido (HTML o Texto)<span className="text-red-500 ml-1">*</span></Label>
                                     <Textarea
                                         id="edit-tpl-content" name="content"
                                         value={templateToEdit.content || ""} onChange={handleTemplateFormChange}
                                         className="w-full font-mono text-xs mt-1" rows={12}
                                         required
                                         disabled={isSubmitting}
                                     />
                                     <p className="text-xs text-gray-500 mt-1">Puedes editar el HTML o texto plano.</p>
                                 </div>
                             </div>
                             <DialogFooter className="flex flex-col sm:flex-row justify-between items-center mt-4">
                                 {/* Delete Button (Left Aligned) */}
                                 <Button variant="destructive" size="sm" onClick={() => requestDeleteTemplate(templateToEdit)} disabled={isSubmitting}>
                                     <Trash2 size={14} className="mr-1"/> Eliminar Esta Plantilla
                                 </Button>
                                 {/* Action Buttons (Right Aligned) */}
                                 <div className="flex gap-2 mt-2 sm:mt-0">
                                     <Button variant="outline" onClick={() => { setShowEditTemplateModal(false); setTemplateToEdit(null); }} disabled={isSubmitting}> Cancelar </Button>
                                     <Button onClick={handleUpdateTemplate} disabled={isSubmitting}>
                                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                         Guardar Cambios
                                     </Button>
                                 </div>
                             </DialogFooter>
                          </>
                       ) : (
                           // Show loading or error if templateToEdit is null unexpectedly
                           <p className="text-center text-gray-500 py-4">Cargando datos de la plantilla...</p>
                       )}
                 </DialogContent>
             </Dialog>

            {/* AI Template Modal */}
             <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
                 <DialogContent className="max-w-lg">
                      <DialogHeader>
                           <DialogTitle className="flex items-center">
                               <Sparkles size={18} className="mr-2 text-yellow-500"/> Generar Plantilla con IA
                           </DialogTitle>
                           <DialogDescription>
                                Describe el tipo de contrato o acuerdo que necesitas. La IA generará una estructura básica como punto de partida.
                                <strong className="block mt-1">¡Recuerda revisar y adaptar el contenido generado!</strong>
                           </DialogDescription>
                       </DialogHeader>
                       <div className="py-4">
                           <Label htmlFor="aiPrompt">Describe tu necesidad<span className="text-red-500 ml-1">*</span></Label>
                           <Textarea
                               id="aiPrompt" name="aiPrompt"
                               value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                               className="w-full mt-1" rows={5}
                               placeholder="Ej: Acuerdo de reparto de royalties (split sheet) 50/50 entre productor y artista para la canción X..."
                               required aria-required="true"
                               disabled={isGeneratingTemplate}
                           />
                       </div>
                       <DialogFooter>
                           <Button variant="outline" onClick={() => setShowAiModal(false)} disabled={isGeneratingTemplate}> Cancelar </Button>
                           <Button onClick={generateAITemplate} disabled={isGeneratingTemplate || !aiPrompt.trim()}>
                               {isGeneratingTemplate ? (
                                   <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generando...</>
                               ) : (
                                    "Generar Plantilla"
                                )}
                           </Button>
                       </DialogFooter>
                  </DialogContent>
             </Dialog>

        </div> // End Root Div
    );
};

export default ContractLibrary;