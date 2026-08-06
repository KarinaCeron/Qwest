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
import { Plus, Trash2, Loader2, Coins, Gift, Pencil } from 'lucide-react';

type Kind = 'salary' | 'benefit';

interface CompensationItem {
  id: string;
  kind: Kind;
  label: string | null;
  value: string | null;
  min_value: string | null;
  currency: string;
  period: string;
  notes: string | null;
}

function formatMoney(amount: string | null, currency: string): string | null {
  if (!amount || amount.trim() === '') return null;
  const numeric = Number(amount.replace(/[^0-9.-]+/g, ''));
  if (Number.isNaN(numeric)) return amount;
  const locale = currency === 'COP' ? 'es-CO' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(numeric);
}

function ItemRow({
  item,
  onDelete,
  onEdit,
}: {
  item: CompensationItem;
  onDelete: (id: string) => void;
  onEdit?: (item: CompensationItem) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        {item.kind === 'salary' ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">Salary expectation</p>
              <Badge variant="outline" className="text-xs">
                {item.currency} · {item.period === 'annual' ? 'Annual' : 'Monthly'}
              </Badge>
            </div>
            {(item.value || item.min_value) && (
              <p className="text-sm text-muted-foreground">
                {item.value && `Desired ${formatMoney(item.value, item.currency)}`}
                {item.value && item.min_value && ' · '}
                {item.min_value && `Minimum ${formatMoney(item.min_value, item.currency)}`}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-medium truncate">{item.label}</p>
            {item.value && <p className="text-sm text-muted-foreground">{item.value}</p>}
          </>
        )}

        {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
      </div>
      <div className="flex items-start">
        {onEdit && (
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label="Edit item">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} aria-label="Delete item">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CompensationPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CompensationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Salary expectation form
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryMinAmount, setSalaryMinAmount] = useState('');

  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState('annual');
  const [salaryNotes, setSalaryNotes] = useState('');

  // Benefit form
  const [benefitSaving, setBenefitSaving] = useState(false);
  const [benefitLabel, setBenefitLabel] = useState('');
  const [benefitDetail, setBenefitDetail] = useState('');

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

  const resetSalaryForm = () => {
    setSalaryAmount('');
    setSalaryMinAmount('');
    setSalaryNotes('');
    setCurrency('USD');
    setPeriod('annual');
    setEditingSalaryId(null);
    setShowSalaryForm(false);
  };

  const handleEditSalary = (item: CompensationItem) => {
    if (item.kind !== 'salary') return;
    setEditingSalaryId(item.id);
    setSalaryAmount(item.value || '');
    setSalaryMinAmount(item.min_value || '');
    setCurrency(item.currency);
    setPeriod(item.period);
    setSalaryNotes(item.notes || '');
    setShowSalaryForm(true);
  };

  const handleSaveSalary = async () => {
    if (!user) return;
    setSalarySaving(true);

    const payload = {
      value: salaryAmount.trim() || null,
      min_value: salaryMinAmount.trim() || null,
      currency,
      period,
      notes: salaryNotes.trim() || null,
    };

    let error;
    if (editingSalaryId) {
      const result = await supabase.from('compensation_items').update(payload).eq('id', editingSalaryId);
      error = result.error;
    } else {
      const result = await supabase.from('compensation_items').insert({
        user_id: user.id,
        kind: 'salary',
        label: null,
        ...payload,
      });
      error = result.error;
    }

    if (error) {
      toast({
        title: editingSalaryId ? 'Could not update the salary expectation' : 'Could not add the salary expectation',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      resetSalaryForm();
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
      notes: null,
    });
    if (error) {
      toast({ title: 'Could not add the benefit', description: error.message, variant: 'destructive' });
    } else {
      setBenefitLabel('');
      setBenefitDetail('');
      await fetchItems();
    }
    setBenefitSaving(false);
  };

  const salaries = items.filter((i) => i.kind === 'salary');
  const benefits = items.filter((i) => i.kind === 'benefit');

  const salaryList = loading ? (
    <div className="flex justify-center py-6">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : salaries.length === 0 ? (
    <p className="text-sm text-muted-foreground">No salary expectations yet.</p>
  ) : (
    <div className="space-y-2">
      {salaries.map((item) => (
        <ItemRow key={item.id} item={item} onDelete={handleDelete} onEdit={handleEditSalary} />
      ))}
    </div>
  );

  const benefitList = loading ? (
    <div className="flex justify-center py-6">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ) : benefits.length === 0 ? (
    <p className="text-sm text-muted-foreground">No benefits yet.</p>
  ) : (
    <div className="space-y-2">
      {benefits.map((item) => (
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
          <CardDescription>
            Track the numbers you are aiming for, by currency and period. Add one entry per currency — for example, one in USD and another in COP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {salaryList}
          {showSalaryForm ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
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
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveSalary}
                  disabled={salarySaving}
                  className="flex-1 bg-gradient-primary"
                >
                  {salarySaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingSalaryId ? 'Save changes' : 'Add salary expectation'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetSalaryForm}
                  disabled={salarySaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowSalaryForm(true)}
              className="w-full h-12 text-base bg-gradient-primary shadow-md hover:shadow-lg transition-shadow"
            >
              <Coins className="mr-2 h-5 w-5" />
              Add salary expectation
            </Button>
          )}
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
          </div>
          <Button
            onClick={handleAddBenefit}
            disabled={benefitSaving || !benefitLabel.trim()}
            className="w-full bg-gradient-primary"
          >
            {benefitSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add benefit
          </Button>
          {benefitList}
        </CardContent>
      </Card>
    </div>
  );
}
