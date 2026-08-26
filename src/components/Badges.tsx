import type { Badge } from '../lib/stats'
import Icon from './Icon'

/** 목표까지 얼마나 남았는지 — 소수점은 보기 싫으니 정수로 줄인다 */
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export default function Badges({ list }: { list: Badge[] }) {
  const done = list.filter((b) => b.done)
  // 가장 가까운 목표 두 개만 보여준다. 못 딴 걸 열두 개 늘어놓으면 숙제처럼 보인다
  const next = list
    .filter((b) => !b.done)
    .sort((a, b) => b.cur / b.goal - a.cur / a.goal)
    .slice(0, 2)

  return (
    <section className="card">
      <div className="roster-head">
        <p className="sec">
          <Icon name="trophy" size={16} />
          뱃지
        </p>
        <span className="sub roster-count">
          {done.length} / {list.length}
        </span>
      </div>

      {done.length > 0 ? (
        <div className="badges">
          {done.map((b) => (
            <div className="badge" key={b.id} title={b.desc}>
              <span className="badge-emoji">{b.emoji}</span>
              <span className="badge-name">{b.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="sub badge-none">첫 인증을 올리면 여기가 채워지기 시작해요</p>
      )}

      {next.length > 0 && (
        <div className="badge-next">
          {next.map((b) => (
            <div className="bnext" key={b.id}>
              <span className="bnext-emoji">{b.emoji}</span>
              <span className="bnext-body">
                <span className="bnext-top">
                  <b>{b.name}</b>
                  <i>
                    {num(b.cur)} / {num(b.goal)}
                  </i>
                </span>
                <span className="bnext-track">
                  <i style={{ width: `${(b.cur / b.goal) * 100}%` }} />
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
