import { useState } from 'react'
import { dateLabel, durationLabel, kmLabel, paceLabel } from '../lib/calc'
import type { Run } from '../lib/supabase'

export type FeedRun = Run & { members: { name: string; emoji: string } | null }

export default function RunCard({ run }: { run: FeedRun }) {
  const [zoom, setZoom] = useState(false)

  return (
    <article className="card run">
      <header className="run-head">
        <span className="run-who">
          <span className="run-emoji">{run.members?.emoji ?? '🏃'}</span>
          {run.members?.name ?? '멤버'}
        </span>
        <span className="sub">{dateLabel(run.run_date)}</span>
      </header>

      <div className="run-stats">
        <span className="big-num run-km">{kmLabel(run.distance_km)}</span>
        <span className="run-unit">km</span>
        <span className="run-meta">
          {paceLabel(run.duration_sec, run.distance_km)} · {durationLabel(run.duration_sec)}
        </span>
      </div>

      {run.memo && <p className="run-memo">{run.memo}</p>}

      <img
        className="run-shot"
        src={run.screenshot_url}
        alt="러닝 인증 스크린샷"
        loading="lazy"
        onClick={() => setZoom(true)}
      />

      {zoom && (
        <div className="zoom" onClick={() => setZoom(false)}>
          <img src={run.screenshot_url} alt="러닝 인증 스크린샷" />
        </div>
      )}
    </article>
  )
}
