import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import Journey from '../components/Journey'
import StatBig from '../components/StatBig'
import { kmLabel, sumKm, thisWeek } from '../lib/calc'
import { CLUB_SIZE } from '../lib/constants'
import { supabase } from '../lib/supabase'

type Row = { member_id: string; run_date: string; distance_km: number }

/** 홈에 딱 하나 있는 애니메이션 */
function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target) return setV(0)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export default function Home() {
  const [runs, setRuns] = useState<Row[] | null>(null)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('runs').select('member_id,run_date,distance_km')
      setRuns((data ?? []) as Row[])
    })()
  }, [])

  const total = sumKm(runs ?? [])
  const shown = useCountUp(total)
  const week = thisWeek(runs ?? [])
  const joined = new Set((runs ?? []).filter((r) => thisWeek([r]).count === 1).map((r) => r.member_id)).size

  return (
    <>
      <h1 className="page-title">Deep Running</h1>

      <section className="card hero">
        <p className="card-label">우리가 함께 달린 거리</p>
        <p className="hero-num big-num">
          {kmLabel(shown)}
          <span className="hero-unit">km</span>
        </p>
      </section>

      {runs === null && <div className="loading"><span className="spinner" /></div>}

      {runs !== null && runs.length === 0 && (
        <EmptyState emoji="🏫" text="첫 기록을 올리면 인하대에서 종주가 시작돼요" />
      )}

      {runs !== null && runs.length > 0 && (
        <>
          <Journey totalKm={total} />
          <section className="card stats-row">
            <StatBig value={String(week.count)} unit="건" label="이번 주 인증" />
            <StatBig value={kmLabel(week.km)} unit="km" label="이번 주 합계" />
            <StatBig value={`${joined}/${CLUB_SIZE}`} label="참여" />
          </section>
        </>
      )}
    </>
  )
}
