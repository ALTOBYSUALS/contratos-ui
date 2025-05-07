import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Download, FileText, RefreshCw } from 'lucide-react';
import { SentContract } from '@/lib/types';
import ViewSentContractModal from './ViewSentContractModal';
import { generatePdf } from '@/services/pdf-client';

interface SentContractsListProps {
  contracts: SentContract[];
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

const SentContractsList: React.FC<SentContractsListProps> = ({
  contracts,
  onRefresh,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingContract, setViewingContract] = useState<SentContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filtrar contratos basado en el término de búsqueda
  const filteredContracts = contracts.filter(contract => 
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.status && contract.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Estado del contrato a un color para la badge
  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-200 text-gray-700';
    
    switch(status.toLowerCase()) {
      case 'firmado':
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
      case 'enviado':
      case 'enviadoparafirma':
        return 'bg-blue-100 text-blue-800';
      case 'rechazado':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Handler para ver detalles de un contrato
  const handleViewContract = (contract: SentContract) => {
    setViewingContract(contract);
    setIsModalOpen(true);
  };

  // Handler para descargar PDF
  const handleDownloadPdf = async (content: string, title: string) => {
    try {
      setIsDownloading(true);
      // Si content está vacío, se podría implementar una API para descargar el PDF directamente desde Notion
      await generatePdf(content || '<p>No hay contenido disponible para este contrato.</p>', title);
      setIsDownloading(false);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      setIsDownloading(false);
    }
  };

  // Handler para descargar Word (placeholder)
  const handleDownloadWord = async (content: string, title: string) => {
    // Implementación de descarga Word puede ser añadida según necesidades
    console.log(`Descargando Word para ${title}`);
    alert('Funcionalidad de descarga Word no implementada aún.');
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">Contratos Enviados</CardTitle>
          <CardDescription>
            Todos los contratos enviados desde esta plataforma
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh} 
          disabled={isLoading}
        >
          <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Buscar por título o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>No hay contratos enviados aún.</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No se encontraron resultados para "{searchTerm}"</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.title}</TableCell>
                    <TableCell>{formatDate(contract.date)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contract.status)}>
                        {contract.status || 'Desconocido'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewContract(contract)}
                      >
                        <Eye size={16} className="mr-2" />
                        Ver
                      </Button>
                      {contract.status?.toLowerCase() === 'firmado' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* Implementar descarga desde Notion */}}
                        >
                          <Download size={16} className="mr-2" />
                          PDF
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modal para ver detalles del contrato */}
        <ViewSentContractModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          contract={viewingContract}
          onDownloadPdf={handleDownloadPdf}
          onDownloadWord={handleDownloadWord}
          isSubmitting={isDownloading}
        />
      </CardContent>
    </Card>
  );
};

export default SentContractsList; 