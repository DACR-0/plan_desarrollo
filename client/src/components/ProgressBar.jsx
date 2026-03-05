export default function ProgressBar({ value = 0, showLabel = true, size = 'md' }) {
  const pct = Math.min(Math.max(parseFloat(value) || 0, 0), 100);
  const color = pct >= 90 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className="w-full">
      <div className={`progress-bar-track ${height}`}>
        <div
          className={`progress-bar-fill ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 mt-0.5">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}
