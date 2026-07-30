interface ProgressRingProps {
  percent: number; // 0-100, values above 100 clamp visually but the label can still show the real number
  colorClass: string; // stroke color, e.g. "stroke-brand-blue"
  size?: number;
  strokeWidth?: number;
}

// Small SVG ring used on dashboard stat cards — deliberately hand-rolled
// rather than a Recharts RadialBarChart: at ~56px there's no room for axes/
// legends/tooltips, just a track + an arc, so plain SVG stroke-dasharray is
// lighter and pixel-precise at this size.
export function ProgressRing({ percent, colorClass, size = 56, strokeWidth = 6 }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={colorClass}
      />
    </svg>
  );
}
