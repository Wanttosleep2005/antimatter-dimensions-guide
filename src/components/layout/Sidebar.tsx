import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProgress } from '../../hooks/useProgress';
import { loadChapter } from '../../data/loadChapter';

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

function parseSectionTitle(title: string) {
  const match = title.trim().match(/^(\d+\.\d+)\s*(.*)$/);
  if (!match) return { label: title.trim() };
  return { marker: match[1], label: match[2].trim() };
}

export function Sidebar() {
  const location = useLocation();
  const { getStatus } = useProgress();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(ALL_PHASES);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(() => new Set());
  const [sectionMap, setSectionMap] = useState<Record<number, SidebarSection[]>>({});
  const currentChapterId = Number(location.pathname.match(/\/chapter\/(\d+)/)?.[1] || 0);
  const activeSectionId = location.hash.slice(1);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '4.5rem' : '22.25rem');
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;

    Promise.all(ALL_CHAPTERS.map(chapter => loadChapter(chapter.id))).then((chapters) => {
      if (cancelled) return;
      const next: Record<number, SidebarSection[]> = {};
      chapters.forEach((chapter) => {
        if (!chapter) return;
        next[chapter.id] = chapter.sections
          .map((section, index) => ({
            id: `chapter-${chapter.id}-section-${index}`,
            title: section.title,
            ...parseSectionTitle(section.title),
          }))
          .filter(section => section.title.trim().length > 0);
      });
      setSectionMap(next);
    });

    return () => {
      cancelled = true;
    };
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
            <span>&infin;</span>
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
          ) : (
            SIDEBAR_PHASES.map((phase, phaseIndex) => {
              const isExpanded = expandedPhases.has(phaseIndex);
              return (
                <section key={phase.title} className="guide-sidebar-phase">
                  <button
                    type="button"
                    onClick={() => togglePhase(phaseIndex)}
                    className="guide-sidebar-phase-trigger"
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
                      {phase.chapters.map(chapter => {
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

        {!collapsed && (
          <div className="guide-sidebar-tools" aria-label="工具入口">
            <Link to="/glossary" className="guide-sidebar-tool-link">
              <span className="guide-sidebar-tool-icon">&Sigma;</span>
              <span>术语表</span>
            </Link>
            <Link to="/#achievements" className="guide-sidebar-tool-link">
              <span className="guide-sidebar-tool-icon">r</span>
              <span>成就检索</span>
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
          className="fixed bottom-5 left-5 z-40 lg:hidden w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-transform hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, var(--accent-color), #a78bfa)',
            boxShadow: '0 4px 20px rgba(130,80,230,0.45)',
          }}
          aria-label="打开导航"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      )}
    </>
  );
}
