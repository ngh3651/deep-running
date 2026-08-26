export default function StatBig({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="stat">
      <p className="stat-value big-num">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </p>
      <p className="stat-label">{label}</p>
    </div>
  )
}
