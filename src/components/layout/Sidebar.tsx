import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { loadChapter } from '../../data/loadChapter';
import { cleanTitle } from '../../utils/titleClean';
import { extractStudyTrees, extractAchievements, extractAutomatorScripts } from '../../data/extractTools';
import { getHideCompleted, setHideCompleted } from '../../utils/hideCompleted';

type SidebarChapter = {
  id: number;
  title: string;
  range?: string;
};

type SidebarSection = {
  id: string;
  title: string;
  marker?: string;
  label: string;
};

type SidebarPhase = {
  title: string;
  chapters: SidebarChapter[];
};

const SIDEBAR_PHASES: SidebarPhase[] = [
  {
    title: '无限阶段',
    chapters: [
      { id: 1, title: '无限', range: '10-1e308 AM' },
      { id: 2, title: '无限升级', range: '1-3e4 IP' },
      { id: 3, title: '打破无限', range: '3e4-5e11 IP' },
      { id: 4, title: '无限挑战', range: '5e11-1e140 IP' },
      { id: 5, title: '复制器', range: '1e140-1e308 IP' },
    ],
  },
  {
    title: '永恒阶段',
    chapters: [
      { id: 6, title: '早期永恒', range: '1-1e17 EP' },
      { id: 7, title: '早期永恒挑战', range: '130-330 TT' },
      { id: 8, title: '中期永恒挑战', range: '330-860 TT' },
      { id: 9, title: '后期永恒挑战', range: '860-12900 TT' },
    ],
  },
  {
    title: '时间膨胀',
    chapters: [
      { id: 10, title: '前期时间膨胀', range: '0-1e15 DT' },
      { id: 11, title: '后期时间膨胀', range: '1e2400-1e4300 DT' },
    ],
  },
  {
    title: '现实阶段',
    chapters: [
      { id: 12, title: '早期现实', range: '2-30 REAL' },
      { id: 13, title: '完成现实升级', range: '1e4-1e6 RM' },
    ],
  },
  {
    title: '天界层',
    chapters: [
      { id: 14, title: 'Cel1', range: '1e6-1e24 RM' },
      { id: 15, title: 'Cel2', range: '1e24-1e30 RM' },
      { id: 16, title: 'Cel3', range: '1e30-1e51 RM' },
      { id: 17, title: 'Cel4', range: '1e51-1e92 RM' },
      { id: 18, title: 'Cel5', range: '1e92-1e1000+1e9 iRM' },
      { id: 19, title: 'Cel6', range: '1e9-2e15 IM' },
      { id: 20, title: 'Cel7' },
    ],
  },
];

const ALL_PHASES = new Set(SIDEBAR_PHASES.map((_, index) => index));
const ALL_CHAPTERS = SIDEBAR_PHASES.flatMap(phase => phase.chapters);
const phaseColors = [
  'var(--phase-infinity)',
  'var(--phase-eternity)',
  'var(--phase-dilation)',
  'var(--phase-reality)',
  'var(--phase-celestial)',
];

function parseSectionTitle(title: string) {
  const match = title.trim().match(/^(\d+\.\d+)\s*(.*)$/);
  if (!match) return { label: title.trim() };
  return { marker: match[1], label: match[2].trim() };
}

export function Sidebar({ getStatus }: { getStatus: (id: number) => 'not-started' | 'in-progress' | 'completed' }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [hideCompleted, setHideCompletedLocal] = useState(getHideCompleted);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(ALL_PHASES);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(() => new Set());
  const [sectionMap, setSectionMap] = useState<Record<number, SidebarSection[]>>({});
  const [studyTreeCount, setStudyTreeCount] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);
  const [automatorCount, setAutomatorCount] = useState(0);
  const currentChapterId = Number(location.pathname.match(/\/chapter\/(\d+)/)?.[1] || 0);
  const activeSectionId = location.hash.slice(1);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '4.5rem' : '22.25rem');
  }, [collapsed]);

  // Sync hideCompleted across tabs/components
  useEffect(() => {
    const handler = () => setHideCompletedLocal(getHideCompleted());
    window.addEventListener('ad-hide-completed-changed', handler);
    return () => window.removeEventListener('ad-hide-completed-changed', handler);
  }, []);

  const toggleHide = () => {
    const next = !hideCompleted;
    setHideCompletedLocal(next);
    setHideCompleted(next);
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all(ALL_CHAPTERS.map(chapter => loadChapter(chapter.id))).then((chapters) => {
      if (cancelled) return;

      // Build section map
      const nextSections: Record<number, SidebarSection[]> = {};
      chapters.forEach((chapter) => {
        if (!chapter) return;
        nextSections[chapter.id] = chapter.sections
          .map((section, index) => ({
            id: `chapter-${chapter.id}-section-${index}`,
            title: section.title,
            ...parseSectionTitle(section.title),
          }))
          .filter(section => section.title.trim().length > 0);
      });
      setSectionMap(nextSections);

      // Extract study trees and achievements
      const validChapters = chapters.filter((c): c is NonNullable<typeof c> => Boolean(c));
      const trees = extractStudyTrees(validChapters);
      const achievements = extractAchievements(validChapters);
      setStudyTreeCount(trees.length);
      setAchievementCount(achievements.length);
      const automator = extractAutomatorScripts(validChapters);
      setAutomatorCount(automator.length);
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentChapterId) return;
    setExpandedChapters(prev => {
      if (prev.has(currentChapterId)) return prev;
      const next = new Set(prev);
      next.add(currentChapterId);
      return next;
    });
  }, [currentChapterId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
      else setCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (window.innerWidth < 1024 && location.pathname !== prevPathRef.current) {
      setCollapsed(true);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientX - touchStartX.current > 50) {
      setCollapsed(false);
    }
  };

  const togglePhase = (idx: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleChapter = (id: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {!collapsed && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-fade-in" onClick={() => setCollapsed(true)} />
      )}

      <aside className={`guide-sidebar ${collapsed ? 'is-collapsed' : 'is-expanded'}`}>
        <div className="guide-sidebar-brand">
          <Link to="/" className="guide-sidebar-logo" aria-label="返回首页">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer hex ring — atomic structure */}
              <path d="M14 2L26 8.5V21.5L14 28L2 21.5V8.5L14 2Z"
                stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" fill="none" />
              {/* Inner orbit ring 1 */}
              <ellipse cx="14" cy="14" rx="10" ry="4" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6"
                transform="rotate(-30 14 14)" fill="none" />
              {/* Inner orbit ring 2 */}
              <ellipse cx="14" cy="14" rx="10" ry="4" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"
                transform="rotate(30 14 14)" fill="none" />
              {/* Inner orbit ring 3 */}
              <ellipse cx="14" cy="14" rx="10" ry="4" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4"
                fill="none" />
              {/* Center core — antimatter nucleus */}
              <circle cx="14" cy="14" r="3.5" fill="rgba(255,255,255,0.95)" />
              <circle cx="14" cy="14" r="2" fill="rgba(124,92,240,0.6)" />
              {/* Orbiting electron dots */}
              <circle cx="22" cy="10" r="1" fill="rgba(255,255,255,0.8)" />
              <circle cx="6" cy="18" r="0.8" fill="rgba(255,255,255,0.6)" />
              <circle cx="18" cy="22" r="0.9" fill="rgba(255,255,255,0.7)" />
            </svg>
          </Link>
          {!collapsed && (
            <Link to="/" className="guide-sidebar-title">
              反物质维度攻略
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="guide-sidebar-collapse"
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {collapsed ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 4l4 4-4 4z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10 4L6 8l4 4z" />
              </svg>
            )}
          </button>
        </div>

        <nav className="guide-sidebar-scroll" aria-label="攻略章节目录">
          {collapsed ? (
            <>
              {/* Expand hint at top of collapsed sidebar */}
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="guide-sidebar-expand-hint"
                aria-label="展开侧边栏"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
                <span className="guide-sidebar-expand-hint-text">展开</span>
              </button>
              <div className="guide-sidebar-compact-list">
                {SIDEBAR_PHASES.flatMap(phase => phase.chapters).map(chapter => {
                  const status = getStatus(chapter.id);
                  const isActive = chapter.id === currentChapterId;
                  const isMarked = status === 'in-progress' || status === 'completed';
                  return (
                    <Link
                      key={chapter.id}
                      to={`/chapter/${chapter.id}`}
                      title={`${chapter.id}. ${chapter.title}${chapter.range ? ` (${chapter.range})` : ''}`}
                      className={`guide-sidebar-compact-link ${isActive ? 'is-active' : ''} ${isMarked ? 'is-marked' : ''}`}
                    >
                      {chapter.id}
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            SIDEBAR_PHASES.map((phase, phaseIndex) => {
              const isExpanded = expandedPhases.has(phaseIndex);
              return (
                <section key={phase.title} className="guide-sidebar-phase">
                  <button
                    type="button"
                    onClick={() => togglePhase(phaseIndex)}
                    className="guide-sidebar-phase-trigger"
                    style={{
                      borderLeft: `3px solid ${phaseColors[phaseIndex] || 'var(--border-color)'}`,
                    }}
                  >
                    <span>{phase.title}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className={isExpanded ? 'is-expanded' : ''}
                    >
                      <path d="M4.5 6 8 9.5 11.5 6z" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="guide-sidebar-chapters">
                      {phase.chapters
                        .filter(chapter => !hideCompleted || getStatus(chapter.id) !== 'completed')
                        .map(chapter => {
                        const status = getStatus(chapter.id);
                        const isActive = chapter.id === currentChapterId;
                        const isMarked = status === 'in-progress' || status === 'completed';
                        const sections = sectionMap[chapter.id] ?? [];
                        const hasSections = sections.length > 0;
                        const isChapterExpanded = expandedChapters.has(chapter.id);
                        return (
                          <div key={chapter.id} className={`guide-sidebar-chapter ${isActive ? 'is-current' : ''}`}>
                            <div className="guide-sidebar-chapter-row">
                              <Link
                                to={`/chapter/${chapter.id}`}
                                className={`guide-sidebar-link ${isActive ? 'is-active' : ''} ${isMarked ? 'is-marked' : ''}`}
                              >
                                <span className="guide-sidebar-index">{chapter.id}</span>
                                <span className="guide-sidebar-link-text">
                                  <span className="guide-sidebar-chapter-title">{chapter.title}</span>
                                  {chapter.range && <span className="guide-sidebar-range">（{chapter.range}）</span>}
                                </span>
                              </Link>
                              {hasSections && (
                                <button
                                  type="button"
                                  className={`guide-sidebar-chapter-toggle ${isChapterExpanded ? 'is-expanded' : ''}`}
                                  onClick={() => toggleChapter(chapter.id)}
                                  aria-label={`${isChapterExpanded ? '收起' : '展开'}${chapter.title}小节`}
                                >
                                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4.5 6 8 9.5 11.5 6z" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {hasSections && isChapterExpanded && (
                              <div className="guide-sidebar-sections">
                                {sections.map(section => {
                                  const sectionActive = isActive && activeSectionId === section.id;
                                  return (
                                    <Link
                                      key={section.id}
                                      to={`/chapter/${chapter.id}#${section.id}`}
                                      className={`guide-sidebar-section-link ${sectionActive ? 'is-active' : ''}`}
                                    >
                                      {section.marker && <span className="guide-sidebar-section-marker">小节 {section.marker}</span>}
                                      <span className="guide-sidebar-section-title">{section.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </nav>

        {/* Tool panels — study trees & achievements (navigate to full pages) */}
        {!collapsed && (
          <div className="guide-sidebar-tool-panels">
            {/* Hide completed toggle */}
            <button
              type="button"
              onClick={toggleHide}
              className="guide-sidebar-tool-opener"
            >
              <span className="guide-sidebar-tool-opener-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4l4 4 4-4M2 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="guide-sidebar-tool-opener-label">
                {hideCompleted ? '显示已完成' : '隐藏已完成'}
              </span>
              <svg className="guide-sidebar-tool-opener-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Study Trees — full page */}
            <Link
              to="/tools/study-trees"
              className="guide-sidebar-tool-opener"
            >
              <span className="guide-sidebar-tool-opener-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 2v10M3 6l4 4 4-4M3 10l4 2 4-2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="guide-sidebar-tool-opener-label">时间研究树</span>
              <span className="guide-sidebar-tool-opener-count">{studyTreeCount}</span>
              <svg className="guide-sidebar-tool-opener-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>

            {/* Achievements — full page */}
            <Link
              to="/tools/achievements"
              className="guide-sidebar-tool-opener"
            >
              <span className="guide-sidebar-tool-opener-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 1l2 4 4.5.6-3.3 3.2.8 4.2L7 11.5l-4 2.5.8-4.2L.5 5.6 5 5l2-4z" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="guide-sidebar-tool-opener-label">成就检索</span>
              <span className="guide-sidebar-tool-opener-count">{achievementCount}</span>
              <svg className="guide-sidebar-tool-opener-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>

            {/* Automator */}
            <Link
              to="/tools/automator"
              className="guide-sidebar-tool-opener"
            >
              <span className="guide-sidebar-tool-opener-icon">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 3l4 4-4 4M2 1v12M12 1v12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="guide-sidebar-tool-opener-label">自动机脚本</span>
              <span className="guide-sidebar-tool-opener-count">{automatorCount}</span>
              <svg className="guide-sidebar-tool-opener-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        )}

        {!collapsed && (
          <div className="guide-sidebar-tools" aria-label="工具入口">
            <Link to="/glossary" className="guide-sidebar-tool-link">
              <span className="guide-sidebar-tool-icon">&Sigma;</span>
              <span>术语表</span>
            </Link>
          </div>
        )}
      </aside>

      {collapsed && (
        <div className="fixed left-0 top-0 w-5 h-full z-30 lg:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="sidebar-expand-btn"
          aria-label="展开侧边栏"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 5l5 5-5 5" />
          </svg>
        </button>
      )}
    </>
  );
}
