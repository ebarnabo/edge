import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, command, hint }: { title: string; command: string; hint: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted">{hint}</p>
        <code className="tnum rounded-[18px] border border-line/60 bg-base/60 px-5 py-4 text-sm text-edge">
          {command}
        </code>
      </CardContent>
    </Card>
  );
}
