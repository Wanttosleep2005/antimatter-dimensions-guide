interface RuneHintProps {
  rune: string;
  children?: React.ReactNode;
}

export function RuneHint({ rune, children }: RuneHintProps) {
  return (
    <span className="rune-spec" title={rune}>
      {children || rune}
    </span>
  );
}
