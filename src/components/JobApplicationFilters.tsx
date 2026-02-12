import { useState } from 'react';
import { ApplicationStatus, Priority } from '@/types/jobApplication';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, Download } from 'lucide-react';

interface FiltersState {
  search: string;
  status: ApplicationStatus | 'all';
  priority: Priority | 'all';
  company: string;
}

interface JobApplicationFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onExport: () => void;
  companies: string[];
}

export function JobApplicationFilters({ filters, onFiltersChange, onExport, companies }: JobApplicationFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof FiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      priority: 'all',
      company: '',
    });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.priority !== 'all' || filters.company;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por empresa, rol o recruiter..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-9 pr-4"
        />
      </div>

      {/* Filter Toggle & Export */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            size="sm"
            className="flex items-center gap-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="applied">📤 Postulada</SelectItem>
                    <SelectItem value="in-progress">⏳ En Proceso</SelectItem>
                    <SelectItem value="interview">💼 Entrevista</SelectItem>
                    <SelectItem value="offer">🎉 Oferta</SelectItem>
                    <SelectItem value="rejected">❌ Rechazada</SelectItem>
                    <SelectItem value="no-response">⏸️ Sin Respuesta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridad</label>
                <Select 
                  value={filters.priority} 
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="low">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa</label>
                <Select 
                  value={filters.company || 'all'} 
                  onValueChange={(value) => handleFilterChange('company', value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las empresas</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}