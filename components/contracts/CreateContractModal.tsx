import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, FormEvent, ChangeEvent } from "react";
import { toast } from "sonner";
import type { GeneralContractData, ParticipantFinal } from "@/lib/types";

interface CreateContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: GeneralContractData) => Promise<void>;
    initialData?: Partial<GeneralContractData>;
}

type ContractCreationStep = 
    | "select_template"
    | "general_data"
    | "select_participants"
    | "generate_pdf"
    | "ready_for_signatures";

interface ContractCreationState {
    currentStep: ContractCreationStep;
    contractId?: string;
    generalData?: GeneralContractData;
    participants?: ParticipantFinal[];
    pdfUrl?: string;
}

export function CreateContractModal({
    isOpen,
    onClose,
    onSubmit,
    initialData = {}
}: CreateContractModalProps) {
    const [formData, setFormData] = useState<GeneralContractData>({
        template_id: initialData.template_id || "",
        jurisdiction: initialData.jurisdiction || "",
        fecha: initialData.fecha || new Date().toISOString().split('T')[0],
        trackTitle: initialData.trackTitle || "",
        lugarDeFirma: initialData.lugarDeFirma || "",
        areaArtistica: initialData.areaArtistica || "",
        duracionContrato: initialData.duracionContrato || "",
        periodoAviso: initialData.periodoAviso || "",
        porcentajeComision: initialData.porcentajeComision || ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            await onSubmit(formData);
            toast.success("Datos guardados correctamente");
            onClose();
        } catch (error) {
            console.error("Error al guardar datos:", error);
            toast.error("Error al guardar los datos", {
                description: error instanceof Error ? error.message : "Ocurrió un error inesperado"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Contrato</DialogTitle>
                    <DialogDescription>
                        Ingresa los datos generales del contrato. Podrás seleccionar participantes en el siguiente paso.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="template_id" className="text-right">
                                Template ID
                            </Label>
                            <Input
                                id="template_id"
                                value={formData.template_id}
                                onChange={handleInputChange}
                                className="col-span-3"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jurisdiction" className="text-right">
                                Jurisdicción
                            </Label>
                            <Input
                                id="jurisdiction"
                                value={formData.jurisdiction}
                                onChange={handleInputChange}
                                className="col-span-3"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fecha" className="text-right">
                                Fecha
                            </Label>
                            <Input
                                id="fecha"
                                type="date"
                                value={formData.fecha}
                                onChange={handleInputChange}
                                className="col-span-3"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="trackTitle" className="text-right">
                                Título de la Obra
                            </Label>
                            <Input
                                id="trackTitle"
                                value={formData.trackTitle}
                                onChange={handleInputChange}
                                className="col-span-3"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lugarDeFirma" className="text-right">
                                Lugar de Firma
                            </Label>
                            <Input
                                id="lugarDeFirma"
                                value={formData.lugarDeFirma}
                                onChange={handleInputChange}
                                className="col-span-3"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="areaArtistica" className="text-right">
                                Área Artística
                            </Label>
                            <Input
                                id="areaArtistica"
                                value={formData.areaArtistica}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="duracionContrato" className="text-right">
                                Duración
                            </Label>
                            <Input
                                id="duracionContrato"
                                value={formData.duracionContrato}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="periodoAviso" className="text-right">
                                Periodo de Aviso
                            </Label>
                            <Input
                                id="periodoAviso"
                                value={formData.periodoAviso}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="porcentajeComision" className="text-right">
                                % Comisión
                            </Label>
                            <Input
                                id="porcentajeComision"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.porcentajeComision}
                                onChange={handleInputChange}
                                className="col-span-3"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 