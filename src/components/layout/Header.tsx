import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex justify-center px-4 py-3">
      {/* Floating glass pill */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-panel glass-deep"
        style={{
          borderColor: 'var(--glass-border-strong)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(150,120,255,0.06)',
        }}
      >
        {/* Logo icon */}
        <Link
          to="/"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 hover:scale-105 transition-transform"
          style={{
            background: 'linear-gradient(135deg, var(--accent-color), #a78bfa)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          &infin;
        </Link>

        {/* Title — hidden on mobile */}
        <Link
          to="/"
          className="text-sm font-medium hidden sm:block mr-1 hover:text-[var(--accent-color)] transition-colors"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}
        >
          反物质维度攻略
        </Link>

        {/* Divider */}
        <div className="w-px h-5 mx-1 hidden sm:block" style={{ background: 'var(--border-color)' }} />

        {/* Nav links — hidden on mobile */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            to="/tools/study-trees"
            className="px-2 py-1 rounded-lg text-xs font-semibold hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-heading)' }}
          >
            研究树
          </Link>
          <Link
            to="/tools/achievements"
            className="px-2 py-1 rounded-lg text-xs font-semibold hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-heading)' }}
          >
            成就
          </Link>
          <Link
            to="/glossary"
            className="px-2 py-1 rounded-lg text-xs font-semibold hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-heading)' }}
          >
            术语表
          </Link>
        </nav>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />

        {/* Search button */}
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-lg transition-all duration-200 hover:bg-[var(--bg-tertiary)] flex items-center gap-1.5"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="搜索"
          title="搜索 Ctrl+K"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6" />
            <path d="M12.5 12.5L16 16" />
          </svg>
          <kbd
            className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-disabled)' }}
          >
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
}
