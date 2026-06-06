export function ScoreRing({ score, size = 120, label = '' }) {
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  const color = score >= 75 ? '#27ae60' : score >= 50 ? '#f39c12' : '#c0392b'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f1f1" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
      {label && <p className="text-sm text-gray-600 font-medium">{label}</p>}
    </div>
  )
}
