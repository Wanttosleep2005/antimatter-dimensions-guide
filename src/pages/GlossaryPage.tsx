import { glossaryTerms } from '../data/glossary';

export function GlossaryPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-12">
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
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          反物质维度游戏缩写、机制术语与中文解释
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {glossaryTerms.map((term, i) => (
          <div
            key={i}
            className="card-premium p-5 group"
            style={{
              animation: `fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both`,
              animationDelay: `${i * 40}ms`,
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
    </div>
  );
}
