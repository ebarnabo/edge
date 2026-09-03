import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  command,
  hint,
}: {
  title: string;
  command?: string;
  hint: string;
}) {
  return (
    <Card className="border-warn/25 bg-warn/5">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="icon-box size-9 shrink-0 bg-warn/10 text-warn">
            <AlertCircle className="size-4" aria-hidden />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="max-w-[60ch] text-sm leading-relaxed text-muted">{hint}</p>
          </div>
        </div>
        {command ? (
          <code className="tnum rounded-[var(--radius-card)] border border-line bg-surface px-3 py-2 font-mono text-xs text-accent">
            {command}
          </code>
        ) : null}
      </CardContent>
    </Card>
  );
}
