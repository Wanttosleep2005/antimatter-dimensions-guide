interface StudyPathBlockProps {
  path: string[];
}

export function StudyPathBlock({ path }: StudyPathBlockProps) {
  return (
    <div className="highlight-box flex items-center gap-2 flex-wrap">
      {path.map((step, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--accent-color)]">{step}</span>
          {i < path.length - 1 && <span className="text-[var(--text-tertiary)]">→</span>}
        </span>
      ))}
    </div>
  );
}
