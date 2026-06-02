import { useEffect, useMemo, useState } from 'react';
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

type StudyTreeHit = {
  id: string;
  chapterId: number;
  chapterTitle: string;
  label: string;
  tree: string;
  context: string;
};

type AchievementHit = {
  id: string;
  achievement: string;
  chapterId: number;
  chapterTitle: string;
  context: string;
};

const PHASES: Phase[] = [
  { name: '无限阶段', range: [1, 5], symbol: '\u221e', tone: 'var(--phase-infinity)' },
  { name: '永恒阶段', range: [6, 9], symbol: '\u03b5', tone: 'var(--phase-eternity)' },
  { name: '时间膨胀', range: [10, 11], symbol: '\u0394', tone: 'var(--phase-dilation)' },
  { name: '现实阶段', range: [12, 13], symbol: '\u03a8', tone: 'var(--phase-reality)' },
  { name: '天界层', range: [14, 20], symbol: '\u03a9', tone: 'var(--phase-celestial)' },
];

const STUDY_TREE_RE = /(?:\d{2,3}\s*,\s*){5,}\d{2,3}\s*(?:\|\s*\d{1,2})?/g;
const ACHIEVEMENT_CHAIN_RE = /r(\d{2})((?:\/\d{2})+)/g;
const ACHIEVEMENT_RE = /\br\d{2,3}\b/g;

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

function normalizeSpace(text: string) {
  return text.replace(/---\s*Page\s+\d+\s*---/gi, ' ').replace(/\s+/g, ' ').trim();
}

function compactTree(tree: string) {
  return tree.replace(/\s+/g, '').replace(/，/g, ',');
}

function excerpt(content: string, index: number, length: number) {
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + length + 90);
  return normalizeSpace(content.slice(start, end));
}

function inferTreeLabel(context: string, chapterId: number) {
  const ec = context.match(/EC\d+(?:×\d+)?/i)?.[0];
  const tt = context.match(/\d{2,5}\s*TT/i)?.[0]?.replace(/\s+/g, '');
  const named = context.includes('标准树') ? '标准树' : context.includes('挂机路径') ? '挂机路径' : context.includes('活跃路径') ? '活跃路径' : '';
  return [ec, tt, named].filter(Boolean).join(' · ') || `第 ${chapterId} 章研究树`;
}

function extractStudyTrees(chapters: Chapter[]) {
  const seen = new Set<string>();
  const hits: StudyTreeHit[] = [];

  chapters.forEach((chapter) => {
    for (const match of chapter.content.matchAll(STUDY_TREE_RE)) {
      const raw = match[0];
      const tree = compactTree(raw);
      if (tree.split(',').length < 6) continue;

      const key = `${chapter.id}:${tree}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const index = match.index ?? 0;
      const context = excerpt(chapter.content, index, raw.length);
      hits.push({
        id: key,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        label: inferTreeLabel(context, chapter.id),
        tree,
        context,
      });
    }
  });

  return hits;
}

function expandAchievementChains(content: string) {
  return content.replace(ACHIEVEMENT_CHAIN_RE, (_, base: string, suffixes: string) => {
    const rest = suffixes.split('/').filter(Boolean).map((part: string) => `r${part}`);
    return [`r${base}`, ...rest].join(' ');
  });
}

function extractAchievements(chapters: Chapter[]) {
  const seen = new Set<string>();
  const hits: AchievementHit[] = [];

  chapters.forEach((chapter) => {
    const content = expandAchievementChains(chapter.content);
    for (const match of content.matchAll(ACHIEVEMENT_RE)) {
      const achievement = match[0];
      const index = match.index ?? 0;
      const key = `${achievement}:${chapter.id}:${index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      hits.push({
        id: key,
        achievement,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        context: excerpt(content, index, achievement.length),
      });
    }
  });

  return hits;
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
  const [studyQuery, setStudyQuery] = useState('');
  const [achievementQuery, setAchievementQuery] = useState('');
  const [copiedTree, setCopiedTree] = useState<string | null>(null);

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

  const studyTrees = useMemo(() => extractStudyTrees(chapters), [chapters]);
  const achievementHits = useMemo(() => extractAchievements(chapters), [chapters]);

  const filteredStudyTrees = useMemo(() => {
    const q = studyQuery.trim().toLowerCase();
    return studyTrees.filter(hit => {
      if (!q) return true;
      return `${hit.label} ${hit.tree} ${hit.context} ${hit.chapterTitle}`.toLowerCase().includes(q);
    }).slice(0, 12);
  }, [studyQuery, studyTrees]);

  const filteredAchievements = useMemo(() => {
    const q = achievementQuery.trim().toLowerCase();
    return achievementHits.filter(hit => {
      if (!q) return true;
      return `${hit.achievement} ${hit.context} ${hit.chapterTitle}`.toLowerCase().includes(q);
    }).slice(0, 16);
  }, [achievementHits, achievementQuery]);

  const copyTree = async (hit: StudyTreeHit) => {
    await navigator.clipboard.writeText(hit.tree);
    setCopiedTree(hit.id);
    window.setTimeout(() => setCopiedTree(prev => (prev === hit.id ? null : prev)), 1400);
  };

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

          <div className="mt-14 grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <article className="scanline-card card-premium glass-panel p-6 spring-hover shimmer-border ambient-glow">
              <p className="eyebrow-text">阅读进度</p>
              <div className="mt-5 flex items-end gap-2">
                <span className="progress-number">{displayPct}</span>
                <span className="pb-4 text-2xl font-bold" style={{ color: 'var(--text-tertiary)' }}>%</span>
              </div>
              <div className="mt-6">
                <ProgressBar completed={completed} total={total} inProgress={inProgress} />
              </div>
            </article>
            <article className="scanline-card card-premium glass-panel p-6 spring-hover">
              <p className="eyebrow-text">研究树索引</p>
              <strong className="tool-metric">{studyTrees.length}</strong>
              <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                自动从章节正文提取，可一键复制。
              </p>
            </article>
            <article className="scanline-card card-premium glass-panel p-6 spring-hover">
              <p className="eyebrow-text">成就引用</p>
              <strong className="tool-metric">{achievementHits.length}</strong>
              <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                按编号或上下文检索并跳转高亮。
              </p>
            </article>
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

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 tool-reveal">
        <div className="tool-panel-header">
          <div>
            <h2 className="tool-section-title">时间研究树复制</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              输入 `EC10`、`850TT`、`标准树` 或树编号片段，直接过滤并复制完整研究树。
            </p>
          </div>
          <input
            value={studyQuery}
            onChange={event => setStudyQuery(event.target.value)}
            className="tool-search-input"
            placeholder="筛选研究树..."
          />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {filteredStudyTrees.map(hit => (
            <article key={hit.id} className="scanline-card tool-result-card spring-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow-text">第 {hit.chapterId} 章 · {cleanTitle(hit.chapterTitle)}</p>
                  <h3 className="mt-2 tool-result-title">{hit.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => copyTree(hit)}
                  className={`copy-button press-spring ${copiedTree === hit.id ? 'copied' : ''}`}
                >
                  {copiedTree === hit.id ? '已复制' : '复制'}
                </button>
              </div>
              <code className="tree-code">{hit.tree}</code>
              <p className="mt-4 text-xs leading-6" style={{ color: 'var(--text-tertiary)' }}>
                {hit.context}
              </p>
              <Link to={`/chapter/${hit.chapterId}?q=${encodeURIComponent(hit.tree.slice(0, 8))}`} className="tool-inline-link">
                打开原文位置 &rarr;
              </Link>
            </article>
          ))}
          {filteredStudyTrees.length === 0 && (
            <div className="empty-tool-state">没有匹配的时间研究树。</div>
          )}
        </div>
      </section>

      <section id="achievements" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 tool-reveal">
        <div className="tool-panel-header">
          <div>
            <h2 className="tool-section-title">成就检索</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              支持 `r123`、章节标题和上下文关键词，结果会跳转到章节并触发搜索高亮。
            </p>
          </div>
          <input
            value={achievementQuery}
            onChange={event => setAchievementQuery(event.target.value)}
            className="tool-search-input"
            placeholder="搜索成就..."
          />
        </div>

        <div className="mt-8 achievement-console">
          {filteredAchievements.map(hit => {
            const phase = phaseForChapter(hit.chapterId);
            return (
              <Link
                key={hit.id}
                to={`/chapter/${hit.chapterId}?q=${encodeURIComponent(hit.achievement)}`}
                className="achievement-row spring-hover"
              >
                <span className="achievement-code" style={{ borderColor: phase.tone, color: phase.tone }}>
                  {hit.achievement}
                </span>
                <span className="achievement-main">
                  <strong>第 {hit.chapterId} 章 · {cleanTitle(hit.chapterTitle)}</strong>
                  <em>{hit.context}</em>
                </span>
                <span className="achievement-arrow">&rarr;</span>
              </Link>
            );
          })}
          {filteredAchievements.length === 0 && (
            <div className="empty-tool-state">没有匹配的成就引用。</div>
          )}
        </div>
      </section>

      <footer className="home-footer border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="footer-title">继续推进攻略正文</h2>
            <p className="footer-copy !mx-0">
              目录、研究树和成就入口已经集中在首页，章节页提供本章目录、搜索高亮和阅读进度。
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
