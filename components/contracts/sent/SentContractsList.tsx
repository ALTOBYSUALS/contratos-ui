import React, { useState, useMemo } from 'react';
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
import ContractFilters, { FilterState } from './ContractFilters';
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
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
    signersCount: '',
  });
  
  const [viewingContract, setViewingContract] = useState<SentContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Filtrar y ordenar contratos basado en todos los filtros
  const filteredAndSortedContracts = useMemo(() => {
    let filtered = contracts.filter(contract => {
      if (!contract) return false;
      
      // Filtro de búsqueda por título
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = (contract.title || "").toLowerCase().includes(searchLower);
        if (!titleMatch) return false;
      }
      
      // Filtro por estado
      if (filters.status) {
        const contractStatus = (contract.status || "").toLowerCase();
        const filterStatus = filters.status.toLowerCase();
        if (contractStatus !== filterStatus) return false;
      }
      
      // Filtro por rango de fechas
      if (filters.dateFrom || filters.dateTo) {
        const contractDate = new Date(contract.date);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (contractDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999); // Incluir todo el día
          if (contractDate > toDate) return false;
        }
      }
      
      // Filtro por número de firmantes (simulado - en una implementación real consultarías la API)
      if (filters.signersCount) {
        // Para esta demo, asumimos un número aleatorio de firmantes
        // En producción, esto vendría de la API de detalles del contrato
        const simulatedSignersCount = Math.floor(Math.random() * 5) + 1;
        
        switch (filters.signersCount) {
          case '1':
            if (simulatedSignersCount !== 1) return false;
            break;
          case '2':
            if (simulatedSignersCount !== 2) return false;
            break;
          case '3-5':
            if (simulatedSignersCount < 3 || simulatedSignersCount > 5) return false;
            break;
          case '5+':
            if (simulatedSignersCount < 5) return false;
            break;
        }
      }
      
      return true;
    });
    
    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'date':
        default:
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [contracts, filters]);

  // Estado del contrato a un color para la badge
  const getStatusColor = (status: string | undefined | null) => {
    const safeStatus = (status || "").toLowerCase(); 
    
    switch(safeStatus) {
      case 'firmado':
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
      case 'pending':
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

  // Formatear fecha con más detalles
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
      await generatePdf(content || '<p>No hay contenido disponible para este contrato.</p>', title);
      setIsDownloading(false);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      setIsDownloading(false);
    }
  };

  // Handler para descargar Word
  const handleDownloadWord = async (content: string, title: string) => {
    console.log(`Descargando Word para ${title}`);
    alert('Funcionalidad de descarga Word no implementada aún.');
  };

  // Obtener estadísticas para el badge de estado
  const getStatusBadgeText = (status: string | undefined | null) => {
    const safeStatus = (status || "").toLowerCase();
    
    switch(safeStatus) {
      case 'firmado':
      case 'signed':
        return '✅ Firmado';
      case 'pendiente':
      case 'pending':
        return '⏳ Pendiente';
      case 'enviadoparafirma':
        return '📧 Enviado';
      case 'rechazado':
        return '❌ Rechazado';
      default:
        return status || 'Sin estado';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Sistema de filtros avanzado */}
      <ContractFilters
        filters={filters}
        onFiltersChange={setFilters}
        contractsCount={contracts.length}
        filteredCount={filteredAndSortedContracts.length}
      />
      
      {/* Lista de contratos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">Contratos Enviados</CardTitle>
            <CardDescription>
              {filteredAndSortedContracts.length} de {contracts.length} contratos mostrados
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
          {contracts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>No hay contratos enviados aún.</p>
            </div>
          ) : filteredAndSortedContracts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No se encontraron contratos que coincidan con los filtros aplicados.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({
                  search: '',
                  status: '',
                  dateFrom: '',
                  dateTo: '',
                  sortBy: 'date',
                  sortOrder: 'desc',
                  signersCount: '',
                })}
                className="mt-2"
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Fecha de Envío</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedContracts.map((contract, index) => (
                    <TableRow key={contract.id ? `${contract.id}-${contract.date}` : `contract-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{contract.title}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            ID: {contract.notionPageId?.slice(-8) || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(contract.date)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(contract.status)}>
                          {getStatusBadgeText(contract.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Modal de detalles */}
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
    </div>
  );
};

export default SentContractsList; 