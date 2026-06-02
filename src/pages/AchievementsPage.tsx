import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chapterIndex, loadChapter } from '../data/loadChapter';
import { cleanTitle } from '../utils/titleClean';
import { extractAchievements } from '../data/extractTools';
import type { Chapter } from '../types';
import type { AchievementHit } from '../data/extractTools';

function phaseColor(id: number) {
  if (id <= 3) return '#4ade80';
  if (id <= 8) return '#60a5fa';
  if (id <= 11) return '#facc15';
  if (id <= 13) return '#f97316';
  if (id <= 16) return '#f43f5e';
  return '#c084fc';
}

export function AchievementsPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all(chapterIndex.map(idx => loadChapter(idx.id))).then(loaded => {
      setChapters(loaded.filter(Boolean) as Chapter[]);
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const achievements = useMemo(() => extractAchievements(chapters), [chapters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return achievements.filter(hit => {
      if (!q) return true;
      return `${hit.achievement} ${hit.context} ${hit.chapterTitle}`.toLowerCase().includes(q);
    });
  }, [query, achievements]);

  return (
    <div className="guide-tool-shell min-h-screen">
      {/* Hero */}
      <div className="relative tool-hero py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="tool-hero-grid" />
        <div className="relative z-[1] max-w-5xl mx-auto text-center">
          <div className="inline-flex tool-sigil mb-8">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 3l3.8 7.7 8.7 1.3-6.3 6.1 1.5 8.6L14 21.5l-7.7 4.2 1.5-8.6L1.5 12l8.7-1.3L14 3z" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="tool-hero-title text-gradient mb-6">成就检索</h1>
          <p className="hero-kicker">
            按 r 编号、章节、上下文关键词搜索全部成就，点击跳转原文
          </p>
          <div className="tool-hero-actions justify-center mt-8">
            <Link to="/" className="cta-secondary ripple-cta text-sm">
              &larr; 返回首页
            </Link>
            <Link to="/tools/study-trees" className="cta-secondary ripple-cta text-sm">
              时间研究树 &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="relative max-w-xl mx-auto">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="5"/><path d="M12 12l3.5 3.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`搜索 r123、章节、上下文关键词...（共 ${achievements.length} 条）`}
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm outline-none transition-all focus:border-[var(--border-accent)] focus:shadow-[0_0_0_3px_rgba(124,92,240,0.06)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent-light)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Results */}
        <div className="mt-6 space-y-1">
          <div className="text-xs text-[var(--text-tertiary)] mb-3 flex items-center gap-2">
            <span>找到 {filtered.length} 条结果</span>
            {query && <span>（筛选自全部 {achievements.length} 条）</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20 mb-4">
                <path d="M24 6l5.1 10 11.4 1.7-8.3 8 2 11.3L24 31.5l-10.2 5.5 2-11.3L7.5 17.7 18.9 16 24 6z"/>
              </svg>
              <p className="text-sm">{chapters.length === 0 ? '加载中...' : '没有匹配的成就'}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
              {filtered.map(hit => (
                <button
                  key={hit.id}
                  onClick={() => navigate(`/chapter/${hit.chapterId}?q=${encodeURIComponent(hit.achievement)}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 border-b border-[var(--border-color)] last:border-b-0 text-left hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <span
                    className="flex-shrink-0 px-2.5 py-1 rounded-md text-sm font-extrabold border font-mono"
                    style={{ borderColor: phaseColor(hit.chapterId), color: phaseColor(hit.chapterId) }}
                  >
                    {hit.achievement}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-bold border font-mono"
                        style={{ borderColor: phaseColor(hit.chapterId), color: phaseColor(hit.chapterId) }}
                      >
                        Ch{hit.chapterId}
                      </span>
                      {cleanTitle(hit.chapterTitle)}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{hit.context}</p>
                  </div>
                  <svg className="flex-shrink-0 text-[var(--accent-color)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
