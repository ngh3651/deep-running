import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useApp } from '../components/Layout'
import { kmLabel, rank, type Period } from '../lib/calc'
import { supabase } from '../lib/supabase'

const TABS: { key: Period; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
]

const MEDALS = ['🥇', '🥈', '🥉']

type RunRow = { member_id: string; run_date: string; distance_km: number }
type MemberRow = { id: string; name: string; emoji: string }

export default function Ranking() {
  const { member } = useApp()
  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<{ runs: RunRow[]; members: MemberRow[] } | null>(null)

  useEffect(() => {
    void (async () => {
      const [r, m] = await Promise.all([
        supabase.from('runs').select('member_id,run_date,distance_km'),
        supabase.from('members').select('id,name,emoji'),
      ])
      setData({ runs: (r.data ?? []) as RunRow[], members: (m.data ?? []) as MemberRow[] })
    })()
  }, [])

  const rows = data ? rank(data.runs, data.members, period) : []

  return (
    <>
      <h1 className="page-title">랭킹</h1>
      <p className="sub">거리보다 꾸준함 — 인증 횟수가 먼저예요</p>

      <div className="seg">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={period === t.key ? 'seg-on' : ''}
            onClick={() => setPeriod(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data === null && <div className="loading"><span className="spinner" /></div>}
      {data !== null && rows.length === 0 && (
        <EmptyState emoji="🏁" text="이 기간엔 아직 인증이 없어요" />
      )}

      {rows.map((r, i) => (
        <div className={`card rankrow${r.id === member.id ? ' me' : ''}`} key={r.id}>
          <span className="rank-no">{MEDALS[i] ?? i + 1}</span>
          <span className="rank-emoji">{r.emoji}</span>
          <span className="rank-name">{r.name}</span>
          <span className="rank-count big-num">{r.count}회</span>
          <span className="rank-km sub">{kmLabel(r.km)}km</span>
        </div>
      ))}
    </>
  )
}
