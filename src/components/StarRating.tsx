import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  score: number | null | undefined;
  max?: number;
  showValue?: boolean;
  className?: string;
}

export function StarRating({ score, max = 5, showValue = true, className }: Props) {
  if (score === null || score === undefined) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  }

  const rounded = Math.max(0, Math.min(max, Math.round(score)));

  return (
    <div
      className={cn('flex flex-col items-center gap-0.5', className)}
      role="img"
      aria-label={`${rounded} out of ${max}`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              i < rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {rounded}/{max}
        </span>
      )}
    </div>
  );
}

export default StarRating;
