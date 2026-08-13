import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormattedText } from '@/components/FormattedText';

export interface InsightItem {
  category: string;
  status?: string;
  requirement?: string;
  notes?: string;
}

const OTHER_RE = /^(other|others|otros|misc|miscellaneous|general)$/i;


const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

function categoryRank(category: string, skillsOrder: string[] = []) {
  if (OTHER_RE.test(category)) return Number.MAX_SAFE_INTEGER;
  const normalizedCategory = normalizeKey(category);

  // Order follows the user's core skills list.
  const skillIdx = skillsOrder.findIndex((s) => normalizeKey(s) === normalizedCategory);
  if (skillIdx !== -1) return skillIdx;

  // Categories not in the skills list come after, in a stable group.
  return skillsOrder.length;
}

function titleCase(s: string) {
  return s.trim().replace(/^[#*\-\s]+|[:*\s]+$/g, '');
}

/** Normalizes a status string into a visual bucket. */
function statusMeta(status?: string) {
  const s = (status || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (/^(required|must have|mandatory|requerido|obligatorio|met|yes|match|matched)/.test(s))
    return { icon: CheckCircle2, label: 'Required', className: 'border-primary/40 bg-primary/10 text-primary' };
  if (/(nice to have|preferred|optional|plus|deseable|partial|maybe)/.test(s))
    return { icon: AlertTriangle, label: 'Nice to have', className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400' };
  if (/(not met|missing|lack|weak|fail)/.test(s))
    return { icon: XCircle, label: s, className: 'border-destructive/40 bg-destructive/10 text-destructive' };
  if (/(unclear|unknown|n\/a|no especificado)/.test(s))
    return { icon: HelpCircle, label: 'Unclear', className: 'border-border bg-muted text-muted-foreground' };
  return { icon: HelpCircle, label: status || 'Unclear', className: 'border-border bg-muted text-muted-foreground' };
}

/** Extracts the first balanced JSON object/array from arbitrary text. */
function extractJson(text: string): string | null {
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function fromJson(text: string): InsightItem[] | null {
  const candidate = extractJson(text.replace(/\\n/g, '\n'));
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.requirements)
        ? parsed.requirements
        : Array.isArray(parsed.insights)
          ? parsed.insights
          : Array.isArray(parsed.items)
            ? parsed.items
            : null;
    if (!arr) return null;
    const items = arr
      .filter((r: unknown) => r && typeof r === 'object')
      .map((r: Record<string, unknown>) => ({
        category: String(r.category ?? r.Category ?? r.section ?? 'Others'),
        status: r.status != null ? String(r.status) : undefined,
        requirement: (r.requirement ?? r.Requirement ?? r.requisito ?? r.text) as string | undefined,
        notes: (r.notes ?? r.Notes ?? r.note ?? r.comment) as string | undefined,
      }))
      .filter((i) => i.requirement || i.notes);
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

export function JobInsights({ text, skillsOrder }: { text: string; skillsOrder?: string[] }) {
  const items = parseInsights(text);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!items.length) return <FormattedText text={text} />;

  const groups = new Map<string, InsightItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const skills = (skillsOrder ?? []).map((s) => s.trim()).filter(Boolean);
  const usedKeys = new Set<string>();

  // One fixed section per core skill (in the user's order), even when empty.
  const fixedSections: [string, InsightItem[]][] = skills.map((skill) => {
    const matches: InsightItem[] = [];
    for (const [cat, list] of groups.entries()) {
      if (normalizeKey(cat) === normalizeKey(skill)) {
        usedKeys.add(cat);
        matches.push(...list);
      }
    }
    return [skill, matches];
  });

  const extraSections = [...groups.entries()]
    .filter(([cat]) => !usedKeys.has(cat))
    .sort(([a, la], [b, lb]) => {
      const ra = categoryRank(a, skills);
      const rb = categoryRank(b, skills);
      if (ra !== rb) return ra - rb;
      if (lb.length !== la.length) return lb.length - la.length;
      return a.localeCompare(b);
    });

  const ordered: [string, InsightItem[]][] = [...fixedSections, ...extraSections];

  // Nothing structured found (single "Other" group with only notes) → plain formatting
  if (
    !skills.length &&
    ordered.length === 1 &&
    OTHER_RE.test(ordered[0][0]) &&
    ordered[0][1].every((i) => !i.requirement && !i.status)
  ) {
    return <FormattedText text={text} />;
  }


  const allCollapsed = ordered.every(([c]) => collapsed[c]);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (!allCollapsed) ordered.forEach(([c]) => { next[c] = true; });
    setCollapsed(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </Button>
      </div>
      {ordered.map(([category, list]) => {
        const isCollapsed = !!collapsed[category];
        return (
          <section key={category} className="space-y-2">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/60"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground">{category}</h4>
              <span className="text-xs text-muted-foreground">({list.length})</span>
            </button>
            {!isCollapsed && (
              <div className="space-y-2">
                {!list.length && (
                  <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                    No insights found for this skill in the job description.
                  </div>
                )}
                {list.map((item, i) => {

                  const { icon: Icon, className, label } = statusMeta(item.status);
                  return (
                    <div key={i} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 text-sm font-medium text-foreground">
                          {item.requirement ? <FormattedText text={item.requirement} /> : <span className="text-muted-foreground">—</span>}
                        </div>
                        {item.status && (
                          <Badge variant="outline" className={`shrink-0 gap-1 ${className}`}>
                            <Icon className="h-3 w-3" />
                            {label}
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
            )}
          </section>
        );
      })}
    </div>
  );
}

export default JobInsights;
