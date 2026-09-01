import { Tracker } from "@/components/budget/tracker";

export default function BudgetPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Budget</h1>
        <p className="max-w-[64ch] leading-relaxed text-muted">
          Le seul levier que tu contrôles réellement. Fixe un plafond, note ce qui sort, regarde
          l&apos;écart se creuser entre le retour annoncé et le retour vécu.
        </p>
      </header>
      <Tracker />
    </div>
  );
}
