import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadChapter, chapterIndex } from '../../data/loadChapter';

interface SearchResult {
  chapterId: number;
  chapterTitle: string;
  matchText: string;
  sectionTitle?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const allContent = useRef<string[]>([]);

  // Load all chapter content on first open
  useEffect(() => {
    if (!isOpen || loaded) return;
    let cancelled = false;
    (async () => {
      const contents: string[] = [];
      for (const ch of chapterIndex) {
        if (cancelled) break;
        const c = await loadChapter(ch.id);
        if (c) {
          contents.push(JSON.stringify({ id: c.id, title: c.title, content: c.sections.map(s => s.content).join(' ') }));
        }
      }
      if (!cancelled) {
        allContent.current = contents;
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, loaded]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim() || !loaded) {
      setResults([]);
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

          // Get context around the match
          const start = Math.max(0, idx - 30);
          const end = Math.min(text.length, idx + q.length + 50);
          let matchText = text.slice(start, end);
          if (start > 0) matchText = '...' + matchText;
          if (end < text.length) matchText += '...';

          hits.push({
            chapterId: d.id,
            chapterTitle: d.title,
            matchText,
          });
        } catch {
          // skip parse errors
        }
      }
      setResults(hits.slice(0, 12));
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, loaded]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // If we have results, go to first one; otherwise navigate with query to chapter 1
      if (results.length > 0) {
        navigate(`/chapter/${results[0].chapterId}?q=${encodeURIComponent(query)}`);
      } else {
        navigate(`/chapter/1?q=${encodeURIComponent(query)}`);
      }
      onClose();
    }
  };

  const handleResultClick = (r: SearchResult) => {
    navigate(`/chapter/${r.chapterId}?q=${encodeURIComponent(query)}`);
    onClose();
  };

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
              onChange={e => setQuery(e.target.value)}
              placeholder="全局搜索章节内容..."
              className="w-full bg-transparent text-base outline-none placeholder:text-[var(--text-tertiary)]"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
            />
          </form>
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'var(--accent-light)', color: 'var(--accent-color)', border: '1px solid var(--border-accent)' }}
            >
              清空
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' as 'thin', scrollbarColor: 'rgba(124,92,240,0.18) transparent' }}>
          {!loaded && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>正在加载索引...</div>
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
              className="w-full text-left px-4 py-3 border-b transition-colors hover:opacity-80"
              style={{
                borderColor: 'var(--border-color)',
                background: 'transparent',
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
              <p className="text-xs truncate pl-1" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)' }}>
                {r.matchText}
              </p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 border-t flex items-center gap-3 text-xs"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
        >
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>ESC</kbd>
          <span>关闭</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold ml-2" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>&#9166;</kbd>
          <span>跳转</span>
          <span className="ml-auto" style={{ color: 'var(--text-disabled)' }}>
            {loaded ? `已索引 ${allContent.current.length} 章` : '加载中...'}
          </span>
        </div>
      </div>
    </div>
  );
}
