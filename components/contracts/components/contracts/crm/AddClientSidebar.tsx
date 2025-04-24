// components/contracts/crm/AddClientSidebar.tsx
import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Shadcn/UI Imports Correctos ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importa Select completo
// import { Textarea } from "@/components/ui/textarea"; // Descomenta si usas Textarea aquí

// --- Otros Imports ---
import { X, Save, Loader2 } from 'lucide-react';
import type { Client } from '@/lib/types'; // Esta ruta parece correcta

// ... el resto del código del componente (INITIAL_NEW_CLIENT_STATE, interface, etc.) ...

// Asegúrate de que el resto del código que te pasé para este componente esté presente
// incluyendo la definición del componente:
// const AddClientSidebar: React.FC<AddClientSidebarProps> = ({ ... }) => { ... };
// y el export default:
// export default AddClientSidebar;

// Estado inicial para el formulario dentro de este componente
const INITIAL_NEW_CLIENT_STATE: Partial<Omit<Client, "id" | "added" | "FullName" | "Firma">> = {
    firstName: "", lastName: "", email: "", phone: "", role: "", publisherIpi: "", dateOfBirth: "", passport: "", expirationDate: "", address: "", country: "", facebook: "", instagram: "", linkedin: "", twitter: "", labelName: "", labelEmail: "", labelPhone: "", labelAddress: "", labelCountry: "", publisherName: "", publisherEmail: "", publisherPhone: "", publisherAddress: "", publisherCountry: ""
};

// Define las props que este componente necesita recibir del padre
interface AddClientSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (clientData: Partial<Client>) => Promise<void>; // Función para guardar que viene del padre
    isSubmitting: boolean; // Estado de carga que viene del padre
}

const AddClientSidebar: React.FC<AddClientSidebarProps> = ({
    isOpen,
    onClose,
    onSave,
    isSubmitting
}) => {
    const [newClient, setNewClient] = useState(INITIAL_NEW_CLIENT_STATE);
    const sidebarRef = useRef<HTMLDivElement>(null); // Ref para el div principal si necesitas lógica de click outside aquí

    // Resetea el formulario cuando se abre el sidebar
    useEffect(() => {
        if (isOpen) {
            setNewClient(INITIAL_NEW_CLIENT_STATE);
        }
    }, [isOpen]);

    // Manejador de cambios local para los inputs del formulario
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewClient((prev) => ({ ...prev, [name]: value }));
    };

    // Manejador para el Select de Shadcn/ui (si lo usas)
     const handleRoleChange = (value: string) => {
         setNewClient((prev) => ({ ...prev, role: value }));
     };

    // Llama a la función onSave pasada por props con los datos del estado local
    const handleSaveClick = async () => {
        await onSave(newClient);
        // onClose() se llamará desde el padre (ContractLibrary) si el guardado es exitoso
    };

    // Opcional: Lógica para cerrar al hacer click fuera (si se quiere mantener aquí)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (isOpen && sidebarRef.current && !sidebarRef.current.contains(target)) {
                 // Evita cerrar si se hace click en el botón que lo abre (si ese botón existe fuera)
                 // const openButton = document.querySelector('button[aria-label="Añadir Cliente"]');
                 // if (!openButton || !openButton.contains(target)) {
                      onClose(); // Llama a la función onClose pasada por props
                 // }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]); // Depende de isOpen y onClose

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={sidebarRef} // Asigna el ref
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
                        {/* Llama a onClose al hacer click en X */}
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel de añadir cliente"> <X size={20} /> </Button>
                    </div>

                    {/* Form Area */}
                    <ScrollArea className="flex-1">
                        {/* Mueve aquí TODO el JSX de los Tabs y sus contenidos */}
                        <Tabs defaultValue="personal" className="p-4 md:p-6">
                            <TabsList className="mb-4 grid w-full grid-cols-3 lg:grid-cols-5 text-xs sm:text-sm">
                                <TabsTrigger value="personal">Personal</TabsTrigger>
                                <TabsTrigger value="contact">Contacto</TabsTrigger>
                                <TabsTrigger value="social">Social</TabsTrigger>
                                <TabsTrigger value="label">Sello</TabsTrigger>
                                <TabsTrigger value="publisher">Editorial</TabsTrigger>
                            </TabsList>

                            {/* Tab Content - USA el estado LOCAL 'newClient' y el handler LOCAL 'handleChange'/'handleRoleChange' */}
                            <TabsContent value="personal" className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="add-firstName">Nombre<span className="text-red-500 ml-1">*</span></Label>
                                        <Input id="add-firstName" name="firstName" value={newClient.firstName || ""} onChange={handleChange} required disabled={isSubmitting} />
                                    </div>
                                    <div>
                                        <Label htmlFor="add-lastName">Apellido<span className="text-red-500 ml-1">*</span></Label>
                                        <Input id="add-lastName" name="lastName" value={newClient.lastName || ""} onChange={handleChange} required disabled={isSubmitting} />
                                    </div>
                                </div>
                                <div>
                                      <Label htmlFor="add-role">Rol Principal</Label>
                                       {/* Ejemplo usando Select de Shadcn (si lo tienes) */}
                                       <Select name="role" value={newClient.role || ""} onValueChange={handleRoleChange} disabled={isSubmitting}>
                                           <SelectTrigger id="add-role">
                                               <SelectValue placeholder="Seleccionar Rol..." />
                                           </SelectTrigger>
                                           <SelectContent>
                                               <SelectItem value="Artist">Artista</SelectItem>
                                               <SelectItem value="Producer">Productor</SelectItem>
                                               <SelectItem value="Songwriter">Compositor</SelectItem>
                                               <SelectItem value="Manager">Manager</SelectItem>
                                               <SelectItem value="Label">Sello</SelectItem>
                                               <SelectItem value="Publisher">Editorial</SelectItem>
                                               <SelectItem value="Other">Otro</SelectItem>
                                           </SelectContent>
                                       </Select>
                                      {/* O si usabas <select> HTML normal: */}
                                      {/* <select id="add-role" name="role" value={newClient.role || ""} onChange={handleChange} className="..." disabled={isSubmitting}>...</select> */}
                                 </div>
                                 <div>
                                      <Label htmlFor="add-passport">DNI / Pasaporte</Label>
                                      <Input id="add-passport" name="passport" value={newClient.passport || ""} onChange={handleChange} placeholder="Número" disabled={isSubmitting}/>
                                 </div>
                                 {/* Añade otros campos de 'Personal' si los tenías */}
                            </TabsContent>

                            <TabsContent value="contact" className="mt-4 space-y-4">
                                <div>
                                     <Label htmlFor="add-email">Email<span className="text-red-500 ml-1">*</span></Label>
                                     <Input id="add-email" name="email" type="email" value={newClient.email || ""} onChange={handleChange} required disabled={isSubmitting}/>
                                </div>
                                <div>
                                     <Label htmlFor="add-phone">Teléfono</Label>
                                     <Input id="add-phone" name="phone" type="tel" value={newClient.phone || ""} onChange={handleChange} placeholder="+34 600..." disabled={isSubmitting}/>
                                </div>
                                <div>
                                     <Label htmlFor="add-address">Dirección</Label>
                                     <Input id="add-address" name="address" value={newClient.address || ""} onChange={handleChange} disabled={isSubmitting}/>
                                </div>
                                <div>
                                     <Label htmlFor="add-country">País</Label>
                                     <Input id="add-country" name="country" value={newClient.country || ""} onChange={handleChange} disabled={isSubmitting}/>
                                </div>
                            </TabsContent>

                            <TabsContent value="social" className="mt-4 space-y-4">
                                <div> <Label htmlFor="add-instagram">Instagram</Label> <Input id="add-instagram" name="instagram" value={newClient.instagram || ""} onChange={handleChange} placeholder="@usuario" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-facebook">Facebook</Label> <Input id="add-facebook" name="facebook" value={newClient.facebook || ""} onChange={handleChange} placeholder="URL perfil" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-twitter">Twitter / X</Label> <Input id="add-twitter" name="twitter" value={newClient.twitter || ""} onChange={handleChange} placeholder="@usuario" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-linkedin">LinkedIn</Label> <Input id="add-linkedin" name="linkedin" value={newClient.linkedin || ""} onChange={handleChange} placeholder="URL perfil" disabled={isSubmitting}/> </div>
                            </TabsContent>

                             <TabsContent value="label" className="mt-4 space-y-4">
                                <div> <Label htmlFor="add-labelName">Nombre del Sello</Label> <Input id="add-labelName" name="labelName" value={newClient.labelName || ""} onChange={handleChange} disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-labelEmail">Email del Sello</Label> <Input id="add-labelEmail" name="labelEmail" type="email" value={newClient.labelEmail || ""} onChange={handleChange} disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-labelPhone">Teléfono Sello</Label> <Input id="add-labelPhone" name="labelPhone" type="tel" value={newClient.labelPhone || ""} onChange={handleChange} disabled={isSubmitting}/> </div>
                                {/* Añade Address, Country si los tenías */}
                            </TabsContent>

                             <TabsContent value="publisher" className="mt-4 space-y-4">
                                <div> <Label htmlFor="add-publisherName">Nombre Editorial</Label> <Input id="add-publisherName" name="publisherName" value={newClient.publisherName || ""} onChange={handleChange} disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-publisherIpi">IPI / CAE</Label> <Input id="add-publisherIpi" name="publisherIpi" value={newClient.publisherIpi || ""} onChange={handleChange} placeholder="Número IPI/CAE" disabled={isSubmitting}/> </div>
                                <div> <Label htmlFor="add-publisherEmail">Email Editorial</Label> <Input id="add-publisherEmail" name="publisherEmail" type="email" value={newClient.publisherEmail || ""} onChange={handleChange} disabled={isSubmitting}/> </div>
                                {/* Añade Phone, Address, Country si los tenías */}
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>

                    {/* Footer Actions */}
                    <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 flex-shrink-0">
                        {/* Llama a onClose al cancelar */}
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}> Cancelar </Button>
                        {/* Llama a handleSaveClick (que llama a onSave prop) al guardar */}
                        <Button onClick={handleSaveClick} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : <><Save size={16} className="mr-2" /> Guardar Cliente</>}
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddClientSidebar;