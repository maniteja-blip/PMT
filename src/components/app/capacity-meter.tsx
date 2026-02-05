import { cn } from "@/lib/utils";

export function CapacityMeter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(1, value / max);
  const vibe = pct < 0.8 ? "bg-chart-2" : pct < 1 ? "bg-chart-4" : "bg-destructive";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground">
          Capacity
        </div>
        <div className="font-mono text-xs text-foreground/80">
          {value.toFixed(1)}h / {max.toFixed(0)}h
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <div className={cn("h-full rounded-full", vibe)} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
