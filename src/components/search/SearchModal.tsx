import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  chapterId: number;
  chapterTitle: string;
  matchText: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Highlight matched query terms within text, returning JSX.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        style={{
          background: 'rgba(124,92,240,0.25)',
          color: 'var(--accent-color)',
          fontWeight: 700,
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ad-search-history') || '[]');
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const allContent = useRef<string[]>([]);

  // Load all chapter content on first open
  useEffect(() => {
    if (!isOpen || loaded) return;
    let cancelled = false;
    (async () => {
      const { loadChapter, chapterIndex } = await import('../../data/loadChapter');
      const contents: string[] = [];
      for (const ch of chapterIndex) {
        if (cancelled) break;
        const c = await loadChapter(ch.id);
        if (c) {
          contents.push(
            JSON.stringify({
              id: c.id,
              title: c.title,
              content: c.sections.map((s) => s.content).join(' '),
            }),
          );
        }
      }
      if (!cancelled) {
        allContent.current = contents;
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, loaded]);

  // Search when query changes (debounced)
  useEffect(() => {
    if (!query.trim() || !loaded) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      const q = query.toLowerCase();
      const hits: SearchResult[] = [];
      for (const raw of allContent.current) {
        try {
          const d = JSON.parse(raw);
          const text = (d.title + ' ' + d.content).toLowerCase();
          let idx = text.indexOf(q);
          if (idx === -1) continue;

          const start = Math.max(0, idx - 30);
          const end = Math.min(text.length, idx + q.length + 50);
          let matchText = text.slice(start, end);
          if (start > 0) matchText = '...' + matchText;
          if (end < text.length) matchText += '...';

          hits.push({ chapterId: d.id, chapterTitle: d.title, matchText });
        } catch {
          // skip parse errors
        }
      }
      setResults(hits.slice(0, 12));
      setActiveIndex(hits.length > 0 ? 0 : -1);
      setSearching(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, loaded]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard handler: ESC close, Enter jump, arrows navigate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleResultClick(results[activeIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, results, activeIndex, onClose]); // eslint-disable-line

  // Scroll active result into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const handleResultClick = (r: SearchResult) => {
    // Save to search history
    const q = query.trim();
    if (q) {
      const updated = [q, ...searchHistory.filter((s) => s !== q)].slice(0, 8);
      setSearchHistory(updated);
      localStorage.setItem('ad-search-history', JSON.stringify(updated));
    }
    navigate(`/chapter/${r.chapterId}?q=${encodeURIComponent(q)}`);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (results.length > 0 && activeIndex >= 0) {
      handleResultClick(results[activeIndex]);
    } else if (results.length > 0) {
      handleResultClick(results[0]);
    } else {
      navigate(`/chapter/1?q=${encodeURIComponent(q)}`);
      onClose();
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('ad-search-history');
  };

  const showHistory = !query.trim() && searchHistory.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-xl mx-4 rounded-xl overflow-hidden animate-scale-in"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 0 60px rgba(124,92,240,0.10), 0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-color)" strokeWidth="2" className="shrink-0">
            <circle cx="8" cy="8" r="6" />
            <path d="M12.5 12.5L16 16" />
          </svg>
          <form onSubmit={handleSubmit} className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="全局搜索章节内容..."
              className="w-full bg-transparent text-base outline-none placeholder:text-[var(--text-tertiary)]"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
            />
          </form>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'var(--accent-light)', color: 'var(--accent-color)', border: '1px solid var(--border-accent)' }}
            >
              清空
            </button>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto"
          style={{ scrollbarWidth: 'thin' as 'thin', scrollbarColor: 'rgba(124,92,240,0.18) transparent' }}
        >
          {!loaded && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>正在加载索引...</div>
          )}

          {/* Search history (empty query) */}
          {showHistory && loaded && (
            <div>
              <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>最近搜索</span>
                <button onClick={clearHistory} style={{ color: 'var(--text-disabled)' }} className="hover:text-[var(--text-tertiary)]">清除</button>
              </div>
              {searchHistory.map((h, i) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setQuery(h)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--sidebar-hover)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)' }}>
                    <path d="M2 6a4 4 0 1 1 6.45 2.64" strokeLinecap="round" />
                    <path d="M5 2v4l3 1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {h}
                </button>
              ))}
            </div>
          )}

          {loaded && query.trim() && searching && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>搜索中...</div>
          )}

          {loaded && query.trim() && !searching && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>未找到匹配的章节内容</div>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.chapterId}-${i}`}
              type="button"
              onClick={() => handleResultClick(r)}
              onMouseEnter={() => setActiveIndex(i)}
              className="w-full text-left px-4 py-3 border-b transition-colors"
              style={{
                borderColor: 'var(--border-color)',
                background: i === activeIndex ? 'rgba(124,92,240,0.08)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--accent-light)',
                    color: 'var(--accent-color)',
                  }}
                >
                  Ch{r.chapterId}
                </span>
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {r.chapterTitle}
                </span>
              </div>
              <p
                className="text-xs truncate pl-1"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}
              >
                {highlightMatch(r.matchText, query)}
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 border-t flex items-center gap-3 text-xs"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
        >
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>&uarr;&darr;</kbd>
          <span>导航</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold ml-2" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>&#9166;</kbd>
          <span>跳转</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold ml-2" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>ESC</kbd>
          <span>关闭</span>
          <span className="ml-auto" style={{ color: 'var(--text-disabled)' }}>
            {loaded ? `已索引 ${allContent.current.length} 章` : '加载中...'}
          </span>
        </div>
      </div>
    </div>
  );
}
