import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/chapter/1?q=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 p-5 rounded-2xl animate-scale-in"
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--glass-border-strong)',
          boxShadow: '0 0 60px rgba(130,80,230,0.15), 0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 18 18"
            fill="none"
            stroke="var(--accent-color)"
            strokeWidth="2"
            className="shrink-0"
          >
            <circle cx="8" cy="8" r="6" />
            <path d="M12.5 12.5L16 16" />
          </svg>
          <form onSubmit={handleSubmit} className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索章节内容..."
              className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--text-tertiary)]"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
              }}
            />
          </form>
        </div>
        <div
          className="mt-4 pt-3 flex items-center gap-3 text-xs border-t"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
        >
          <kbd
            className="px-2 py-1 rounded-lg text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ESC
          </kbd>
          <span>关闭</span>
          <kbd
            className="px-2 py-1 rounded-lg text-[11px] font-medium ml-2"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            &#9166;
          </kbd>
          <span>搜索</span>
        </div>
      </div>
    </div>
  );
}
