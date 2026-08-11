import { useEffect, useState } from 'react';
import { ApplicationBenefit } from '@/types/jobApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
      offered: false,
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
        offered: false,
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
            {qwestBenefits.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleMapFromQwest(item)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {item.label || 'Benefit'}
                {item.required && <span className="ml-1 text-xs opacity-70">(required)</span>}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Add manual benefit */}
      <div className="rounded-lg border p-4 space-y-3">
        <Label>Add a benefit</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Health insurance, 15 vacation days..."
            className="flex-1"
            maxLength={120}
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Detail / value (optional)"
            className="flex-1"
            maxLength={160}
          />
          <Button type="button" onClick={handleAddManual} disabled={!newLabel.trim()} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-1" />
            Add
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
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={!!b.offered}
                      onCheckedChange={(checked) => update(b.id, { offered: !!checked })}
                    />
                    Offered
                  </label>
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
