import { Building2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  company: string;
  isLoading: boolean;
  text: string | null;
}

const URL_RE = /(https?:\/\/[^\s)<>\]]+|www\.[^\s)<>\]]+)/gi;

/** Renders inline **bold** and auto-linked URLs. */
function renderInline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  boldParts.forEach((part, bi) => {
    if (!part) return;
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    const content = boldMatch ? boldMatch[1] : part;

    const pieces = content.split(URL_RE);
    const rendered = pieces.map((piece, pi) => {
      if (!piece) return null;
      if (piece.match(URL_RE) && piece.match(URL_RE)?.[0] === piece) {
        const href = piece.startsWith('http') ? piece : `https://${piece}`;
        return (
          <a
            key={`${keyPrefix}-${bi}-${pi}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
          >
            {piece}
          </a>
        );
      }
      return <span key={`${keyPrefix}-${bi}-${pi}`}>{piece}</span>;
    });

    nodes.push(
      boldMatch ? (
        <strong key={`${keyPrefix}-b-${bi}`} className="font-semibold text-foreground">
          {rendered}
        </strong>
      ) : (
        <span key={`${keyPrefix}-t-${bi}`}>{rendered}</span>
      ),
    );
  });

  return nodes;
}

function FormattedText({ text }: { text: string }) {
  const normalized = text.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n{2,}/);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        const isList = lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));

        if (isList) {
          return (
            <ul key={bi} className="list-disc space-y-1.5 pl-5">
              {lines.map((line, li) => (
                <li key={li}>
                  {renderInline(line.replace(/^\s*([-*•]|\d+[.)])\s+/, ''), `${bi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }

        // Heading-like single line: "## Title" or "**Title**"
        const headingMatch = lines.length === 1 && lines[0].match(/^#{1,6}\s+(.*)$/);
        if (headingMatch) {
          return (
            <h4 key={bi} className="text-base font-semibold text-foreground">
              {renderInline(headingMatch[1], `h-${bi}`)}
            </h4>
          );
        }

        return (
          <p key={bi} className="whitespace-pre-wrap">
            {lines.map((line, li) => (
              <span key={li}>
                {renderInline(line, `${bi}-${li}`)}
                {li < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
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
            <FormattedText text={text} />
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
