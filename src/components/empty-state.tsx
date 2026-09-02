import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, command, hint }: { title: string; command: string; hint: string }) {
  return (
    <Card className="border-warn/25">
      <CardContent className="flex flex-col gap-5">
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">{hint}</p>
        <code className="tnum rounded-[14px] border border-line/60 bg-subtle px-4 py-3 text-sm text-edge">
          {command}
        </code>
      </CardContent>
    </Card>
  );
}
