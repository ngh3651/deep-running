import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { useApp } from '../components/Layout'
import Icon from '../components/Icon'
import RunCard from '../components/RunCard'
import Toast from '../components/Toast'
import { dateLabel } from '../lib/calc'
import { loadClub, toggleCheer, useClub, type FeedRun } from '../lib/store'

const SHOWN = 50

/** 오늘·어제는 날짜 대신 그렇게 부른다 */
function groupLabel(iso: string, today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((d.getTime() - new Date(iso + 'T00:00:00').getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  return dateLabel(iso)
}

export default function Feed() {
  const location = useLocation()
  const { member } = useApp()
  const club = useClub()
  const [toast, setToast] = useState<string>(() => (location.state as { toast?: string } | null)?.toast ?? '')

  useEffect(() => {
    // 토스트는 한 번만 — 새로고침해도 다시 뜨지 않게 히스토리에서 지운다
    if (toast) window.history.replaceState({}, '')
  }, [toast])

  const today = new Date()
  const runs = club.runs.slice(0, SHOWN)

  // 날짜별로 묶어서 하루의 리듬이 보이게 한다
  const groups: { label: string; rows: FeedRun[] }[] = []
  for (const r of runs) {
    const label = groupLabel(r.run_date, today)
    if (groups[groups.length - 1]?.label !== label) groups.push({ label, rows: [] })
    groups[groups.length - 1].rows.push(r)
  }

  const byMember = (id: string) => club.runs.filter((r) => r.member_id === id)
  const cheersOf = (runId: string) => club.cheers.filter((c) => c.run_id === runId).length
  const iCheered = (runId: string) => club.cheers.some((c) => c.run_id === runId && c.member_id === member.id)

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">피드</h1>
        <button className="link-btn" onClick={() => void loadClub()} disabled={club.loading}>
          <Icon name="refresh" size={16} className={club.loading ? 'spin' : ''} />
          새로고침
        </button>
      </div>

      {!club.loaded && (
        <div className="loading">
          <span className="spinner" />
        </div>
      )}
      {club.failed && <EmptyState emoji="📡" text="기록을 불러오지 못했어요. 잠시 뒤에 다시 열어줘요" />}
      {club.loaded && !club.failed && runs.length === 0 && (
        <EmptyState emoji="👟" text="아직 기록이 없어요. 첫 인증을 올려봐요" />
      )}

      {groups.map((g) => (
        <section className="feed-day" key={g.label}>
          <p className="feed-date">{g.label}</p>
          {g.rows.map((r) => (
            <RunCard
              key={r.id}
              run={r}
              mine={byMember(r.member_id)}
              cheers={club.caps.cheer ? cheersOf(r.id) : undefined}
              cheered={iCheered(r.id)}
              onCheer={
                club.caps.cheer && r.member_id !== member.id ? () => void toggleCheer(r.id, member.id) : undefined
              }
            />
          ))}
        </section>
      ))}

      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </>
  )
}
