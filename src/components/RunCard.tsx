import { durationLabel, kmLabel, paceLabel } from '../lib/calc'
import { highlight, type RunLike } from '../lib/stats'
import type { FeedRun } from '../lib/store'
import Icon from './Icon'

/**
 * 피드 한 장. 예전엔 거리 하나에 카드 한 장을 통째로 썼는데,
 * 50건이 끝없이 흐르기만 하고 읽을 게 없었다. 밀도를 올리고 대신 '한마디'와 응원을 붙였다.
 */
export default function RunCard({
  run,
  mine,
  cheers,
  cheered,
  onCheer,
}: {
  run: FeedRun
  mine: RunLike[]
  cheers?: number
  cheered?: boolean
  /** 내 기록엔 넘기지 않는다 — 자기 자신을 응원하는 건 이상하다 */
  onCheer?: () => void
}) {
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
          {run.cadence_spm ? (
            <>
              <span className="run-dot">·</span>
              {run.cadence_spm}spm
            </>
          ) : null}
        </p>
        {tag && <p className={`run-tag ${tag.tone}`}>{tag.text}</p>}
        {run.memo && <p className="run-memo">{run.memo}</p>}
      </div>

      <div className="run-right">
        <p className="run-dist">
          <span className="big-num run-km">{kmLabel(run.distance_km)}</span>
          <span className="run-unit">km</span>
        </p>
        {cheers !== undefined &&
          (onCheer ? (
            <button
              className={`cheer${cheered ? ' on' : ''}`}
              onClick={onCheer}
              aria-pressed={cheered}
              aria-label={cheered ? '응원 취소' : '응원하기'}
            >
              <Icon name="heart" size={15} />
              {cheers > 0 && cheers}
            </button>
          ) : (
            cheers > 0 && (
              <span className="cheer cheer-mine">
                <Icon name="heart" size={15} />
                {cheers}
              </span>
            )
          ))}
      </div>
    </article>
  )
}
