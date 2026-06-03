import { useMemo, useState } from 'react';
import type { Chapter } from '../../types';

interface PurchasePanelProps {
  chapter: Chapter;
}

/** Detect auto-buyer / purchase setting lines from chapter content */
function extractSettings(content: string[]): string[] {
  return content.filter(
    (line) =>
      /自动购买器|自动购买|购买器设置|粘滞键|最大.*购买|购买单个|购买\d+|优先购买/.test(line) &&
      line.length < 120,
  );
}

export function PurchasePanel({ chapter }: PurchasePanelProps) {
  const [open, setOpen] = useState(false);

  const hints = useMemo(() => {
    const allLines = chapter.sections.flatMap((s) => s.content);
    return extractSettings(allLines);
  }, [chapter]);

  if (hints.length === 0) return null;

  return (
    <div className="mt-8 mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-[var(--accent-color)]"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        购买器/自动设置提示（{hints.length} 条）
      </button>

      {open && (
        <div
          className="mt-3 p-4 rounded-lg text-xs space-y-2 animate-fade-in-up"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
          }}
        >
          {hints.map((hint, i) => (
            <div
              key={i}
              className="flex items-start gap-2"
            >
              <span
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent-color)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {i + 1}
              </span>
              <span>{hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
