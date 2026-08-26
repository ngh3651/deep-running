import { useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useApp } from '../components/Layout'
import { kmLabel, paceLabel, rank, type Metric, type Period, type RankRow } from '../lib/calc'
import { useClub } from '../lib/store'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
]

const METRICS: { key: Metric; label: string; note: string }[] = [
  { key: 'count', label: '꾸준함', note: '거리보다 꾸준함 — 인증 횟수가 먼저예요' },
  { key: 'km', label: '거리', note: '이 기간에 가장 멀리 달린 순서예요' },
  { key: 'pace', label: '페이스', note: '3회 이상 달린 사람만 보여줘요. 평균 페이스가 빠른 순서예요' },
  { key: 'cadence', label: '케이던스', note: '3회 이상 달린 사람만 보여줘요. 1분에 걸음을 많이 옮긴 순서예요' },
]

const MEDALS = ['🥇', '🥈', '🥉']

/** 지표마다 크게 보여줄 값과 곁들일 값이 다르다 */
function values(r: RankRow, metric: Metric): [string, string] {
  if (metric === 'km') return [`${kmLabel(r.km)}km`, `${r.count}회`]
  if (metric === 'pace') return [r.pace ? paceLabel(r.pace, 1) : '—', `${r.count}회`]
  if (metric === 'cadence') return [`${r.cadence ?? 0}`, 'spm']
  return [`${r.count}회`, `${kmLabel(r.km)}km`]
}

export default function Ranking() {
  const { member } = useApp()
  const club = useClub()
  const [period, setPeriod] = useState<Period>('week')
  const [metric, setMetric] = useState<Metric>('count')

  const metrics = METRICS.filter((m) => m.key !== 'cadence' || club.caps.cadence)
  const rows = rank(club.runs, club.members, period, new Date(), metric)
  // 시상대는 세 명이 모여야 시상대다. 그 아래면 그냥 줄로 보여준다
  const podium = rows.length >= 3
  const top = podium ? rows.slice(0, 3) : []
  const rest = podium ? rows.slice(3) : rows
  const note = METRICS.find((m) => m.key === metric)!.note
  // 페이스처럼 낮을수록 좋은 지표는 막대를 뒤집어야 1등이 길어진다
  const bar = (r: RankRow) => {
    if (metric === 'pace') return r.pace ? (rows[0].pace! / r.pace) * 100 : 0
    if (metric === 'cadence') return r.cadence ? (r.cadence / rows[0].cadence!) * 100 : 0
    const v = metric === 'km' ? r.km : r.count
    const m = metric === 'km' ? rows[0].km : rows[0].count
    return m > 0 ? (v / m) * 100 : 0
  }

  return (
    <>
      <h1 className="page-title">랭킹</h1>

      <div className="seg" role="tablist">
        {PERIODS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={period === t.key}
            className={period === t.key ? 'seg-on' : ''}
            onClick={() => setPeriod(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="chips rank-metrics">
        {metrics.map((m) => (
          <button
            key={m.key}
            className={`chip${metric === m.key ? ' on' : ''}`}
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="sub rank-note">{note}</p>

      {!club.loaded && (
        <div className="loading">
          <span className="spinner" />
        </div>
      )}
      {club.failed && <EmptyState emoji="📡" text="기록을 불러오지 못했어요. 잠시 뒤에 다시 열어줘요" />}
      {club.loaded && !club.failed && rows.length === 0 && (
        <EmptyState emoji="🏁" text="이 기간엔 아직 줄 세울 기록이 없어요" />
      )}

      {top.length > 0 && (
        <div className="podium" style={{ gridTemplateColumns: top.length === 1 ? '1fr' : `repeat(${top.length}, 1fr)` }}>
          {[top[1], top[0], top[2]].map((r, slot) => {
            if (!r) return null
            const place = slot === 1 ? 0 : slot === 0 ? 1 : 2
            const [big, small] = values(r, metric)
            return (
              <div className={`pod pod-${place}${r.id === member.id ? ' me' : ''}`} key={r.id}>
                <span className="pod-medal">{MEDALS[place]}</span>
                <span className="pod-face">{r.emoji}</span>
                <span className="pod-name">{r.name}</span>
                <span className="pod-big big-num">{big}</span>
                <span className="pod-small">{small}</span>
              </div>
            )
          })}
        </div>
      )}

      {rest.map((r, i) => {
        const [big, small] = values(r, metric)
        return (
          <div className={`card card-tight rankrow${r.id === member.id ? ' me' : ''}`} key={r.id}>
            <span className="rank-no">{podium ? i + 4 : i + 1}</span>
            <span className="rank-face">{r.emoji}</span>
            <span className="rank-body">
              <span className="rank-name">{r.name}</span>
              <span className="rank-bar">
                <i style={{ width: `${bar(r)}%` }} />
              </span>
            </span>
            <span className="rank-vals">
              <b className="big-num">{big}</b>
              <i>{small}</i>
            </span>
          </div>
        )
      })}
    </>
  )
}
