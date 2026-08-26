import { kmLabel, thisWeek, weekStreak } from '../lib/calc'
import type { FeedRun } from '../lib/store'
import type { Member } from '../lib/supabase'
import Icon from './Icon'

/**
 * 소모임원 목록. 톡방 멤버 목록처럼 '누가 있고 이번 주에 누가 움직였나'를 한눈에 본다.
 * 일부러 등수를 매기지 않는다 — 7명짜리 모임에서 매주 꼴찌 이름을 보여주면 그 사람이 조용히 나간다.
 */
export default function Roster({
  members,
  runs,
  meId,
}: {
  members: Member[]
  runs: FeedRun[]
  meId: string
}) {
  const rows = members
    .map((m) => {
      const mine = runs.filter((r) => r.member_id === m.id)
      const w = thisWeek(mine)
      return { m, week: w, streak: weekStreak(mine.map((r) => r.run_date)).weeks, ran: w.count > 0 }
    })
    // 이번 주에 움직인 사람이 위로, 그 안에서는 거리순 — 등수는 붙이지 않는다
    .sort((a, b) => Number(b.ran) - Number(a.ran) || b.week.km - a.week.km || a.m.name.localeCompare(b.m.name, 'ko'))

  const max = Math.max(1, ...rows.map((r) => r.week.km))
  const active = rows.filter((r) => r.ran).length

  return (
    <section className="card">
      <div className="roster-head">
        <p className="sec">
          <Icon name="users" size={16} />
          소모임원 {members.length}명
        </p>
        <span className="sub roster-count">이번 주 {active}명 달렸어요</span>
      </div>

      <div className="roster">
        {rows.map(({ m, week, streak, ran }) => (
          <div className={`roster-row${m.id === meId ? ' me' : ''}${ran ? '' : ' idle'}`} key={m.id}>
            <span className="roster-face">{m.emoji}</span>
            <span className="roster-body">
              <span className="roster-name">
                {m.name}
                {m.id === meId && <i className="roster-tag">나</i>}
              </span>
              <span className="roster-sub">
                {ran ? `이번 주 ${week.count}회` : '이번 주 아직이에요'}
                {streak > 0 && <b className="roster-streak">🔥{streak}주</b>}
              </span>
            </span>
            <span className="roster-bar">
              <i style={{ width: `${(week.km / max) * 100}%` }} />
            </span>
            <span className="roster-km">{ran ? `${kmLabel(week.km)}km` : '—'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
