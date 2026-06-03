import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chapterIndex, loadChapter } from '../data/loadChapter';
import { cleanTitle } from '../utils/titleClean';
import { extractStudyTrees } from '../data/extractTools';
import type { Chapter } from '../types';
import type { StudyTreeHit } from '../data/extractTools';

function phaseColor(id: number) {
  if (id <= 3) return '#4ade80';
  if (id <= 8) return '#60a5fa';
  if (id <= 11) return '#facc15';
  if (id <= 13) return '#f97316';
  if (id <= 16) return '#f43f5e';
  return '#c084fc';
}

export function StudyTreesPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const studyTrees = useMemo(() => extractStudyTrees(chapters), [chapters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return studyTrees.filter(hit => {
      if (!q) return true;
      return `${hit.label} ${hit.tree} ${hit.context} ${hit.chapterTitle}`.toLowerCase().includes(q);
    });
  }, [query, studyTrees]);

  const copyTree = async (hit: StudyTreeHit) => {
    let tree = hit.tree;
    if (!/|\d$/.test(tree)) tree += '|0';
    await navigator.clipboard.writeText(tree);
    setCopiedId(hit.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="guide-tool-shell min-h-screen">
      {/* Hero */}
      <div className="relative tool-hero py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="tool-hero-grid" />
        <div className="relative z-[1] max-w-5xl mx-auto text-center">
          <div className="inline-flex tool-sigil mb-8">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2v24M6 8l8 6 8-6M6 18l8 5 8-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="tool-hero-title text-gradient mb-6">时间研究树</h1>
          <p className="hero-kicker">
            快速搜索 EC 研究、时间理论 (TT)、标准研究树，一键复制代码或跳转原文
          </p>
          <div className="tool-hero-actions justify-center mt-8">
            <Link to="/" className="cta-secondary ripple-cta text-sm">
              &larr; 返回首页
            </Link>
            <Link to="/tools/achievements" className="cta-secondary ripple-cta text-sm">
              成就检索 &rarr;
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
            placeholder={`搜索 EC、TT、标准树、编号...（共 ${studyTrees.length} 条）`}
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
            {query && <span>（筛选自全部 {studyTrees.length} 条）</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20 mb-4">
                <circle cx="24" cy="24" r="18"/>
                <path d="M18 24h12M24 18v12" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">{chapters.length === 0 ? '加载中...' : '没有匹配的研究树'}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(hit => (
                <article
                  key={hit.id}
                  className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-accent)] transition-all duration-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-md text-xs font-bold border"
                      style={{ borderColor: phaseColor(hit.chapterId), color: phaseColor(hit.chapterId), fontFamily: 'var(--font-mono)' }}
                    >
                      Ch{hit.chapterId}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{cleanTitle(hit.chapterTitle)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    <span style={{ color: 'var(--accent-color)' }}>{hit.label}</span>
                    {' '}
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{
                      background: hit.treeType === 'standard' ? '#22c55e20' :
                                  hit.treeType === 'reset' ? '#3b82f620' :
                                  hit.treeType === 'purchase' ? '#f59e0b20' :
                                  hit.treeType === 'ec' ? '#ef444420' :
                                  hit.treeType === 'standardLike' ? '#8b5cf620' :
                                  '#6366f120',
                      color: hit.treeType === 'standard' ? '#22c55e' :
                             hit.treeType === 'reset' ? '#3b82f6' :
                             hit.treeType === 'purchase' ? '#f59e0b' :
                             hit.treeType === 'ec' ? '#ef4444' :
                             hit.treeType === 'standardLike' ? '#8b5cf6' :
                             '#6366f1',
                      border: '1px solid currentColor',
                    }}>
                      {hit.treeType === 'standard' ? '标准树' :
                       hit.treeType === 'reset' ? '重置后' :
                       hit.treeType === 'purchase' ? '购买后' :
                       hit.treeType === 'ec' ? 'EC挑战' :
                       hit.treeType === 'standardLike' ? '类标准' :
                       '初始树'}
                    </span>
                    {hit.ttCount != null && (
                      <span className="text-[10px] text-[var(--text-tertiary)] ml-1" style={{ fontFamily: 'var(--font-mono)' }}>
                        {hit.ttCount}TT
                      </span>
                    )}
                  </h3>
                  <code className="block p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] font-mono leading-relaxed break-all mb-3">
                    {hit.tree}
                  </code>
                  <p className="text-xs text-[var(--text-tertiary)] mb-3 leading-relaxed">{hit.context}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyTree(hit)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        copiedId === hit.id
                          ? 'border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]'
                          : 'border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--border-accent)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {copiedId === hit.id ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M2 9V2h7" strokeLinecap="round"/></svg>
                          复制代码
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/chapter/${hit.chapterId}?q=${encodeURIComponent(hit.tree.slice(0, 8))}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      跳转原文
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
