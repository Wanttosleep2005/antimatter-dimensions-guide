interface ProgressBarProps {
  completed: number;
  total: number;
  inProgress: number;
}

export function ProgressBar({ completed, total, inProgress }: ProgressBarProps) {
  const pct = Math.round((completed / total) * 100);
  const inProgressPct = Math.round((inProgress / total) * 100);

  return (
    <div>
      <div
        className="flex items-center justify-between text-xs mb-2 tracking-wider"
        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
      >
        <span>阅读进度</span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden flex"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--success), #2dd4bf)',
            boxShadow: '0 0 10px rgba(52,211,153,0.3)',
            borderRadius: 'inherit',
          }}
        />
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{
            width: `${inProgressPct}%`,
            background: 'linear-gradient(90deg, var(--warning), #f59e0b)',
            boxShadow: '0 0 10px rgba(251,191,36,0.3)',
            borderRadius: 'inherit',
          }}
        />
      </div>
    </div>
  );
}
