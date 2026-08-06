import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Coins, Gift } from 'lucide-react';

type Kind = 'salary' | 'benefit';

interface CompensationItem {
  id: string;
  kind: Kind;
  label: string;
  value: string | null;
  currency: string;
  period: string;
  notes: string | null;
}

export function CompensationPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CompensationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [kind, setKind] = useState<Kind>('salary');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState('annual');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('compensation_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load your list', description: error.message, variant: 'destructive' });
    } else {
      setItems((data || []) as CompensationItem[]);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!user || !label.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('compensation_items').insert({
      user_id: user.id,
      kind,
      label: label.trim(),
      value: value.trim() || null,
      currency,
      period,
      notes: notes.trim() || null,
    });
    if (error) {
      toast({ title: 'Could not add the item', description: error.message, variant: 'destructive' });
    } else {
      setLabel('');
      setValue('');
      setNotes('');
      await fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('compensation_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete the item', variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const salaries = items.filter((i) => i.kind === 'salary');
  const benefits = items.filter((i) => i.kind === 'benefit');

  const renderItem = (item: CompensationItem) => (
    <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{item.label}</p>
        {item.value && (
          <p className="text-sm text-muted-foreground">
            {item.kind === 'salary'
              ? `${item.value} ${item.currency} · ${item.period === 'annual' ? 'Annual' : 'Monthly'}`
              : item.value}
          </p>
        )}
        {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
      </div>
      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Delete item">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5" />
          Salary expectations & benefits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="compKind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger id="compKind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salary">Salary expectation</SelectItem>
                <SelectItem value="benefit">Benefit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="compLabel">Title</Label>
            <Input
              id="compLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={kind === 'salary' ? 'e.g. Target base salary' : 'e.g. Fully remote'}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compValue">{kind === 'salary' ? 'Amount' : 'Detail'}</Label>
            <Input
              id="compValue"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kind === 'salary' ? '120000' : 'e.g. 20 days per year'}
            />
          </div>
          {kind === 'salary' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="compCurrency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="compCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="COP">COP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compPeriod">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger id="compPeriod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="compNotes">Notes</Label>
              <Input
                id="compNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why it matters to you"
              />
            </div>
          )}
        </div>

        <Button onClick={handleAdd} disabled={saving || !label.trim()} className="w-full bg-gradient-primary">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add to my list
        </Button>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Salary expectations</h3>
                <Badge variant="secondary">{salaries.length}</Badge>
              </div>
              {salaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No salary expectations yet.</p>
              ) : (
                <div className="space-y-2">{salaries.map(renderItem)}</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Benefits</h3>
                <Badge variant="secondary">{benefits.length}</Badge>
              </div>
              {benefits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No benefits yet.</p>
              ) : (
                <div className="space-y-2">{benefits.map(renderItem)}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
