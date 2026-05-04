import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { Refresh, Sparkles } from "@/components/Icon";

interface Props {
  currentTabTitle: string;
  onAnalyze: () => void;
  suggestionCount: number;
}

export function Header({ currentTabTitle, onAnalyze, suggestionCount }: Props) {
  return (
    <header className="px-4 pt-4 pb-3 border-b border-border bg-surface sticky top-0 z-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles width={16} height={16} className="text-accent" />
            <h1 className="text-[15px] font-semibold tracking-tight text-ink">
              Tabsmith
            </h1>
            {suggestionCount > 0 ? (
              <Pill tone="accent">
                {suggestionCount} {suggestionCount === 1 ? "idea" : "ideas"}
              </Pill>
            ) : null}
          </div>
          {currentTabTitle ? (
            <p className="mt-1.5 text-[12px] text-ink-muted truncate" title={currentTabTitle}>
              {currentTabTitle}
            </p>
          ) : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onAnalyze}
          leadingIcon={<Refresh width={13} height={13} />}
        >
          Analyze
        </Button>
      </div>
    </header>
  );
}
