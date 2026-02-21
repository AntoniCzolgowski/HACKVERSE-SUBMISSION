interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const level = score >= 0.8 ? "high" : score >= 0.6 ? "mid" : "low";
  const label = score >= 0.8 ? "High" : score >= 0.6 ? "Medium" : "Low";
  const dot = score >= 0.8 ? "\ud83d\udfe2" : score >= 0.6 ? "\ud83d\udfe1" : "\ud83d\udd34";

  return (
    <span className={`score-badge score-${level}`}>
      {dot} {(score * 100).toFixed(0)}% {label}
    </span>
  );
}
