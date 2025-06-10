import React from 'react';
import { Search, Calendar, Filter, SortAsc, SortDesc, Users, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface FilterState {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  signersCount: string;
}

interface ContractFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  contractsCount: number;
  filteredCount: number;
}

const ContractFilters: React.FC<ContractFiltersProps> = ({
  filters,
  onFiltersChange,
  contractsCount,
  filteredCount,
}) => {
  const updateFilter = (key: keyof FilterState, value: string | 'asc' | 'desc') => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
      signersCount: '',
    });
  };

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.signersCount
  );

  const getStatusOptions = () => [
    { value: '', label: 'Todos los estados' },
    { value: 'Pending', label: '🟡 Pendiente' },
    { value: 'Signed', label: '🟢 Firmado' },
    { value: 'Draft', label: '📝 Borrador' },
    { value: 'Cancelled', label: '🔴 Cancelado' },
  ];

  const getSortOptions = () => [
    { value: 'date', label: 'Fecha de envío' },
    { value: 'title', label: 'Título del contrato' },
    { value: 'status', label: 'Estado' },
    { value: 'signers', label: 'Número de firmantes' },
  ];

  const getSignersCountOptions = () => [
    { value: '', label: 'Cualquier cantidad' },
    { value: '1', label: '1 firmante' },
    { value: '2', label: '2 firmantes' },
    { value: '3-5', label: '3-5 firmantes' },
    { value: '5+', label: '5+ firmantes' },
  ];

  return (
    <Card className="p-4 mb-6 bg-white shadow-sm border border-gray-200">
      <div className="space-y-4">
        
        {/* Header con estadísticas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">Filtros de Contratos</h3>
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {filteredCount} de {contractsCount} contratos
              </Badge>
            )}
          </div>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Filtros principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Búsqueda por título */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Buscar por título</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar contratos..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por número de firmantes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Firmantes</label>
            <Select value={filters.signersCount} onValueChange={(value) => updateFilter('signersCount', value)}>
              <SelectTrigger>
                <Users className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Cantidad..." />
              </SelectTrigger>
              <SelectContent>
                {getSignersCountOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ordenamiento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ordenar por</label>
            <div className="flex gap-2">
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Campo..." />
                </SelectTrigger>
                <SelectContent>
                  {getSortOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {filters.sortOrder === 'asc' ? (
                  <SortAsc className="w-4 h-4" />
                ) : (
                  <SortDesc className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha desde
            </label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha hasta
            </label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600 mr-2">Filtros activos:</span>
            
            {filters.search && (
              <Badge variant="outline" className="bg-blue-50">
                Búsqueda: "{filters.search}"
              </Badge>
            )}
            
            {filters.status && (
              <Badge variant="outline" className="bg-green-50">
                Estado: {getStatusOptions().find(opt => opt.value === filters.status)?.label}
              </Badge>
            )}
            
            {filters.signersCount && (
              <Badge variant="outline" className="bg-purple-50">
                Firmantes: {getSignersCountOptions().find(opt => opt.value === filters.signersCount)?.label}
              </Badge>
            )}
            
            {(filters.dateFrom || filters.dateTo) && (
              <Badge variant="outline" className="bg-yellow-50">
                Fecha: {filters.dateFrom || '...'} - {filters.dateTo || '...'}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContractFilters; 