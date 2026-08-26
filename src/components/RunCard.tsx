import { durationLabel, kmLabel, paceLabel } from '../lib/calc'
import { highlight, type RunLike } from '../lib/stats'
import type { FeedRun } from '../lib/store'

export type { FeedRun }

/**
 * 피드 한 장. 예전엔 거리 하나에 카드 한 장을 통째로 썼는데,
 * 50건이 끝없이 흐르기만 하고 읽을 게 없었다. 밀도를 올리고 대신 '한마디'를 붙였다.
 */
export default function RunCard({ run, mine }: { run: FeedRun; mine: RunLike[] }) {
  const tag = highlight(run, mine)

  return (
    <article className="card card-tight run">
      <span className="run-face">{run.members?.emoji ?? '🏃'}</span>

      <div className="run-body">
        <p className="run-name">{run.members?.name ?? '멤버'}</p>
        <p className="run-meta">
          <span className="run-pace">{paceLabel(run.duration_sec, run.distance_km)}</span>
          <span className="run-dot">·</span>
          {durationLabel(run.duration_sec)}
        </p>
        {tag && <p className={`run-tag ${tag.tone}`}>{tag.text}</p>}
        {run.memo && <p className="run-memo">{run.memo}</p>}
      </div>

      <p className="run-dist">
        <span className="big-num run-km">{kmLabel(run.distance_km)}</span>
        <span className="run-unit">km</span>
      </p>
    </article>
  )
}
