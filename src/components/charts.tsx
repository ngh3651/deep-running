/**
 * 차트 조각들. 라이브러리를 쓰지 않고 CSS 격자와 인라인 SVG로만 그린다.
 * 색은 전부 디자인 토큰에서 나온다 — 새 색을 만들지 않고 color-mix 로 단계를 만든다.
 */

/* ---------- 막대 그래프 ---------- */

export type Bar = { label: string; value: number; hint?: string }

/**
 * 주간 거리처럼 '기간별 한 값'을 볼 때. SVG 대신 격자를 쓰는 이유는
 * 라벨이 브라우저 폰트로 그대로 렌더돼야 390px에서 안 깨지기 때문이다.
 */
export function Bars({ data, unit = '', highlightLast = true }: { data: Bar[]; unit?: string; highlightLast?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const top = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])

  return (
    <div className="bars" role="img" aria-label={data.map((d) => `${d.label} ${d.value}${unit}`).join(', ')}>
      {data.map((d, i) => {
        const last = highlightLast && i === data.length - 1
        return (
          <div className={`bar-col${last ? ' now' : ''}`} key={d.label + i}>
            <span className="bar-val">{d.value > 0 && (last || d === top) ? d.value.toFixed(0) : ''}</span>
            <div className="bar-track">
              {/* 0인 주에 조각이라도 남기면 '조금은 달렸다'로 읽힌다. 회색 바닥선으로만 둔다 */}
              <div
                className={`bar-fill${d.value > 0 ? '' : ' zero'}`}
                style={{ height: d.value > 0 ? `${(d.value / max) * 100}%` : undefined }}
              />
            </div>
            <span className="bar-lab">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- 잔디 (일별 히트맵) ---------- */

export type HeatCol = { date: string; km: number; level: number; future: boolean }[]

const DOW_SHOWN = [0, 2, 4] // 월·수·금만 라벨을 단다 — 7개 다 쓰면 글자가 겹친다
const DOW = ['월', '화', '수', '목', '금', '토', '일']

export function Heat({ cols, months }: { cols: HeatCol[]; months: (string | null)[] }) {
  const days = cols.flat().filter((c) => c.km > 0).length

  return (
    <div className="heat" role="img" aria-label={`최근 ${cols.length}주 중 ${days}일 달렸어요`}>
      <div className="heat-dow">
        {DOW.map((d, i) => (
          <span key={d}>{DOW_SHOWN.includes(i) ? d : ''}</span>
        ))}
      </div>
      <div className="heat-body">
        <div className="heat-months" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
          {months.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
        <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
          {cols.map((col, i) => (
            <div className="heat-col" key={i}>
              {col.map((c) => (
                <i className={`heat-cell l${c.level}${c.future ? ' fut' : ''}`} key={c.date} title={`${c.date} ${c.km}km`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- 추이 선 ---------- */

/**
 * 페이스처럼 '낮을수록 좋은' 값도 그린다. 위로 갈수록 좋게 보이도록 축을 뒤집을 수 있다.
 * viewBox 를 늘려 쓰고 non-scaling-stroke 로 선 굵기를 지킨다.
 */
export function Trend({ values, invert = false, tone = 'accent' }: { values: number[]; invert?: boolean; tone?: 'accent' | 'good' }) {
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const at = (v: number) => {
    const t = (v - lo) / span
    return 4 + (invert ? t : 1 - t) * 32
  }
  const step = 100 / (values.length - 1)
  const pts = values.map((v, i) => `${(i * step).toFixed(2)},${at(v).toFixed(2)}`)

  return (
    <svg className={`trend trend-${tone}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <polygon className="trend-fill" points={`0,40 ${pts.join(' ')} 100,40`} />
      <polyline className="trend-line" points={pts.join(' ')} vectorEffect="non-scaling-stroke" />
      <circle className="trend-dot" cx="100" cy={at(values[values.length - 1])} r="2.4" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ---------- 원형 진행률 ---------- */

export function Ring({ progress, size = 84, label, sub }: { progress: number; size?: number; label: string; sub?: string }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="ring-track" cx="40" cy="40" r={r} />
        <circle
          className="ring-fill"
          cx="40"
          cy="40"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </svg>
      <span className="ring-text">
        <b>{label}</b>
        {sub && <i>{sub}</i>}
      </span>
    </div>
  )
}

/* ---------- 나 vs 소모임 비교 막대 ---------- */

export function Compare({
  rows,
  unit = '',
}: {
  rows: { label: string; value: number; text: string; me?: boolean }[]
  unit?: string
}) {
  // 값이 0~1 사이(페이스의 역수 같은)일 수도 있어서 1로 바닥을 깔면 안 된다
  const max = Math.max(...rows.map((r) => r.value)) || 1
  return (
    <div className="cmp">
      {rows.map((r) => (
        <div className={`cmp-row${r.me ? ' me' : ''}`} key={r.label}>
          <span className="cmp-lab">{r.label}</span>
          <span className="cmp-track">
            <span className="cmp-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="cmp-val">
            {r.text}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}
