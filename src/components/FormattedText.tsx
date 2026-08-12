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

export function FormattedText({ text }: { text: string }) {
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

export default FormattedText;
