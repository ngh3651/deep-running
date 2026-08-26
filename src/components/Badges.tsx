import type { Badge } from '../lib/stats'
import Icon from './Icon'

/** 목표까지 얼마나 남았는지 — 소수점은 보기 싫으니 정수로 줄인다 */
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export default function Badges({ list }: { list: Badge[] }) {
  const done = list.filter((b) => b.done).length
  // 딴 것을 앞으로, 못 딴 것도 흐리게 남긴다 — 감추면 뭘 노려야 할지 모른다
  const sorted = [...list].sort((a, b) => Number(b.done) - Number(a.done))
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
          {done} / {list.length}
        </span>
      </div>

      <div className="badges">
        {sorted.map((b) => (
          <div className={`badge${b.done ? '' : ' off'}`} key={b.id} title={b.desc}>
            <span className="badge-emoji">{b.emoji}</span>
            <span className="badge-name">{b.name}</span>
          </div>
        ))}
      </div>

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
