import { useMemo, useState } from 'react';
import type { Chapter } from '../../types';

interface PurchasePanelProps {
  chapter: Chapter;
}

/** Merge adjacent short lines into complete sentences, then extract purchase hints */
function extractSettings(content: string[]): string[] {
  const merged: string[] = [];
  let buf = '';
  for (const line of content) {
    const t = line.trim();
    if (!t) continue;
    if (buf && !/[。）!！]$/.test(buf) && buf.length < 80) {
      buf += t;
    } else {
      if (buf) merged.push(buf);
      buf = t;
    }
  }
  if (buf) merged.push(buf);
  return merged.filter(l =>
    /自动购买器|自动购买|购买器设置|粘滞键|购买单个|优先购买|购买第\d|购买\d+个|按.*最大|按住.*最大|卡住.*键/.test(l)
  );
}

export function PurchasePanel({ chapter }: PurchasePanelProps) {
  const [open, setOpen] = useState(false);
  const hints = useMemo(() => {
    return extractSettings(chapter.sections.flatMap(s => s.content));
  }, [chapter]);

  if (!hints.length) return null;

  return (
    <div className="mt-8 mb-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-[var(--accent-color)]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${open ? 'rotate-90' : ''}`}><path d="M4 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        购买器/自动设置提示（{hints.length} 条）
      </button>
      {open && (
        <div className="mt-3 p-4 rounded-lg text-xs space-y-2 animate-fade-in-up" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {hints.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>{i + 1}</span>
              <span>{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
