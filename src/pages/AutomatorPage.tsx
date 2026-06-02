import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chapterIndex, loadChapter } from '../data/loadChapter';
import { extractAutomatorScripts, type AutomatorHit } from '../data/extractTools';
import type { Chapter } from '../types';

export function AutomatorPage() {
  const [scripts, setScripts] = useState<AutomatorHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const chapters: Chapter[] = [];
      for (const ch of chapterIndex) {
        const c = await loadChapter(ch.id);
        if (c) chapters.push(c);
      }
      if (!cancelled) {
        setScripts(extractAutomatorScripts(chapters));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copyData = async (hit: AutomatorHit) => {
    if (!hit.data) return;
    await navigator.clipboard.writeText(hit.data);
    setCopiedId(hit.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fade-in-up">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 breathe-glow" style={{ background: 'var(--accent-light)' }}>
          <span className="text-2xl" style={{ color: 'var(--accent-color)' }}>&lt;/&gt;</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-3" style={{ fontFamily: 'var(--font-heading)' }}>自动机脚本</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          第20章附录 · Cel7 星系生成器 · 共 {scripts.length} 条
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((hit) => (
            <div key={hit.id} className="card-premium p-4 flex items-center gap-4">
              <span
                className="text-xs px-2 py-0.5 rounded font-bold font-mono shrink-0"
                style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}
              >
                Ch{hit.chapterId}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{hit.label}</span>
                  {hit.data?.includes('Script') && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>脚本</span>
                  )}
                </div>
                {hit.data && (
                  <div className="mt-1.5 p-2 rounded max-h-12 overflow-hidden text-[10px] font-mono truncate" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-tertiary)' }}>
                    {hit.data.slice(0, 80)}...
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hit.data && (
                  <button
                    type="button"
                    onClick={() => copyData(hit)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors hover:bg-[var(--accent-light)] hover:border-[var(--border-accent)]"
                    style={{ borderColor: 'var(--border-color)', color: copiedId === hit.id ? 'var(--success)' : 'var(--accent-color)' }}
                  >
                    {copiedId === hit.id ? '已复制' : '复制'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/chapter/${hit.chapterId}`)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors hover:bg-[var(--sidebar-hover)]"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
                >
                  跳转原文
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
