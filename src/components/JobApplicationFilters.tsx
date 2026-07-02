import { useState } from 'react';
import { ApplicationStatus, Priority } from '@/types/jobApplication';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, Download } from 'lucide-react';

export type DateField = 'created' | 'statusChanged';

interface FiltersState {
  search: string;
  status: ApplicationStatus | 'all';
  priority: Priority | 'all';
  company: string;
  dateField: DateField;
  dateFrom: string;
  dateTo: string;
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
    onFiltersChange({ search: '', status: 'all', priority: 'all', company: '', dateField: 'created', dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.company ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by company, role or recruiter..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="pl-9 pr-4"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
        </Button>
        <Button variant="outline" onClick={onExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="sm" className="flex items-center gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="bg-gradient-card">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="applied">📤 Applied</SelectItem>
                    <SelectItem value="in-progress">⏳ In Progress</SelectItem>
                    <SelectItem value="interview">💼 Interview</SelectItem>
                    <SelectItem value="offer">🎉 Offer</SelectItem>
                    <SelectItem value="rejected">❌ Rejected</SelectItem>
                    <SelectItem value="no-response">⏸️ No Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={filters.priority} onValueChange={(value) => handleFilterChange('priority', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Select value={filters.company || 'all'} onValueChange={(value) => handleFilterChange('company', value === 'all' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Filter by company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company} value={company}>{company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by date</label>
                <Select value={filters.dateField} onValueChange={(value) => handleFilterChange('dateField', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Creation date</SelectItem>
                    <SelectItem value="statusChanged">Status change date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
