import { useEffect, useState } from 'react';
import { ApplicationBenefit } from '@/types/jobApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Gift, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QwestBenefit {
  id: string;
  label: string | null;
  value: string | null;
  notes: string | null;
  required: boolean;
}

interface ApplicationBenefitsProps {
  benefits: ApplicationBenefit[];
  onChange: (benefits: ApplicationBenefit[]) => void;
}

export function ApplicationBenefits({ benefits, onChange }: ApplicationBenefitsProps) {
  const { toast } = useToast();
  const [qwestBenefits, setQwestBenefits] = useState<QwestBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [rawBenefits, setRawBenefits] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('compensation_items')
        .select('id, label, value, notes, required')
        .eq('kind', 'benefit')
        .order('required', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) console.error('Error loading Qwest benefits:', error);
      setQwestBenefits((data ?? []) as QwestBenefit[]);
      setLoading(false);
    };
    load();
  }, []);

  const addBenefit = (benefit: Omit<ApplicationBenefit, 'id'>) => {
    onChange([...benefits, { ...benefit, id: crypto.randomUUID() }]);
  };

  const handleAddManual = () => {
    if (!newLabel.trim()) return;
    addBenefit({ label: newLabel.trim(), value: newValue.trim() || undefined, offered: true });
    setNewLabel('');
    setNewValue('');
  };

  const handleAddFromText = (silent = false) => {
    if (!rawBenefits.trim()) return;
    const existing = new Set(benefits.map((b) => b.label.toLowerCase()));
    const parsed = rawBenefits
      .split(/\n/)
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line) => line.length > 0 && !existing.has(line.toLowerCase()))
      .map((line) => ({ id: crypto.randomUUID(), label: line, offered: true }));

    if (parsed.length === 0) {
      setRawBenefits('');
      if (!silent) toast({ title: 'Nothing to add', description: 'All listed benefits are already included.' });
      return;
    }

    onChange([...benefits, ...parsed]);
    setRawBenefits('');
    toast({
      title: `${parsed.length} benefit${parsed.length === 1 ? '' : 's'} added`,
      description: 'They are already marked as offered.',
    });
  };


  const handleMapFromQwest = (item: QwestBenefit) => {
    const label = item.label?.trim() || 'Benefit';
    if (benefits.some((b) => b.label.toLowerCase() === label.toLowerCase())) {
      toast({ title: 'Already added', description: `${label} is already in this application.` });
      return;
    }
    addBenefit({
      label,
      value: item.value || undefined,
      notes: item.notes || undefined,
      required: item.required,
      offered: true,
    });
  };

  const handleMapAll = () => {
    const existing = new Set(benefits.map((b) => b.label.toLowerCase()));
    const toAdd = qwestBenefits
      .filter((i) => (i.label?.trim() || '') && !existing.has((i.label as string).trim().toLowerCase()))
      .map((i) => ({
        id: crypto.randomUUID(),
        label: (i.label as string).trim(),
        value: i.value || undefined,
        notes: i.notes || undefined,
        required: i.required,
        offered: true,
      }));
    if (toAdd.length === 0) {
      toast({ title: 'Nothing to map', description: 'All your Qwest benefits are already here.' });
      return;
    }
    onChange([...benefits, ...toAdd]);
  };

  const update = (id: string, patch: Partial<ApplicationBenefit>) => {
    onChange(benefits.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const remove = (id: string) => onChange(benefits.filter((b) => b.id !== id));

  const sorted = [...benefits].sort((a, b) => Number(!!b.required) - Number(!!a.required));
  const selectedLabels = new Set(benefits.map((b) => b.label.toLowerCase()));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Record the benefits included in this offer, and map the benefit expectations you set in My Qwest.
      </p>

      {/* Map from My Qwest */}
      <div className="rounded-lg border p-4 space-y-3 bg-background/50">
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Benefits from My Qwest
          </Label>
          {qwestBenefits.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={handleMapAll}>
              <Download className="h-3.5 w-3.5 mr-1" />
              Map all
            </Button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your benefit expectations...</p>
        ) : qwestBenefits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven't added benefit expectations in My Qwest yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {qwestBenefits.map((item) => {
              const label = item.label?.trim() || 'Benefit';
              const isSelected = selectedLabels.has(label.toLowerCase());
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={isSelected ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => !isSelected && handleMapFromQwest(item)}
                  disabled={isSelected}
                  className={isSelected ? 'opacity-90' : ''}
                >
                  {isSelected ? (
                    <span className="mr-1">✓</span>
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  {label}
                  {item.required && <span className="ml-1 text-xs opacity-70">(required)</span>}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Paste benefits from offer */}
      <div className="rounded-lg border p-4 space-y-3">
        <Label>Paste benefits listed in the offer</Label>
        <Textarea
          value={rawBenefits}
          onChange={(e) => setRawBenefits(e.target.value)}
          onBlur={() => handleAddFromText(true)}
          placeholder={`Paste the benefits list here, one per line.\nExample:\nHealth insurance\n15 vacation days\nRemote work stipend`}
          rows={4}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddFromText()}
            disabled={!rawBenefits.trim()}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add listed benefits
          </Button>
        </div>

      </div>

      {/* Benefit list */}
      {sorted.length > 0 ? (
        <div className="space-y-2">
          <Label>Benefits in this application ({sorted.length})</Label>
          <div className="space-y-2">
            {sorted.map((b) => (
              <div key={b.id} className="rounded-lg border p-3 bg-background/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{b.label}</p>
                      {b.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                    {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(b.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove benefit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={b.value ?? ''}
                    onChange={(e) => update(b.id, { value: e.target.value })}
                    placeholder="What the company offers for this benefit"
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No benefits added yet.</p>
      )}
    </div>
  );
}
