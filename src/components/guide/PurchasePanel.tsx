import { useMemo, useState, useCallback } from 'react';
import type { Chapter } from '../../types';

interface PurchasePanelProps {
  chapter: Chapter;
}

type HintCategory = 'auto' | 'frequency' | 'sticky' | 'priority' | 'other';

const CATEGORY_LABELS: Record<HintCategory, string> = {
  auto: '自动购买器',
  frequency: '计数频率',
  sticky: '粘滞键',
  priority: '优先级',
  other: '其他',
};

function categorize(text: string): HintCategory {
  if (/自动永恒|自动大坍缩|自动星系|自动维度提升|自动购买器/.test(text)) return 'auto';
  if (/购买单个|购买最大|按.*最大|按住.*最大/.test(text)) return 'frequency';
  if (/粘滞键|卡住.*键/.test(text)) return 'sticky';
  if (/优先购买|购买第\d|购买\d+个/.test(text)) return 'priority';
  return 'other';
}

/** Detect auto-buyer / purchase setting lines from chapter content */
function extractSettings(content: string[]): { text: string; category: HintCategory }[] {
  return content
    .filter(
      (line) =>
        /自动购买器|自动购买|购买器设置|粘滞键|最大.*购买|购买单个|购买\d+|优先购买/.test(line) &&
        line.length < 120,
    )
    .map(text => ({ text, category: categorize(text) }));
}

/** Highlight numbers in text */
function highlightNumbers(text: string): string {
  return text.replace(
    /(\d+(?:\.\d+)?\s*(?:秒|个|次|倍|%|亿|万|兆|京|分钟|小时|天|级|档|层|号|格|步|页|行|列|元|块|张|条|关|环|章|节|位|名|点|种|组|系列|等级|数量|上限|下限|倍率|次数|CD|ms|s|min|h|d))/g,
    '<span class="purchase-num">$1</span>',
  );
}

export function PurchasePanel({ chapter }: PurchasePanelProps) {
  const [open, setOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLine, setCopiedLine] = useState<number | null>(null);

  const hints = useMemo(() => {
    const allLines = chapter.sections.flatMap((s) => s.content);
    return extractSettings(allLines);
  }, [chapter]);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(hints.map(h => h.text).join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [hints]);

  const copyLine = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 1500);
  }, []);

  // Group hints by category
  const grouped = useMemo(() => {
    const order: HintCategory[] = ['auto', 'frequency', 'sticky', 'priority', 'other'];
    const map = new Map<HintCategory, typeof hints>();
    for (const cat of order) map.set(cat, []);
    for (const h of hints) {
      const arr = map.get(h.category);
      if (arr) arr.push(h);
    }
    return order
      .filter(cat => (map.get(cat) || []).length > 0)
      .map(cat => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        items: map.get(cat)!,
      }));
  }, [hints]);

  if (hints.length === 0) return null;

  let globalIdx = 0;

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
          className="mt-3 p-4 rounded-lg text-xs space-y-3 animate-fade-in-up"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
          }}
        >
          {grouped.map(group => (
            <div key={group.category}>
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1"
                style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-heading)' }}
              >
                {group.label}
              </div>
              <div className="space-y-1.5">
                {group.items.map((h) => {
                  const idx = globalIdx++;
                  return (
                    <div key={idx} className="flex items-start gap-2 group">
                      <span
                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{
                          background: 'var(--accent-light)',
                          color: 'var(--accent-color)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="flex-1" dangerouslySetInnerHTML={{ __html: highlightNumbers(h.text) }} />
                      <button
                        type="button"
                        onClick={() => copyLine(h.text, idx)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded text-[10px] border"
                        style={{
                          borderColor: copiedLine === idx ? 'var(--success)' : 'var(--border-color)',
                          color: copiedLine === idx ? 'var(--success)' : 'var(--text-tertiary)',
                          background: copiedLine === idx ? 'var(--success-bg)' : 'transparent',
                        }}
                        title="复制此行"
                      >
                        {copiedLine === idx ? '已复制' : '复制'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={copyAll}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copiedAll
                  ? 'border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]'
                  : 'border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--border-accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              {copiedAll ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  已复制
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M2 9V2h7" strokeLinecap="round"/></svg>
                  复制全部设置
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}