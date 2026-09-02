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
    <Card className="border-warn/20 bg-warn/5">
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">{hint}</p>
        {command && (
          <code className="tnum rounded-[var(--radius-card)] border border-line bg-subtle px-3 py-2 font-mono text-xs text-accent">
            {command}
          </code>
        )}
      </CardContent>
    </Card>
  );
}
