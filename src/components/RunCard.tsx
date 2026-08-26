import { dateLabel, durationLabel, kmLabel, paceLabel } from '../lib/calc'
import type { Run } from '../lib/supabase'

export type FeedRun = Run & { members: { name: string; emoji: string } | null }

export default function RunCard({ run }: { run: FeedRun }) {
  return (
    <article className="card run">
      <header className="run-head">
        <span className="run-who">
          <span className="run-emoji">{run.members?.emoji ?? '🏃'}</span>
          {run.members?.name ?? '멤버'}
        </span>
        <span className="sub">{dateLabel(run.run_date)}</span>
      </header>

      <p className="run-dist">
        <span className="big-num run-km">{kmLabel(run.distance_km)}</span>
        <span className="run-unit">km</span>
      </p>

      {run.memo && <p className="run-memo">{run.memo}</p>}

      <div className="run-meta">
        <div>
          <span className="run-meta-v">{paceLabel(run.duration_sec, run.distance_km)}</span>
          <span className="run-meta-l">페이스</span>
        </div>
        <div>
          <span className="run-meta-v">{durationLabel(run.duration_sec)}</span>
          <span className="run-meta-l">시간</span>
        </div>
      </div>
    </article>
  )
}
