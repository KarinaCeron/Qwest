import { Building2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  company: string;
  isLoading: boolean;
  text: string | null;
}

export function CompanyResearchPanel({ company, isLoading, text }: Props) {
  const hasRun = isLoading || text !== null;
  if (!hasRun) return null;

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
        ) : text ? (
          <div className="rounded-md border bg-background p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">
              {text}
            </pre>
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
