import { ExternalLink, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface CompanyResearch {
  website: string;
  foundation_year: string;
  founders: string[];
  investing_rounds: string[];
  number_of_employees: string;
  cpo_name: string;
  cpo_linkedin: string;
  cto_name: string;
  cto_linkedin: string;
  product_organization: string;
  culture: string;
  employee_reviews: string;
}

function isLink(value?: string) {
  return !!value && /^https?:\/\//i.test(value.trim());
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {isLink(value) ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
        >
          {value}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{value?.trim() || 'Unknown'}</p>
      )}
    </div>
  );
}

function ListField({ label, values }: { label: string; values?: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {values && values.length > 0 ? (
        <ul className="list-disc pl-4 text-sm space-y-0.5">
          {values.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">Unknown</p>
      )}
    </div>
  );
}

export interface ResearchSource {
  title: string;
  uri: string;
}

interface Props {
  company: string;
  isLoading: boolean;
  research: CompanyResearch | null;
  sources?: ResearchSource[];
}

export function CompanyResearchPanel({ company, isLoading, research, sources = [] }: Props) {
  if (!isLoading && !research) return null;


  return (
    <Card className="border-primary/20 bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Company research{company ? `: ${company}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : research ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website" value={research.website} />
            <Field label="Foundation year" value={research.foundation_year} />
            <ListField label="Founders" values={research.founders} />
            <ListField label="Investing rounds" values={research.investing_rounds} />
            <Field label="Number of employees" value={research.number_of_employees} />
            <Field label="CPO" value={research.cpo_name} />
            <Field label="CPO LinkedIn" value={research.cpo_linkedin} />
            <Field label="CTO" value={research.cto_name} />
            <Field label="CTO LinkedIn" value={research.cto_linkedin} />
            <div className="sm:col-span-2">
              <Field label="Product organization" value={research.product_organization} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Culture" value={research.culture} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Employee reviews" value={research.employee_reviews} />
            </div>
            {sources.length > 0 && (
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Sources</p>
                <ul className="space-y-1">
                  {sources.map((s, i) => (
                    <li key={i}>
                      <a
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline break-all"
                      >
                        {s.title || s.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        ) : null}
      </CardContent>
    </Card>
  );
}
