import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-3 md:flex-row md:items-end", className)}>
      <div>
        <h1 className="font-display text-3xl leading-none tracking-tight">{title}</h1>
        {subtitle ? (
          <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
