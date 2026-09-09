import { AlertTriangle, CheckCircle2, HelpCircle, Link2, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FormattedText } from '@/components/FormattedText';
import { StarRating } from '@/components/StarRating';

export const SCORECARD_MAP = [
  { key: 'stage', jsonKey: 'stage_funding_runway', label: 'Current stage' },
  { key: 'history', jsonKey: 'company_history_quality', label: 'History' },
  { key: 'compensation', jsonKey: 'compensation_non_negotiables', label: 'Compensation' },
  { key: 'culture', jsonKey: 'culture_team', label: 'Culture & team' },
  { key: 'path', jsonKey: 'my_path', label: 'My path to next role' },
] as const;

type AnyRecord = Record<string, any>;

const severityClass = (s: string) => {
  const v = (s || '').toLowerCase();
  if (v.startsWith('high') || v.startsWith('alta')) return 'bg-red-50 text-red-700 border-red-200';
  if (v.startsWith('med')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}

export function TargetCompanyReport({
  evaluation,
  analysis,
}: {
  evaluation: AnyRecord | null;
  analysis: string | null;
}) {
  if (!evaluation || typeof evaluation !== 'object' || !evaluation.scorecard) {
    return analysis ? <FormattedText text={analysis} /> : null;
  }

  const summary: AnyRecord = evaluation.summary ?? {};
  const flags: AnyRecord = evaluation.flags ?? {};
  const risks: AnyRecord[] = Array.isArray(evaluation.risks) ? evaluation.risks : [];
  const questions: AnyRecord[] = Array.isArray(evaluation.interview_questions)
    ? evaluation.interview_questions
    : [];
  const sources: AnyRecord[] = Array.isArray(evaluation.sources) ? evaluation.sources : [];
  const company: AnyRecord = evaluation.company ?? {};

  const flagGroups: { key: 'green' | 'yellow' | 'red'; label: string; className: string }[] = [
    { key: 'green', label: 'Green flags', className: 'text-emerald-700' },
    { key: 'yellow', label: 'Yellow flags', className: 'text-amber-700' },
    { key: 'red', label: 'Red flags', className: 'text-red-700' },
  ];

  return (
    <div className="space-y-6">
      {(summary.decision || summary.one_sentence_verdict) && (
        <Card className="border-primary/20 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {summary.decision && <Badge variant="outline">{summary.decision}</Badge>}
              {typeof summary.total_score === 'number' && (
                <span className="text-sm font-medium text-muted-foreground">
                  Total {summary.total_score}/{summary.maximum_score ?? 25}
                </span>
              )}
              {summary.career_trajectory && (
                <span className="text-sm font-normal text-muted-foreground">
                  Career trajectory: {summary.career_trajectory}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.one_sentence_verdict && (
              <p className="text-sm leading-relaxed text-foreground/90">{summary.one_sentence_verdict}</p>
            )}
            {Array.isArray(summary.key_reasons) && summary.key_reasons.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {summary.key_reasons.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {(company.industry || company.stage || company.location) && (
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <Field label="Industry" value={company.industry} />
          <Field label="Stage" value={company.stage} />
          <Field label="Location" value={company.location} />
          <Field label="Founded" value={company.founded ? String(company.founded) : null} />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scorecard</h3>
        {SCORECARD_MAP.map(({ key, jsonKey, label }) => {
          const entry: AnyRecord | undefined = evaluation.scorecard?.[jsonKey];
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <CardTitle className="text-base">{label}</CardTitle>
                <StarRating score={entry ? entry.score : null} />
              </CardHeader>
              <CardContent className="space-y-3">
                {entry ? (
                  <>
                    <Field label="Criteria" value={entry.criteria} />
                    <Field label="Evidence" value={entry.evidence} />
                    <Field label="Why not higher" value={entry.why_not_higher} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No evaluation returned for this criterion.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {flagGroups.some((g) => Array.isArray(flags[g.key]) && flags[g.key].length > 0) && (
        <div className="space-y-4">
          <Separator />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Flags</h3>
          {flagGroups.map((g) =>
            Array.isArray(flags[g.key]) && flags[g.key].length > 0 ? (
              <div key={g.key} className="space-y-1">
                <p className={`flex items-center gap-2 text-sm font-medium ${g.className}`}>
                  {g.key === 'green' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {g.label}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {flags[g.key].map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}

      {risks.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> Risks
          </h3>
          {risks.map((r, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <CardTitle className="text-sm leading-snug">{r.risk}</CardTitle>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {r.severity && (
                    <Badge variant="outline" className={severityClass(r.severity)}>
                      {r.severity}
                    </Badge>
                  )}
                  {r.category && <span className="text-[11px] text-muted-foreground">{r.category}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Evidence" value={r.evidence} />
                <Field label="How to validate" value={r.validation} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <HelpCircle className="h-4 w-4" /> Interview questions
          </h3>
          {questions.map((q, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <CardTitle className="text-sm leading-snug">{q.question}</CardTitle>
                {q.score_impact && (
                  <Badge variant="outline" className={severityClass(q.score_impact)}>
                    {q.score_impact}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <Field label="Why it matters" value={q.why_it_matters} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Link2 className="h-4 w-4" /> Sources
          </h3>
          <ul className="space-y-2 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="space-y-0.5">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-primary underline underline-offset-2 hover:opacity-80"
                >
                  {s.title || s.url}
                </a>
                {s.supports && <p className="text-xs text-muted-foreground">{s.supports}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TargetCompanyReport;
