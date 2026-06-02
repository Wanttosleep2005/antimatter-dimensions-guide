import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Chapter } from '../../types';
import { ReadingProgress } from '../progress/ReadingProgress';
import { PurchasePanel } from './PurchasePanel';
import { highlightTerms } from '../../utils/highlightTerms';
import { injectGlossaryTooltips } from '../../utils/glossaryTooltips';
import { toggleBookmark, isBookmarked } from '../../utils/bookmarks';
import { useScrollFade } from '../../hooks/useScrollFade';

interface GuideContentProps {
  chapter: Chapter;
  chapterId: number;
  status: 'not-started' | 'in-progress' | 'completed';
  onStatusChange: (s: 'not-started' | 'in-progress' | 'completed') => void;
  fontSize: number;
  onFontSizeChange: (v: number) => void;
  totalChapters: number;
  searchQuery?: string;
}

type TocItem = {
  id: string;
  title: string;
  level: 2 | 3;
  marker?: string;
  label?: string;
};

function isPageMarker(text: string) {
  return /^---\s*Page\s+\d+\s*---$/i.test(text.trim()) || /^Page\s+\d+$/i.test(text.trim());
}

function parseSectionTitle(title: string) {
  const match = title.trim().match(/^(\d+\.\d+)\s*(.*)$/);
  if (!match) return { label: title.trim(), display: title.trim() };
  const marker = match[1];
  const label = match[2].trim();
  return { marker, label, display: `小节 ${marker} · ${label}` };
}

export function GuideContent({ chapter, chapterId, status, onStatusChange, fontSize, onFontSizeChange, totalChapters, searchQuery }: GuideContentProps) {
  const location = useLocation();
  useScrollFade({ fadeDistance: 320, minScale: 0.82 });
  const prevChapter = chapterId > 1 ? chapterId - 1 : null;
  const nextChapter = chapterId < totalChapters ? chapterId + 1 : null;

  // ── Scroll position persistence ──
  const SCROLL_KEY = `ad-scroll-pos-${chapterId}`;
  const savedScroll = useRef<number | null>(null);
  const [showResume, setShowResume] = useState(false);

  // Load saved position
  useEffect(() => {
    if (searchQuery || location.hash) {
      savedScroll.current = null;
      setShowResume(false);
      return;
    }
    try {
      const raw = localStorage.getItem(SCROLL_KEY);
      if (raw) {
        const pos = parseInt(raw);
        if (pos > 100) {
          savedScroll.current = pos;
          setShowResume(true);
        }
      }
    } catch { /* ignore */ }
  }, [chapterId, SCROLL_KEY, searchQuery, location.hash]);

  // Save on unload/scroll throttle
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const savePos = () => {
      localStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    const onScroll = () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(savePos, 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      savePos(); // final save on unmount
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [SCROLL_KEY]);

  const resumeScroll = useCallback(() => {
    if (savedScroll.current) {
      window.scrollTo({ top: savedScroll.current, behavior: 'smooth' });
      setShowResume(false);
      savedScroll.current = null;
    }
  }, []);

  // Estimate reading time
  const readingTime = (() => {
    const totalText = chapter.sections.flatMap(s => s.content).join(' ');
    const wordCount = totalText.length;
    const minutes = Math.max(1, Math.ceil(wordCount / 500));
    return minutes;
  })();
  const tocItems = chapter.sections.flatMap((section, i) => {
    const sectionId = `chapter-${chapterId}-section-${i}`;
    const sectionTitle = parseSectionTitle(section.title);
    const items: TocItem[] = section.title ? [{ id: sectionId, title: sectionTitle.display, level: 2, marker: sectionTitle.marker, label: sectionTitle.label }] : [];

    section.content.forEach((text, j) => {
      if (text.startsWith('## ')) {
        items.push({ id: `${sectionId}-sub-${j}`, title: text.slice(3), level: 3 });
      }
    });

    return items;
  });

  useEffect(() => {
    if (!searchQuery) return;
    const timeout = window.setTimeout(() => {
      document.querySelector('mark.search-highlight-first')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, chapterId]);

  useEffect(() => {
    if (!location.hash || searchQuery) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const timeout = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [chapterId, location.hash, searchQuery]);

  return (
    <>
      <ReadingProgress />

      {/* Chapter header */}
      <div className="chapter-header text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-5">
          <span
            className="chapter-kicker px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent-color)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {String(chapterId).padStart(2, '0')} / {String(totalChapters).padStart(2, '0')}
          </span>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--border-color)',
            }}
          >
            ~{readingTime} min
          </span>
        </div>
        <h1
          className="chapter-title text-3xl lg:text-4xl font-bold mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {chapter.title}
        </h1>
        {chapter.description.map((d, i) => (
          <p
            key={i}
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {d}
          </p>
        ))}

        {/* Status toggle */}
        <div className="chapter-status-tabs mt-6 flex items-center justify-center gap-2">
          {(['not-started', 'in-progress', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 press-spring
                ${status === s
                  ? s === 'completed' ? 'badge-success'
                  : s === 'in-progress' ? 'badge-warning'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] border border-transparent'}`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {s === 'completed' ? '\u2713 已完成' : s === 'in-progress' ? '\u25CF 进行中' : '\u25CB 未开始'}
            </button>
          ))}
        </div>
      </div>

      {/* Resume reading toast */}
      {showResume && (
        <div className="flex justify-center mb-10 animate-fade-in-up">
          <button
            onClick={resumeScroll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent-color)',
              border: '1px solid var(--border-accent)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2v10l5-3.5L12 12V2L7 5.5 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            回到上次阅读位置
          </button>
        </div>
      )}

      {/* Font size controls */}
      <div className="chapter-font-controls flex items-center justify-center gap-2 mb-12">
        <button
          onClick={() => onFontSizeChange(Math.max(-4, fontSize - 1))}
          className="w-9 h-9 rounded-xl flex items-center justify-center border text-xs font-medium transition-all duration-200 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] press-spring"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          A-
        </button>
        <span
          className="text-xs w-10 text-center font-medium"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
        >
          {fontSize > 0 ? '+' : ''}{fontSize}
        </span>
        <button
          onClick={() => onFontSizeChange(Math.min(8, fontSize + 1))}
          className="w-9 h-9 rounded-xl flex items-center justify-center border text-xs font-medium transition-all duration-200 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] press-spring"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          A+
        </button>
      </div>

      {/* Inline TOC — horizontal pills under the title */}
      {tocItems.length > 0 && (
        <nav className="chapter-toc-inline" aria-label="本章目录">
          {tocItems.map((item, index) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`chapter-toc-pill ${item.level === 3 ? 'chapter-toc-pill-sub' : ''}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {item.marker ? (
                <>
                  <span className="chapter-toc-pill-marker">{item.marker}</span>
                  <span className="chapter-toc-pill-label">{item.label}</span>
                </>
              ) : (
                item.title
              )}
            </a>
          ))}
        </nav>
      )}

      {/* Purchase hints — collapsible panel */}
      <PurchasePanel chapter={chapter} />

      <div className="chapter-reading-layout">
        <div className="guide-content">
          {chapter.sections.map((section, i) => {
            const sectionId = `chapter-${chapterId}-section-${i}`;
            const sectionTitle = parseSectionTitle(section.title);
            return (
              <section key={i} className="guide-section">
                {section.title && (
                  <h2 id={sectionId} className="guide-section-heading">
                    {sectionTitle.marker && <span className="guide-section-marker">小节 {sectionTitle.marker}</span>}
                    <span className="guide-section-title-text" dangerouslySetInnerHTML={{ __html: injectGlossaryTooltips(highlightTerms(sectionTitle.label, searchQuery)) }} />
                    <button
                      type="button"
                      className={`guide-section-bookmark ${isBookmarked(sectionId) ? 'is-active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleBookmark({
                          chapterId,
                          chapterTitle: chapter.title,
                          sectionId,
                          sectionTitle: sectionTitle.label,
                          savedAt: new Date().toISOString(),
                        });
                        // Force re-render by toggling internal state
                        (e.currentTarget as HTMLButtonElement).classList.toggle('is-active');
                      }}
                      aria-label={isBookmarked(sectionId) ? '取消书签' : '添加书签'}
                      title={isBookmarked(sectionId) ? '取消书签' : '添加书签'}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill={isBookmarked(sectionId) ? 'var(--accent-color)' : 'none'} stroke="currentColor" strokeWidth="1.5">
                        <path d="M10.5 2H3.5a.5.5 0 0 0-.5.5v10l4-2.5 4 2.5v-10a.5.5 0 0 0-.5-.5z" />
                      </svg>
                    </button>
                  </h2>
                )}
                {section.content.map((text, j) => {
                  if (isPageMarker(text)) return null;
                  if (text.startsWith('## ')) {
                    return <h3 key={j} id={`${sectionId}-sub-${j}`} dangerouslySetInnerHTML={{ __html: injectGlossaryTooltips(highlightTerms(text.slice(3), searchQuery)) }} />;
                  }
                  if (text.startsWith('> ')) {
                    return <blockquote key={j} className="highlight-box" dangerouslySetInnerHTML={{ __html: injectGlossaryTooltips(highlightTerms(text.slice(2), searchQuery)) }} />;
                  }
                  return <p key={j} dangerouslySetInnerHTML={{ __html: injectGlossaryTooltips(highlightTerms(text, searchQuery)) }} />;
                })}
              </section>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div
        className="flex items-center justify-between mt-16 pt-6 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {prevChapter ? (
          <Link
            to={`/chapter/${prevChapter}`}
            className="text-sm font-semibold px-4 py-2 rounded-xl border transition-all duration-200 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] press-spring"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            &larr; 上一章
          </Link>
        ) : <div />}

        <div className="flex items-center gap-3">
          {status !== 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange('completed')}
              className="text-sm font-semibold px-5 py-2 rounded-xl border transition-all duration-200 hover:scale-105 press-spring"
              style={{
                borderColor: 'var(--success)',
                color: 'var(--success)',
                background: 'var(--success-bg)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              &#10003; 标记完成
            </button>
          )}
          {status === 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange('not-started')}
              className="text-sm font-semibold px-5 py-2 rounded-xl border transition-all duration-200 hover:scale-105"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              撤销完成
            </button>
          )}
          <Link
            to="/"
            className="text-sm font-medium transition-colors hover:text-[var(--accent-color)]"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-heading)' }}
          >
            目录
          </Link>
        </div>
        {nextChapter ? (
          <Link
            to={`/chapter/${nextChapter}`}
            className="text-sm font-semibold px-4 py-2 rounded-xl border transition-all duration-200 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] press-spring"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            下一章 &rarr;
          </Link>
        ) : <div />}
      </div>
    </>
  );
}
