import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Chapter } from '../../types';
import { ReadingProgress } from '../progress/ReadingProgress';
import { highlightTerms } from '../../utils/highlightTerms';
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
                    <span className="guide-section-title-text" dangerouslySetInnerHTML={{ __html: highlightTerms(sectionTitle.label, searchQuery) }} />
                  </h2>
                )}
                {section.content.map((text, j) => {
                  if (isPageMarker(text)) return null;
                  if (text.startsWith('## ')) {
                    return <h3 key={j} id={`${sectionId}-sub-${j}`} dangerouslySetInnerHTML={{ __html: highlightTerms(text.slice(3), searchQuery) }} />;
                  }
                  if (text.startsWith('> ')) {
                    return <blockquote key={j} className="highlight-box" dangerouslySetInnerHTML={{ __html: highlightTerms(text.slice(2), searchQuery) }} />;
                  }
                  return <p key={j} dangerouslySetInnerHTML={{ __html: highlightTerms(text, searchQuery) }} />;
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
        <Link
          to="/"
          className="text-sm font-medium transition-colors hover:text-[var(--accent-color)]"
          style={{
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-heading)',
          }}
        >
          目录
        </Link>
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
