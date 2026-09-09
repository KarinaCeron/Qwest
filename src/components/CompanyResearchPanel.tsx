import { Building2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormattedText } from '@/components/FormattedText';
import { TargetCompanyReport, SCORECARD_MAP } from '@/components/TargetCompanyReport';
import { StarRating } from '@/components/StarRating';

interface Props {
  company: string;
  isLoading: boolean;
  text: string | null;
  evaluation?: Record<string, any> | null;
  scores?: Record<string, number | null> | null;
  source?: 'target' | 'new' | 'cache' | null;
}

export function CompanyResearchPanel({ company, isLoading, text, evaluation, scores, source }: Props) {
  const hasRun = isLoading || text !== null || !!evaluation;
  if (!hasRun) return null;

  const scoreRows = scores
    ? SCORECARD_MAP.filter((c) => typeof scores[c.key] === 'number')
    : [];
  const total = scoreRows.reduce((sum, c) => sum + (scores?.[c.key] ?? 0), 0);

  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Company insights{company ? `: ${company}` : ''}
        </CardTitle>
        {source === 'target' && (
          <p className="text-xs text-muted-foreground">
            Saved insights from My Target Companies. Update them from that page.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : evaluation || text ? (
          <div className="space-y-4">
            {scoreRows.length > 0 && (
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Scorecard
                  </p>
                  <p className="text-sm font-semibold">{total}/25</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {scoreRows.map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground/90">{c.label}</span>
                      <StarRating score={scores?.[c.key] ?? 0} showValue={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-md border bg-background p-4">
              {evaluation ? (
                <TargetCompanyReport evaluation={evaluation} analysis={text} />
              ) : (
                <FormattedText text={text as string} />
              )}
            </div>
          </div>
        ) : (
          <Alert variant="destructive" className="bg-background">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The webhook returned an empty response. Check your n8n workflow and make sure the final node outputs a body.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
