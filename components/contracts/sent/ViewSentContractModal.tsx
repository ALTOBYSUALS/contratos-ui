// components/contracts/sent/ViewSentContractModal.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download } from 'lucide-react';
import type { SentContract } from '@/lib/types'; // Importa el tipo necesario

interface ViewSentContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: SentContract | null;
    onDownloadPdf: (content: string, title: string) => Promise<void>;
    onDownloadWord: (content: string, title: string) => Promise<void>;
    isSubmitting: boolean;
}

const ViewSentContractModal: React.FC<ViewSentContractModalProps> = ({
    isOpen,
    onClose,
    contract,
    onDownloadPdf,
    onDownloadWord,
    isSubmitting,
}) => {
    // No necesita estado propio para este caso simple

    const handlePdfDownload = () => {
        if (contract?.content && contract?.title) {
            onDownloadPdf(contract.content, contract.title);
        }
    };

    const handleWordDownload = () => {
        if (contract?.content && contract?.title) {
            onDownloadWord(contract.content, contract.title);
        }
    };

    // Si no hay contrato o no está abierto, no renderiza nada (o puedes manejarlo en el Dialog)
    if (!contract) {
         return null; // O un Dialog vacío si onOpenChange lo maneja
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Detalles del Contrato Enviado</DialogTitle>
                    <DialogDescription>"{contract.title}"</DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    <div className="flex justify-between text-sm text-gray-600 border-b pb-2 mb-3">
                        <span>Enviado: {new Date(contract.date).toLocaleString()}</span>
                        <span>Estado: <span className={`font-medium ${contract.status === 'Signed' ? 'text-green-600' : 'text-blue-600'}`}>{contract.status || 'Enviado'}</span></span>
                    </div>

                    <div>
                        <p className="font-medium mb-2 text-gray-700">Participantes:</p>
                        <ul className="list-none space-y-1 text-sm">
                            {contract.participants.map((p, idx) => (
                                <li key={idx} className="flex justify-between items-center border-b border-gray-100 py-1">
                                    <span>{p.name} ({p.role}) - {p.email}</span>
                                    <span className="font-medium">{p.percentage?.toFixed(2) ?? 0}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <hr />
                    <div>
                        <p className="font-medium mb-2 text-gray-700">Contenido Enviado:</p>
                        <ScrollArea className="max-h-[40vh] w-full border rounded-md bg-gray-50">
                            <div
                                className="prose prose-sm max-w-none p-4"
                                dangerouslySetInnerHTML={{ __html: contract.content || "<p class='italic text-gray-400'>Contenido no disponible.</p>" }}
                            />
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter className="mt-6 gap-2 flex-wrap justify-end">
                     {/* Llama a las funciones pasadas por props */}
                    <Button variant="secondary" onClick={handlePdfDownload} disabled={isSubmitting || !contract.content}> <Download size={16} className="mr-1"/> PDF </Button>
                    <Button variant="secondary" onClick={handleWordDownload} disabled={isSubmitting || !contract.content}> <Download size={16} className="mr-1"/> Word </Button>
                    <Button variant="outline" onClick={onClose}> Cerrar </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ViewSentContractModal;