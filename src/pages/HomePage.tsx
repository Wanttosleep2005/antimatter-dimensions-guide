import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProgressBar } from '../components/progress/ProgressBar';
import { useProgress } from '../hooks/useProgress';
import { chapterIndex, loadChapter } from '../data/loadChapter';
import type { Chapter } from '../types';

type ScrollTriggerInstance = {
  kill: () => void;
};

declare global {
  interface Window {
    gsap?: {
      registerPlugin: (plugin: unknown) => void;
      fromTo: (target: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>) => unknown;
      to: (target: unknown, vars: Record<string, unknown>) => unknown;
    };
    ScrollTrigger?: {
      create: (vars: Record<string, unknown>) => ScrollTriggerInstance;
    };
  }
}

type Phase = {
  name: string;
  range: [number, number];
  symbol: string;
  tone: string;
};


const PHASES: Phase[] = [
  { name: '无限阶段', range: [1, 5], symbol: '\u221e', tone: 'var(--phase-infinity)' },
  { name: '永恒阶段', range: [6, 9], symbol: '\u03b5', tone: 'var(--phase-eternity)' },
  { name: '时间膨胀', range: [10, 11], symbol: '\u0394', tone: 'var(--phase-dilation)' },
  { name: '现实阶段', range: [12, 13], symbol: '\u03a8', tone: 'var(--phase-reality)' },
  { name: '天界层', range: [14, 20], symbol: '\u03a9', tone: 'var(--phase-celestial)' },
];

function getLastChapter(): { id: number; title: string } | null {
  try {
    const raw = localStorage.getItem('ad-guide-last-chapter');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number; title?: string };
    if (parsed.id && parsed.title) return { id: parsed.id, title: parsed.title };
  } catch {
    return null;
  }
  return null;
}

function cleanTitle(title: string) {
  return title.replace(/^[一二三四五六七八九十\d]+[、.\s-]*/, '');
}

function phaseForChapter(chapterId: number) {
  return PHASES.find(phase => chapterId >= phase.range[0] && chapterId <= phase.range[1]) ?? PHASES[0];
}

export function HomePage({ completed, total, inProgress }: { completed: number; total: number; inProgress: number }) {
  const { getStatus } = useProgress();
  const navigate = useNavigate();
  const lastChapter = getLastChapter();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const [displayPct, setDisplayPct] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Lazy-load chapters in small batches for fast first paint
    const BATCH_SIZE = 4;
    const ids = chapterIndex.map(c => c.id);
    const results: Chapter[] = [];

    const loadBatch = async (startIdx: number) => {
      if (cancelled || startIdx >= ids.length) return;
      const batch = ids.slice(startIdx, startIdx + BATCH_SIZE);
      const loaded = await Promise.all(batch.map(id => loadChapter(id)));
      if (!cancelled) {
        results.push(...loaded.filter((c): c is Chapter => Boolean(c)));
        setChapters([...results]);
        // Schedule next batch with a small gap to let UI breathe
        setTimeout(() => loadBatch(startIdx + BATCH_SIZE), 50);
      }
    };

    loadBatch(0);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setDisplayPct(0);
    const step = Math.max(1, Math.ceil(pct / 32));
    const interval = window.setInterval(() => {
      setDisplayPct(prev => {
        if (prev >= pct) {
          window.clearInterval(interval);
          return pct;
        }
        return Math.min(pct, prev + step);
      });
    }, 24);

    return () => window.clearInterval(interval);
  }, [pct]);

  useEffect(() => {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);
    const triggers: ScrollTriggerInstance[] = [];
    document.querySelectorAll<HTMLElement>('.tool-reveal').forEach((el) => {
      gsap.fromTo(el, { opacity: 0.25, y: 28, filter: 'blur(6px)' }, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          end: 'top 52%',
          scrub: 0.45,
        },
      });
    });

    document.querySelectorAll<HTMLElement>('.scanline-card').forEach((el) => {
      triggers.push(ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => gsap.to(el, { '--scan-y': '100%', duration: 1.1, ease: 'power2.out' }),
      }));
    });

    return () => triggers.forEach(trigger => trigger.kill());
  }, [chapters.length]);

  const openLastOrFirst = () => navigate(lastChapter ? `/chapter/${lastChapter.id}` : '/chapter/1');

  return (
    <main className="guide-tool-shell overflow-x-hidden w-full max-w-full">
      <section className="tool-hero relative px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="tool-hero-grid" aria-hidden="true" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="tool-sigil mb-8" aria-hidden="true">&infin;</div>
              <h1 className="tool-hero-title text-gradient">反物质维度攻略控制台</h1>
              <p className="mt-6 max-w-2xl text-base leading-8" style={{ color: 'var(--text-secondary)' }}>
                章节目录、时间研究树复制、成就引用检索和正文高亮集中在同一个入口里。
              </p>
            </div>
            <div className="tool-hero-actions">
              <button type="button" onClick={openLastOrFirst} className="ripple-cta cta-primary press-spring">
                {lastChapter ? '继续阅读' : '开始阅读'}
              </button>
              <button type="button" onClick={() => navigate('/chapter/1?q=时间研究')} className="ripple-cta cta-secondary press-spring">
                搜索时间研究
              </button>
            </div>
          </div>

          <div className="mt-14">
            <article className="scanline-card card-premium glass-panel p-6 spring-hover shimmer-border ambient-glow max-w-xl">
              <p className="eyebrow-text">阅读进度</p>
              <div className="mt-5 flex items-end gap-2">
                <span className="progress-number">{displayPct}</span>
                <span className="pb-4 text-2xl font-bold" style={{ color: 'var(--text-tertiary)' }}>%</span>
              </div>
              <div className="mt-6">
                <ProgressBar completed={completed} total={total} inProgress={inProgress} />
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Guide introduction — console-style info panel */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="relative p-6 sm:p-8 rounded-lg border overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,22,0.8), rgba(6,6,14,0.7))',
            borderColor: 'var(--border-color)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(124,92,240,0.04), inset 0 1px 0 rgba(255,255,255,0.01)',
          }}
        >
          {/* Top accent line — console-style */}
          <div className="absolute top-0 left-6 right-6 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(124,92,240,0.3) 30%, rgba(124,92,240,0.5) 50%, rgba(124,92,240,0.3) 70%, transparent)' }}
          />
          <h2 className="text-lg font-bold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            攻略说明
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <div>
              <p className="mb-3">
                本攻略基于 <strong style={{ color: 'var(--accent-color)' }}>Antimatter Dimensions Android 版</strong>，
                从最初的无限阶段到最终的天界层（Celestial），共涵盖 20 个章节。
              </p>
              <p className="mb-3">
                每章提供 <span style={{ color: 'var(--text-primary)' }}>详细的购买顺序、自动购买器配置、挑战策略</span>，
                并标注关键的符文搭配和研究树路线。
              </p>
            </div>
            <div>
              <p className="mb-3">
                侧边栏集成了 <span style={{ color: 'var(--accent-color)' }}>时间研究树复制</span> 和
                <span style={{ color: 'var(--accent2-color)' }}> 成就检索</span> 功能，
                按 <kbd className="px-1 py-0.5 rounded text-xs font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)', border: '1px solid var(--border-accent)' }}>Ctrl+K</kbd> 可随时搜索全文。
              </p>
              <p>
                每个章节支持 <span style={{ color: 'var(--text-primary)' }}>进度追踪（未开始/进行中/已完成）</span>，
                阅读进度自动保存到浏览器本地，无需登录。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 tool-reveal">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="tool-section-title">目录</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              保留原本章节导航，按游戏阶段组织，状态与侧边栏一致。
            </p>
          </div>
          <Link to="/glossary" className="ripple-cta cta-secondary hidden sm:inline-flex">术语速查</Link>
        </div>

        <div className="phase-directory">
          {PHASES.map((phase) => {
            const phaseChapters = chapterIndex.filter(chapter => chapter.id >= phase.range[0] && chapter.id <= phase.range[1]);
            const done = phaseChapters.filter(chapter => getStatus(chapter.id) === 'completed').length;
            return (
              <article key={phase.name} className="scanline-card phase-directory-card spring-hover">
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
                  {phaseChapters.map(chapter => {
                    const status = getStatus(chapter.id);
                    return (
                      <Link key={chapter.id} to={`/chapter/${chapter.id}`} className="directory-link">
                        <span className={`directory-index ${status}`}>{String(chapter.id).padStart(2, '0')}</span>
                        <span className="truncate">{cleanTitle(chapter.title)}</span>
                      </Link>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="home-footer border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="footer-title">继续推进攻略正文</h2>
            <p className="footer-copy !mx-0">
              章节目录、时间研究树和成就索引均已集成在侧边栏，章节页提供搜索高亮和阅读进度。
            </p>
          </div>
          <button type="button" onClick={openLastOrFirst} className="ripple-cta cta-primary press-spring footer-cta">
            进入攻略正文
          </button>
        </div>
      </footer>
    </main>
  );
}
