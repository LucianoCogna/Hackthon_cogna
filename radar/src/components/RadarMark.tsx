/** Ícone do RADAR (anéis + varredura animada). Usado no menu e no login. */
export function RadarMark({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="10" fill="none" stroke={color} strokeWidth="1.5" opacity=".45" />
      <circle cx="16" cy="16" r="5" fill="none" stroke={color} strokeWidth="1.5" opacity=".7" />
      <g className="radar-sweep">
        <path d="M16 16 L16 5 A11 11 0 0 1 25 10 Z" fill={color} opacity=".28" />
        <path d="M16 16 L25 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="16" cy="16" r="1.8" fill={color} />
    </svg>
  );
}
