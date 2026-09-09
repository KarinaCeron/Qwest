import { useState } from 'react';
import { ApplicationStatus, Priority } from '@/types/jobApplication';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Filter, X, Download, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateField = 'created' | 'statusChanged';

export interface FiltersState {
  search: string;
  status: ApplicationStatus[];
  priority: Priority | 'all';
  company: string;
  dateField: DateField;
  dateFrom: string;
  dateTo: string;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; icon: string }[] = [
  { value: 'submitted', label: 'Submitted', icon: '📤' },
  { value: 'in-progress', label: 'In Progress', icon: '⏳' },
  { value: 'interview', label: 'HR Interview', icon: '💼' },
  { value: 'technical-interview', label: 'Technical Interview', icon: '🧪' },
  { value: 'offer', label: 'Offer', icon: '🎉' },
  { value: 'rejected', label: 'Rejected', icon: '❌' },
  { value: 'no-response', label: 'No Response', icon: '⏸️' },
];

interface JobApplicationFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onExport: () => void;
  companies: string[];
}

export function JobApplicationFilters({ filters, onFiltersChange, onExport, companies }: JobApplicationFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const handleFilterChange = (key: keyof FiltersState, value: string | string[]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({ search: '', status: [], priority: 'all', company: '', dateField: 'created', dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters =
    filters.search ||
    filters.status.length > 0 ||
    filters.priority !== 'all' ||
    filters.company ||
    filters.dateFrom ||
    filters.dateTo;

  const toggleStatus = (status: ApplicationStatus) => {
    const next = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    handleFilterChange('status', next);
  };

  const selectAllStatuses = (selected: boolean) => {
    handleFilterChange('status', selected ? STATUS_OPTIONS.map((s) => s.value) : []);
  };

  const statusSummary = filters.status.length === 0
    ? 'All statuses'
    : filters.status.length === 1
      ? STATUS_OPTIONS.find((s) => s.value === filters.status[0])?.label ?? `${filters.status.length} selected`
      : `${filters.status.length} statuses`;

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
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={statusOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn('truncate', filters.status.length === 0 && 'text-muted-foreground')}>
                        {statusSummary}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search status..." />
                      <CommandList>
                        <CommandEmpty>No status found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all-statuses"
                            onSelect={() => selectAllStatuses(filters.status.length < STATUS_OPTIONS.length)}
                          >
                            <Check className={cn('mr-2 h-4 w-4', filters.status.length === STATUS_OPTIONS.length ? 'opacity-100' : 'opacity-0')} />
                            All statuses
                          </CommandItem>
                          {STATUS_OPTIONS.map((status) => (
                            <CommandItem
                              key={status.value}
                              value={status.value}
                              onSelect={() => toggleStatus(status.value)}
                            >
                              <Check className={cn('mr-2 h-4 w-4', filters.status.includes(status.value) ? 'opacity-100' : 'opacity-0')} />
                              <span className="mr-2">{status.icon}</span>
                              {status.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companyOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn('truncate', !filters.company && 'text-muted-foreground')}>
                        {filters.company || 'All companies'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search company..." />
                      <CommandList>
                        <CommandEmpty>No company found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => { handleFilterChange('company', ''); setCompanyOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', !filters.company ? 'opacity-100' : 'opacity-0')} />
                            All companies
                          </CommandItem>
                          {companies.map((company) => (
                            <CommandItem
                              key={company}
                              value={company}
                              onSelect={() => { handleFilterChange('company', company); setCompanyOpen(false); }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', filters.company === company ? 'opacity-100' : 'opacity-0')} />
                              {company}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
