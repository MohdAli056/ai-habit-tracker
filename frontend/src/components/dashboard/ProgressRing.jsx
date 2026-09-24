/**
 * ProgressRing — circular progress visualization.
 *
 * Handles:
 *   - zero habits (0%)
 *   - zero completions (0%)
 *   - all completed (100%)
 */

export function ProgressRing({
  completed = 0,
  total = 0,
  size = 110,
  strokeWidth = 9,
  className = '',
}) {
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`progress-ring-container ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Today's progress: ${completed} of ${total} completed (${percentage}%)`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring-svg">
        {/* Background track */}
        <circle
          className="progress-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <circle
          className="progress-ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="progress-ring-content">
        <span className="progress-ring-pct">{percentage}%</span>
        <span className="progress-ring-sub">done</span>
      </div>
    </div>
  );
}

export default ProgressRing;
