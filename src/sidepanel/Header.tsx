import { Button } from "@/components/Button";
import { LogoMark, Wordmark } from "@/components/Logo";
import { Refresh } from "@/components/Icon";

interface Props {
  currentTabTitle: string;
  onAnalyze: () => void;
  suggestionCount: number;
}

export function Header({ currentTabTitle, onAnalyze, suggestionCount }: Props) {
  return (
    <header className="px-4 pt-4 pb-3 border-b border-border bg-surface sticky top-0 z-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <Wordmark size="md" />
            {suggestionCount > 0 ? (
              <span
                className="ml-1 text-2xs tabular-nums text-ink-faint"
                aria-label={`${suggestionCount} pending suggestion${suggestionCount === 1 ? "" : "s"}`}
              >
                {suggestionCount}
              </span>
            ) : null}
          </div>
          {currentTabTitle ? (
            <p
              className="mt-2 text-xs text-ink-muted truncate font-medium"
              title={currentTabTitle}
            >
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
