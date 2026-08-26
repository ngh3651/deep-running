import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useApp } from '../components/Layout'
import StatBig from '../components/StatBig'
import { dateLabel, durationLabel, kmLabel, monthKm, paceLabel, sumKm, weekStreak } from '../lib/calc'
import { supabase, type Run } from '../lib/supabase'

export default function My() {
  const { member, logout } = useApp()
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [menu, setMenu] = useState('')
  const [ask, setAsk] = useState<Run | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('runs')
      .select('*')
      .eq('member_id', member.id)
      .order('run_date', { ascending: false })
      .order('created_at', { ascending: false })
    setRuns((data ?? []) as Run[])
  }, [member.id])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(run: Run) {
    setBusy(true)
    try {
      // 하드 삭제 (SPEC 4.6) — 사진은 애초에 저장하지 않으니 행만 지우면 끝이다
      await supabase.from('runs').delete().eq('id', run.id)
      setAsk(null)
      setMenu('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const streak = weekStreak((runs ?? []).map((r) => r.run_date))

  return (
    <>
      <h1 className="page-title">마이</h1>

      <div className="card profile">
        <div className="profile-emoji">{member.emoji}</div>
        <div>
          <p className="profile-name">{member.name}</p>
          <p className="sub">Deep Running</p>
        </div>
      </div>

      <div className="card stats-row">
        <StatBig value={kmLabel(monthKm(runs ?? []))} unit="km" label="이번 달" />
        <StatBig value={kmLabel(sumKm(runs ?? []))} unit="km" label="누적" />
        <StatBig value={String((runs ?? []).length)} unit="회" label="총 인증" />
      </div>

      <div className="card streak">
        <p className="streak-line">
          {streak.weeks > 0 ? (
            <>
              <span className="streak-fire">🔥</span>
              <span>
                <span className="big-num streak-num">{streak.weeks}</span>주 연속
              </span>
            </>
          ) : (
            '아직 연속 기록이 없어요'
          )}
        </p>
        {streak.weeks > 0 && streak.thisWeekMissing && (
          <p className="sub">이번 주 아직 안 달렸어요 — 불꽃이 꺼지기 전에!</p>
        )}
      </div>

      <h2 className="section-title">내 기록</h2>

      {runs === null && <div className="loading"><span className="spinner" /></div>}
      {runs !== null && runs.length === 0 && (
        <EmptyState emoji="👟" text="아직 기록이 없어요. 첫 인증을 올려봐요" />
      )}

      {runs?.map((r) => (
        <div className="card rec" key={r.id}>
          <div className="rec-main">
            <p className="rec-date sub">{dateLabel(r.run_date)}</p>
            <p>
              <span className="big-num rec-km">{kmLabel(r.distance_km)}</span>
              <span className="run-unit"> km</span>
            </p>
            <p className="sub rec-meta">
              {paceLabel(r.duration_sec, r.distance_km)} · {durationLabel(r.duration_sec)}
            </p>
          </div>
          <button
            className="rec-more"
            aria-label="기록 메뉴"
            onClick={() => setMenu(menu === r.id ? '' : r.id)}
          >
            ⋯
          </button>
          {menu === r.id && (
            <div className="rec-menu">
              <button onClick={() => setAsk(r)}>삭제</button>
            </div>
          )}
        </div>
      ))}

      <button className="btn btn-ghost" onClick={logout}>
        로그아웃
      </button>

      {ask && (
        <div className="dialog-back" role="dialog" aria-modal="true">
          <div className="dialog">
            <p className="dialog-title">이 기록을 지울까요?</p>
            <p className="sub">
              {dateLabel(ask.run_date)} · {kmLabel(ask.distance_km)}km — 되돌릴 수 없어요.
            </p>
            <div className="dialog-row">
              <button className="btn btn-ghost" onClick={() => setAsk(null)} disabled={busy}>
                아니요
              </button>
              <button className="btn btn-danger" onClick={() => remove(ask)} disabled={busy}>
                지울게요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
