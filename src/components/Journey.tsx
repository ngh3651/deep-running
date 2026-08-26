import { journey, kmLabel } from '../lib/calc'
import { MILESTONES } from '../lib/constants'

export default function Journey({ totalKm }: { totalKm: number }) {
  const j = journey(totalKm)

  return (
    <section className="card journey">
      <p className="card-label">가상 종주</p>

      <ol className="jr-list">
        {MILESTONES.map((m, i) => {
          const done = i <= j.currentIndex
          return (
            <li className={`jr${done ? ' done' : ''}`} key={m.km}>
              <span className="jr-dot">{done ? '✓' : ''}</span>
              <span className="jr-place">{m.place}</span>
              <span className="jr-km">{m.km}km</span>

              {i === j.currentIndex && j.next && (
                <div className="jr-now">
                  <div className="jr-bar">
                    <span style={{ width: `${(j.progress * 100).toFixed(1)}%` }} />
                  </div>
                  <p className="jr-note">
                    {j.next.emoji} {j.next.place}까지 <b>{kmLabel(j.remainKm)}km</b> 남았어요 ·{' '}
                    {Math.round(j.progress * 100)}%
                  </p>
                  {j.next.reward && <p className="jr-reward">다음 보상 — {j.next.reward}</p>}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
