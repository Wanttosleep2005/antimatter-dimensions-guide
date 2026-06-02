import { useState, useMemo, useRef, useEffect } from 'react';
import { glossaryTerms } from '../data/glossary';

const CATEGORIES = [...new Set(glossaryTerms.map(t => t.category))];

export function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const filtered = useMemo(() => {
    let terms = glossaryTerms;
    if (activeCategory) {
      terms = terms.filter(t => t.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      terms = terms.filter(t =>
        t.term.toLowerCase().includes(q) ||
        t.fullName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return terms;
  }, [query, activeCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 breathe-glow"
          style={{ background: 'var(--accent-light)' }}
        >
          <span
            className="text-2xl font-bold"
            style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-mono)' }}
          >
            &Sigma;
          </span>
        </div>
        <h1
          className="text-3xl md:text-4xl font-bold text-gradient mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          术语速查
        </h1>
        <p className="text-sm max-w-md mx-auto mb-8" style={{ color: 'var(--text-tertiary)' }}>
          反物质维度游戏缩写、机制术语与中文解释 · 共 {glossaryTerms.length} 条
        </p>

        {/* Search bar */}
        <div className="relative max-w-md mx-auto mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索术语、全称或解释..."
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm outline-none transition-all focus:border-[var(--border-accent)] focus:shadow-[0_0_0_3px_rgba(124,92,240,0.06)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent-light)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l8 8M9 1L1 9" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !activeCategory
                ? 'bg-[var(--accent-light)] text-[var(--accent-color)] border border-[var(--border-accent)]'
                : 'text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]'
            }`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            全部
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                cat === activeCategory
                  ? 'bg-[var(--accent-light)] text-[var(--accent-color)] border border-[var(--border-accent)]'
                  : 'text-[var(--text-tertiary)] border border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]'
              }`}
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20 mb-4">
            <circle cx="20" cy="20" r="15"/><path d="M14 20h12M20 14v12" strokeLinecap="round"/>
          </svg>
          <p className="text-sm">没有找到匹配的术语</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((term, i) => (
            <div
              key={`${term.term}-${i}`}
              className="card-premium p-5 group"
              style={{
                animation: `fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both`,
                animationDelay: `${i * 30}ms`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg"
                  style={{
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent-color)',
                  }}
                >
                  {term.term}
                </span>
                <span
                  className="text-[10px] uppercase tracking-widest font-semibold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {term.category}
                </span>
              </div>
              <div
                className="text-sm font-semibold mb-1.5 transition-colors group-hover:text-[var(--accent-color)]"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
              >
                {term.fullName}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {term.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
