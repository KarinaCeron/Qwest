import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  min_value: string | null;
  currency: string;
  period: string;
  notes: string | null;
}

function ItemRow({ item, onDelete }: { item: CompensationItem; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{item.label}</p>
        {item.kind === 'salary' ? (
          (item.value || item.min_value) && (
            <p className="text-sm text-muted-foreground">
              {item.value && `Desired ${item.value}`}
              {item.value && item.min_value && ' · '}
              {item.min_value && `Minimum ${item.min_value}`}
              {` ${item.currency} · ${item.period === 'annual' ? 'Annual' : 'Monthly'}`}
            </p>
          )
        ) : (
          item.value && <p className="text-sm text-muted-foreground">{item.value}</p>
        )}

        {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
      </div>
      <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} aria-label="Delete item">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CompensationPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CompensationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Salary expectation form
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryLabel, setSalaryLabel] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryMinAmount, setSalaryMinAmount] = useState('');

  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState('annual');
  const [salaryNotes, setSalaryNotes] = useState('');

  // Benefit form
  const [benefitSaving, setBenefitSaving] = useState(false);
  const [benefitLabel, setBenefitLabel] = useState('');
  const [benefitDetail, setBenefitDetail] = useState('');
  const [benefitNotes, setBenefitNotes] = useState('');

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('compensation_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete the item', variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddSalary = async () => {
    if (!user || !salaryLabel.trim()) return;
    setSalarySaving(true);
    const { error } = await supabase.from('compensation_items').insert({
      user_id: user.id,
      kind: 'salary',
      label: salaryLabel.trim(),
      value: salaryAmount.trim() || null,
      min_value: salaryMinAmount.trim() || null,
      currency,
      period,
      notes: salaryNotes.trim() || null,
    });
    if (error) {
      toast({ title: 'Could not add the salary expectation', description: error.message, variant: 'destructive' });
    } else {
      setSalaryLabel('');
      setSalaryAmount('');
      setSalaryMinAmount('');
      setSalaryNotes('');
      await fetchItems();

    }
    setSalarySaving(false);
  };

  const handleAddBenefit = async () => {
    if (!user || !benefitLabel.trim()) return;
    setBenefitSaving(true);
    const { error } = await supabase.from('compensation_items').insert({
      user_id: user.id,
      kind: 'benefit',
      label: benefitLabel.trim(),
      value: benefitDetail.trim() || null,
      currency: 'USD',
      period: 'annual',
      notes: benefitNotes.trim() || null,
    });
    if (error) {
      toast({ title: 'Could not add the benefit', description: error.message, variant: 'destructive' });
    } else {
      setBenefitLabel('');
      setBenefitDetail('');
      setBenefitNotes('');
      await fetchItems();
    }
    setBenefitSaving(false);
  };

  const salaries = items.filter((i) => i.kind === 'salary');
  const benefits = items.filter((i) => i.kind === 'benefit');

  const listState = (list: CompensationItem[], emptyText: string) =>
    loading ? (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ) : list.length === 0 ? (
      <p className="text-sm text-muted-foreground">{emptyText}</p>
    ) : (
      <div className="space-y-2">
        {list.map((item) => (
          <ItemRow key={item.id} item={item} onDelete={handleDelete} />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            Salary expectations
            <Badge variant="secondary">{salaries.length}</Badge>
          </CardTitle>
          <CardDescription>Track the numbers you are aiming for, by currency and period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salaryLabel">Title</Label>
              <Input
                id="salaryLabel"
                value={salaryLabel}
                onChange={(e) => setSalaryLabel(e.target.value)}
                placeholder="e.g. Target base salary"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryAmount">Desired amount</Label>
              <Input
                id="salaryAmount"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder="120000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMinAmount">Minimum to accept</Label>
              <Input
                id="salaryMinAmount"
                value={salaryMinAmount}
                onChange={(e) => setSalaryMinAmount(e.target.value)}
                placeholder="100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salaryCurrency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="salaryCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryPeriod">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="salaryPeriod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="salaryNotes">Notes</Label>
              <Input
                id="salaryNotes"
                value={salaryNotes}
                onChange={(e) => setSalaryNotes(e.target.value)}
                placeholder="Minimum acceptable, negotiation context..."
              />
            </div>
          </div>
          <Button
            onClick={handleAddSalary}
            disabled={salarySaving || !salaryLabel.trim()}
            className="w-full bg-gradient-primary"
          >
            {salarySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add salary expectation
          </Button>
          {listState(salaries, 'No salary expectations yet.')}
        </CardContent>
      </Card>

      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5" />
            Benefits
            <Badge variant="secondary">{benefits.length}</Badge>
          </CardTitle>
          <CardDescription>The perks and conditions that matter to you beyond salary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="benefitLabel">Benefit</Label>
              <Input
                id="benefitLabel"
                value={benefitLabel}
                onChange={(e) => setBenefitLabel(e.target.value)}
                placeholder="e.g. Fully remote"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefitDetail">Detail</Label>
              <Input
                id="benefitDetail"
                value={benefitDetail}
                onChange={(e) => setBenefitDetail(e.target.value)}
                placeholder="e.g. 20 days per year"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="benefitNotes">Notes</Label>
              <Input
                id="benefitNotes"
                value={benefitNotes}
                onChange={(e) => setBenefitNotes(e.target.value)}
                placeholder="Why it matters to you"
              />
            </div>
          </div>
          <Button
            onClick={handleAddBenefit}
            disabled={benefitSaving || !benefitLabel.trim()}
            className="w-full bg-gradient-primary"
          >
            {benefitSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add benefit
          </Button>
          {listState(benefits, 'No benefits yet.')}
        </CardContent>
      </Card>
    </div>
  );
}
