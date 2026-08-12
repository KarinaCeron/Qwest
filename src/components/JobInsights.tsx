import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FormattedText } from '@/components/FormattedText';

export interface InsightItem {
  category: string;
  status?: string;
  requirement?: string;
  notes?: string;
}

const OTHER_RE = /^(other|others|otros|misc|miscellaneous|general)$/i;

function titleCase(s: string) {
  return s.trim().replace(/^[#*\-\s]+|[:*\s]+$/g, '');
}

/** Normalizes a status string into a visual bucket. */
function statusMeta(status?: string) {
  const s = (status || '').toLowerCase();
  if (/(^|\b)(met|yes|match|matched|strong|cumple|full)/.test(s))
    return { icon: CheckCircle2, className: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400' };
  if (/(partial|maybe|some|medium|parcial|gap\b)/.test(s))
    return { icon: AlertTriangle, className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400' };
  if (/(not met|missing|no\b|lack|weak|fail)/.test(s))
    return { icon: XCircle, className: 'border-destructive/40 bg-destructive/10 text-destructive' };
  return { icon: HelpCircle, className: 'border-border bg-muted text-muted-foreground' };
}

function fromJson(text: string): InsightItem[] | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.insights)
        ? parsed.insights
        : Array.isArray(parsed.items)
          ? parsed.items
          : null;
    if (!arr) return null;
    const items = arr
      .filter((r: unknown) => r && typeof r === 'object')
      .map((r: Record<string, unknown>) => ({
        category: String(r.category ?? r.Category ?? r.section ?? 'Other'),
        status: r.status != null ? String(r.status) : undefined,
        requirement: (r.requirement ?? r.Requirement ?? r.requisito) as string | undefined,
        notes: (r.notes ?? r.Notes ?? r.note ?? r.comment) as string | undefined,
      }));
    return items.length ? items : null;
  } catch {
    return null;
  }
}

/** Parses free-form/markdown insights into category → items. */
function fromText(text: string): InsightItem[] {
  const normalized = text.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const items: InsightItem[] = [];
  let currentCategory = 'Other';
  let current: InsightItem | null = null;

  const push = () => {
    if (current && (current.requirement || current.notes || current.status)) items.push(current);
    current = null;
  };

  const labelOf = (line: string) => {
    const m = line.match(/^\s*(?:[-*•]\s*)?(?:\*\*)?\s*(category|section|status|requirement|requisito|notes?|comments?|detail)s?\b\s*(?:\*\*)?\s*[:\-–]\s*(.*)$/i);
    if (!m) return null;
    return { key: m[1].toLowerCase(), value: m[2].replace(/\*\*/g, '').trim() };
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const lbl = labelOf(line);
    if (lbl) {
      if (lbl.key === 'category' || lbl.key === 'section') {
        push();
        currentCategory = titleCase(lbl.value) || 'Other';
        continue;
      }
      if (lbl.key === 'status') {
        if (current?.status) push();
        current = current ?? { category: currentCategory };
        current.status = lbl.value;
        continue;
      }
      if (lbl.key === 'requirement' || lbl.key === 'requisito') {
        if (current?.requirement) push();
        current = current ?? { category: currentCategory };
        current.requirement = lbl.value;
        continue;
      }
      // notes / comments / detail
      current = current ?? { category: currentCategory };
      current.notes = current.notes ? `${current.notes}\n${lbl.value}` : lbl.value;
      continue;
    }

    // Heading style: "## Category", "**Category**", "Category:" alone
    const heading = line.match(/^#{1,6}\s+(.*)$/) || line.match(/^\*\*([^*]+)\*\*:?$/) || line.match(/^([A-Za-z][\w\s/&()-]{2,50}):$/);
    if (heading) {
      push();
      currentCategory = titleCase(heading[1]) || 'Other';
      continue;
    }

    // Bullet without labels → treat as requirement (or notes continuation)
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      push();
      current = { category: currentCategory, requirement: bullet[1].trim() };
      continue;
    }

    if (current) {
      current.notes = current.notes ? `${current.notes}\n${line}` : line;
    } else {
      items.push({ category: currentCategory, notes: line });
    }
  }
  push();

  return items;
}

export function parseInsights(text: string): InsightItem[] {
  return fromJson(text) ?? fromText(text);
}

export function JobInsights({ text }: { text: string }) {
  const items = parseInsights(text);

  if (!items.length) return <FormattedText text={text} />;

  const groups = new Map<string, InsightItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const ordered = [...groups.entries()].sort(([a], [b]) => {
    const aOther = OTHER_RE.test(a);
    const bOther = OTHER_RE.test(b);
    if (aOther !== bOther) return aOther ? 1 : -1;
    return 0;
  });

  // Nothing structured found (single "Other" group with only notes) → plain formatting
  if (ordered.length === 1 && OTHER_RE.test(ordered[0][0]) && ordered[0][1].every((i) => !i.requirement && !i.status)) {
    return <FormattedText text={text} />;
  }

  return (
    <div className="space-y-5">
      {ordered.map(([category, list]) => (
        <section key={category} className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground">{category}</h4>
            <span className="text-xs text-muted-foreground">({list.length})</span>
          </div>
          <div className="space-y-2">
            {list.map((item, i) => {
              const { icon: Icon, className } = statusMeta(item.status);
              return (
                <div key={i} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 text-sm font-medium text-foreground">
                      {item.requirement ? <FormattedText text={item.requirement} /> : <span className="text-muted-foreground">—</span>}
                    </div>
                    {item.status && (
                      <Badge variant="outline" className={`shrink-0 gap-1 ${className}`}>
                        <Icon className="h-3 w-3" />
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  {item.notes && (
                    <div className="mt-2 border-t pt-2">
                      <FormattedText text={item.notes} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default JobInsights;
