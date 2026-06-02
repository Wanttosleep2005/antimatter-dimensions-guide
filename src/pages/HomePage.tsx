import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chapterIndex, loadChapter } from '../data/loadChapter';
import { cleanTitle } from '../utils/titleClean';
import { getBookmarks, type Bookmark } from '../utils/bookmarks';
import type { Chapter } from '../types';

type ScrollTriggerInstance = { kill: () => void };

declare global {
  interface Window {
    gsap?: {
      registerPlugin: (plugin: unknown) => void;
      fromTo: (target: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>) => unknown;
      to: (target: unknown, vars: Record<string, unknown>) => unknown;
    };
    ScrollTrigger?: { create: (vars: Record<string, unknown>) => ScrollTriggerInstance };
  }
}

type Phase = { name: string; range: [number, number]; symbol: string; tone: string };

const PHASES: Phase[] = [
  { name: '无限阶段', range: [1, 5], symbol: '\u221e', tone: 'var(--phase-infinity)' },
  { name: '永恒阶段', range: [6, 9], symbol: '\u03b5', tone: 'var(--phase-eternity)' },
  { name: '时间膨胀', range: [10, 11], symbol: '\u0394', tone: 'var(--phase-dilation)' },
  { name: '现实阶段', range: [12, 13], symbol: '\u03a8', tone: 'var(--phase-reality)' },
  { name: '天界层', range: [14, 20], symbol: '\u03a9', tone: 'var(--phase-celestial)' },
];

function phaseForChapter(chapterId: number) {
  return PHASES.find((p) => chapterId >= p.range[0] && chapterId <= p.range[1]) ?? PHASES[0];
}

function phaseCssVar(id: number) {
  if (id <= 5) return 'var(--phase-infinity)';
  if (id <= 9) return 'var(--phase-eternity)';
  if (id <= 11) return 'var(--phase-dilation)';
  if (id <= 13) return 'var(--phase-reality)';
  return 'var(--phase-celestial)';
}

export function HomePage({
  getStatus,
  onOpenSearch,
}: {
  completed: number;
  total: number;
  inProgress: number;
  getStatus: (id: number) => 'not-started' | 'in-progress' | 'completed';
  onOpenSearch?: () => void;
}) {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    let cancelled = false;
    const BATCH_SIZE = 4;
    const ids = chapterIndex.map((c) => c.id);
    const results: Chapter[] = [];
    const loadBatch = async (startIdx: number) => {
      if (cancelled || startIdx >= ids.length) return;
      const batch = ids.slice(startIdx, startIdx + BATCH_SIZE);
      const loaded = await Promise.all(batch.map((id) => loadChapter(id)));
      if (!cancelled) {
        results.push(...loaded.filter((c): c is Chapter => Boolean(c)));
        setChapters([...results]);
        setTimeout(() => loadBatch(startIdx + BATCH_SIZE), 50);
      }
    };
    loadBatch(0);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const triggers: ScrollTriggerInstance[] = [];
    document.querySelectorAll<HTMLElement>('.tool-reveal').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0.25, y: 28, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 52%', scrub: 0.45 } },
      );
    });
    document.querySelectorAll<HTMLElement>('.scanline-card').forEach((el) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: el, start: 'top 85%',
          onEnter: () => gsap.to(el, { '--scan-y': '100%', duration: 1.1, ease: 'power2.out' }),
        }),
      );
    });
    return () => triggers.forEach((t) => t.kill());
  }, [chapters.length]);

  // ── Quick jump ──
  const [jumpQuery, setJumpQuery] = useState('');
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const jumpMatches = useMemo(() => {
    if (!jumpQuery.trim()) return [];
    const q = jumpQuery.toLowerCase();
    return chapterIndex
      .filter((c) => String(c.id) === q || cleanTitle(c.title).toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [jumpQuery]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumpQuery.trim()) return;
    const num = parseInt(jumpQuery);
    if (num >= 1 && num <= 20) { navigate(`/chapter/${num}`); return; }
    if (jumpMatches.length > 0) navigate(`/chapter/${jumpMatches[0].id}`);
  };

  // ── Recent chapters ──
  const recentChapters = useMemo(() => {
    try {
      const raw = localStorage.getItem('ad-recent-chapters');
      if (!raw) return [];
      return (JSON.parse(raw) as { id: number; title: string; ts: string }[]).slice(0, 5);
    } catch { return []; }
  }, []);

  // ── Bookmarks ──
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  useEffect(() => { setBookmarks(getBookmarks()); }, []);

  // ── Hide completed toggle ──
  const [hideCompleted, setHideCompleted] = useState(true);

  // Controls
  const openContinue = () => {
    if (recentChapters.length > 0) {
      navigate(`/chapter/${recentChapters[0].id}`);
    } else {
      navigate('/chapter/1');
    }
  };

  const openTimeStudySearch = () => {
    onOpenSearch?.();
    // The search modal doesn't accept prefill yet — we'll just open it
  };

  return (
    <main className="guide-tool-shell overflow-x-hidden w-full max-w-full">
      {/* ── Hero ── */}
      <section className="tool-hero relative px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="tool-hero-grid" aria-hidden="true" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="tool-sigil mb-8" aria-hidden="true">&infin;</div>
              <h1 className="tool-hero-title text-gradient whitespace-nowrap">反物质维度攻略控制台</h1>
            </div>
            <div className="tool-hero-actions">
              <button type="button" onClick={openContinue} className="ripple-cta cta-primary press-spring">
                {recentChapters.length > 0 ? '继续阅读' : '开始阅读'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Control panel grid ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Quick jump */}
          <div className="console-panel p-5">
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>快速跳转</h3>
            <form onSubmit={handleJumpSubmit} className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input ref={jumpInputRef} type="text" value={jumpQuery} onChange={(e) => setJumpQuery(e.target.value)}
                placeholder="输入章节号或名称..." onKeyDown={(e) => { if (e.key === 'Escape') setJumpQuery(''); }}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none border transition-colors"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
              />
            </form>
            {jumpMatches.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {jumpMatches.map((c) => (
                  <button key={c.id} type="button" onClick={() => { navigate(`/chapter/${c.id}`); setJumpQuery(''); }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-[var(--sidebar-hover)] transition-colors"
                    style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>{String(c.id).padStart(2, '0')}</span>
                    {cleanTitle(c.title)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent reading */}
          <div className="console-panel p-5">
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>最近阅读</h3>
            {recentChapters.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无记录，开始阅读第一章吧</p>
            ) : (
              <div className="space-y-2">{recentChapters.map((rc) => (
                <Link key={rc.id} to={`/chapter/${rc.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--sidebar-hover)] transition-colors group"
                  style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono shrink-0" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>{rc.id}</span>
                  <span className="flex-1 truncate">{cleanTitle(rc.title)}</span>
                  <span className="text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }}>{rc.ts}</span>
                </Link>
              ))}</div>
            )}
          </div>

          {/* Bookmarks */}
          <div className="console-panel p-5">
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>书签</h3>
            {bookmarks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>阅读时点击小节标题旁的书签图标收藏</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">{bookmarks.slice(0, 6).map((bm) => (
                <Link key={bm.sectionId} to={`/chapter/${bm.chapterId}#${bm.sectionId}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-[var(--sidebar-hover)] transition-colors group"
                  style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-[10px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>Ch{bm.chapterId}</span>
                  <span className="flex-1 truncate">{bm.sectionTitle}</span>
                </Link>
              ))}</div>
            )}
          </div>
        </div>

        {/* Chapter mini grid */}
        <div className="console-panel p-5 mt-4">
          <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>章节速览</h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {chapterIndex.map((c) => {
              const st = getStatus(c.id);
              const filled = st === 'completed' || st === 'in-progress';
              return (
                <Link key={c.id} to={`/chapter/${c.id}`} className="flex flex-col items-center gap-1 group" title={`${cleanTitle(c.title)}${filled ? ' · 已读' : ''}`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-all group-hover:scale-110 group-hover:shadow-lg"
                    style={{ background: filled ? phaseCssVar(c.id) : 'var(--bg-tertiary)', color: filled ? '#fff' : 'var(--text-tertiary)', border: filled ? 'none' : '1px solid var(--border-color)', boxShadow: filled ? `0 0 12px ${phaseCssVar(c.id)}44` : undefined }}>
                    {c.id}
                  </div>
                  <span className="text-[10px] hidden sm:block truncate max-w-[64px] text-center" style={{ color: 'var(--text-tertiary)' }}>{cleanTitle(c.title).slice(0, 4)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Phase directory ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 tool-reveal">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="tool-section-title">目录</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>按游戏阶段组织</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--text-tertiary)' }}>
              <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[var(--accent-color)]" />
              隐藏已完成
            </label>
            <Link to="/glossary" className="ripple-cta cta-secondary hidden sm:inline-flex">术语速查</Link>
          </div>
        </div>

        <div className="phase-directory">
          {PHASES.map((phase) => {
            const phaseChapters = chapterIndex.filter((ch) => ch.id >= phase.range[0] && ch.id <= phase.range[1]);
            const done = phaseChapters.filter((ch) => getStatus(ch.id) === 'completed').length;
            const visibleChapters = hideCompleted
              ? phaseChapters.filter((ch) => getStatus(ch.id) !== 'completed')
              : phaseChapters;
            if (hideCompleted && visibleChapters.length === 0) return null;
            return (
              <article key={phase.name} className="scanline-card phase-directory-card spring-hover"
                style={{ borderLeft: `3px solid ${phase.tone}` }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="phase-directory-symbol" style={{ color: phase.tone }}>{phase.symbol}</span>
                    <div>
                      <h3>{phase.name}</h3>
                      <p>{done}/{phaseChapters.length} 完成</p>
                    </div>
                  </div>
                  <div className="phase-directory-bar">
                    <span style={{ width: `${Math.round((done / phaseChapters.length) * 100)}%`, background: phase.tone }} />
                  </div>
                </div>
                <div className="mt-5 grid gap-2">
                  {visibleChapters.map((ch) => {
                    const st = getStatus(ch.id);
                    return (
                      <Link key={ch.id} to={`/chapter/${ch.id}`} className="directory-link">
                        <span className={`directory-index ${st}`}>{String(ch.id).padStart(2, '0')}</span>
                        <span className="truncate">{cleanTitle(ch.title)}</span>
                      </Link>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Guide introduction (bottom) ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="console-panel p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>攻略说明</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <div>
              <p className="mb-3">本攻略基于 <strong style={{ color: 'var(--accent-color)' }}>Antimatter Dimensions Android 版</strong>，从最初的无限阶段到最终的天界层，共涵盖 20 个章节。</p>
              <p className="mb-3">每章提供 <span style={{ color: 'var(--text-primary)' }}>详细的购买顺序、自动购买器配置、挑战策略</span>，并标注关键的符文搭配和研究树路线。</p>
            </div>
            <div>
              <p className="mb-3">侧边栏集成了 <span style={{ color: 'var(--accent-color)' }}>时间研究树复制</span> 和 <span style={{ color: 'var(--accent2-color)' }}>成就检索</span> 功能，按 <kbd className="px-1 py-0.5 rounded text-xs font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)', border: '1px solid var(--border-accent)' }}>Ctrl+K</kbd> 可随时搜索全文。</p>
              <p>每个章节支持 <span style={{ color: 'var(--text-primary)' }}>进度追踪（未开始/进行中/已完成）</span>，阅读进度自动保存到浏览器本地，无需登录。</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
