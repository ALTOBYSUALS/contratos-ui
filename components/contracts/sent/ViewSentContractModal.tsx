// components/contracts/sent/ViewSentContractModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, CheckCircle, Clock, XCircle, Users, FileText, Calendar, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import type { SentContract } from '@/lib/types'; // Importa el tipo necesario

interface SignerWithStatus {
    id: string;
    name: string;
    email: string;
    signedAt: string | null;
    status: 'firmado' | 'pendiente';
}

interface ContractDetails {
    contract: {
        id: string;
        title: string;
        pdfUrl_draft: string | null;
        pdfUrl_signed: string | null;
        status: string;
    };
    signers: SignerWithStatus[];
    generalData?: any;
}

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
    const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Función para obtener detalles completos del contrato
    const fetchContractDetails = async (contractId: string) => {
        setIsLoadingDetails(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/contracts/${contractId}/details`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Transformar los datos para el estado
            const transformedSigners: SignerWithStatus[] = data.signers.map((signer: any) => ({
                id: signer.id,
                name: signer.name,
                email: signer.email,
                signedAt: signer.signedAt,
                status: signer.signedAt ? 'firmado' : 'pendiente'
            }));
            
            setContractDetails({
                contract: data.contract,
                signers: transformedSigners,
                generalData: data.generalData
            });
            
        } catch (err) {
            console.error('Error fetching contract details:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            toast.error("Error al cargar detalles", { 
                description: "No se pudieron cargar los detalles del contrato" 
            });
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Cargar detalles cuando se abre el modal
    useEffect(() => {
        if (isOpen && contract?.notionPageId) {
            fetchContractDetails(contract.notionPageId);
        } else if (!isOpen) {
            // Limpiar datos al cerrar
            setContractDetails(null);
            setError(null);
        }
    }, [isOpen, contract?.notionPageId]);

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

    // Función para obtener el badge del estado de firma
    const getSignerStatusBadge = (status: 'firmado' | 'pendiente') => {
        if (status === 'firmado') {
            return (
                <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Firmado
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendiente
                </Badge>
            );
        }
    };

    // Función para obtener el badge del estado del contrato
    const getContractStatusBadge = (status?: string) => {
        const statusLower = status?.toLowerCase() || '';
        
        if (statusLower.includes('firmado') || statusLower === 'signed') {
            return (
                <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Firmado Completamente
                </Badge>
            );
        } else if (statusLower.includes('pendiente') || statusLower === 'pending') {
            return (
                <Badge className="bg-blue-100 text-blue-800">
                    <Clock className="w-4 h-4 mr-1" />
                    Pendiente de Firmas
                </Badge>
            );
        } else if (statusLower.includes('enviadoparafirma')) {
            return (
                <Badge className="bg-purple-100 text-purple-800">
                    <Users className="w-4 h-4 mr-1" />
                    Enviado para Firma
                </Badge>
            );
        } else {
            return (
                <Badge className="bg-gray-100 text-gray-800">
                    <FileText className="w-4 h-4 mr-1" />
                    {status || 'Estado Desconocido'}
                </Badge>
            );
        }
    };

    // Calcular estadísticas de firmantes
    const signerStats = contractDetails?.signers ? {
        total: contractDetails.signers.length,
        firmados: contractDetails.signers.filter(s => s.status === 'firmado').length,
        pendientes: contractDetails.signers.filter(s => s.status === 'pendiente').length
    } : null;

    if (!contract) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Detalles del Contrato
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between">
                        <span>"{contract.title}"</span>
                        {contractDetails && getContractStatusBadge(contractDetails.contract.status)}
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6">
                        
                        {/* Información General */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-4 h-4 text-gray-600" />
                                <h3 className="font-semibold text-gray-800">Información General</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Fecha de Envío:</span>
                                    <p className="font-medium">{new Date(contract.date).toLocaleString('es-ES')}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">ID del Contrato:</span>
                                    <p className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                        {contract.notionPageId?.slice(-8) || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Estado de Firmantes */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-600" />
                                    <h3 className="font-semibold text-gray-800">Estado de Firmantes</h3>
                                </div>
                                {signerStats && (
                                    <div className="text-sm text-gray-600">
                                        {signerStats.firmados}/{signerStats.total} firmados
                                    </div>
                                )}
                            </div>

                            {isLoadingDetails ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    <span>Cargando estado de firmantes...</span>
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center py-8 text-red-600">
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Error: {error}
                                </div>
                            ) : contractDetails?.signers.length ? (
                                <div className="space-y-3">
                                    {contractDetails.signers.map((signer, idx) => (
                                        <div key={signer.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{signer.name}</p>
                                                        <p className="text-sm text-gray-600">{signer.email}</p>
                                                    </div>
                                                    {getSignerStatusBadge(signer.status)}
                                                </div>
                                                {signer.signedAt && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Firmado: {new Date(signer.signedAt).toLocaleString('es-ES')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p>No se encontraron firmantes para este contrato</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Resumen de Progreso */}
                        {signerStats && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-3">Progreso de Firmas</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                                style={{ width: `${(signerStats.firmados / signerStats.total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-blue-700 font-medium">
                                        {Math.round((signerStats.firmados / signerStats.total) * 100)}%
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2 text-sm text-blue-700">
                                    <span>✅ {signerStats.firmados} Firmados</span>
                                    <span>⏳ {signerStats.pendientes} Pendientes</span>
                                </div>
                            </div>
                        )}

                        {/* Datos Generales (si existen) */}
                        {contractDetails?.generalData && (
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Datos del Contrato</h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {JSON.stringify(contractDetails.generalData, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Enlaces de PDF */}
                        {contractDetails && (
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Documentos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {contractDetails.contract.pdfUrl_draft && (
                                        <div className="p-3 border rounded-lg">
                                            <p className="font-medium text-sm text-gray-700">PDF Borrador</p>
                                            <a 
                                                href={contractDetails.contract.pdfUrl_draft} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                Ver documento original
                                            </a>
                                        </div>
                                    )}
                                    {contractDetails.contract.pdfUrl_signed && (
                                        <div className="p-3 border rounded-lg">
                                            <p className="font-medium text-sm text-gray-700">PDF Firmado</p>
                                            <a 
                                                href={contractDetails.contract.pdfUrl_signed} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:underline text-sm"
                                            >
                                                Ver documento firmado
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 flex-wrap justify-between">
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={handlePdfDownload} 
                            disabled={isSubmitting || !contract.content}
                        > 
                            <Download size={16} className="mr-1"/> 
                            PDF 
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={handleWordDownload} 
                            disabled={isSubmitting || !contract.content}
                        > 
                            <Download size={16} className="mr-1"/> 
                            Word 
                        </Button>
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ViewSentContractModal;