import koreaSvg from '../assets/korea.svg?raw'
import { journey, kmLabel } from '../lib/calc'
import { MAP, MILESTONES, ROUTE_SEGMENTS, toPath } from '../lib/constants'

// 저장소에 든 정적 SVG의 <path>만 꺼내 쓴다 (뷰박스는 우리가 그린다)
const LAND = koreaSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')

export default function Journey({ totalKm }: { totalKm: number }) {
  const j = journey(totalKm)
  const done = ROUTE_SEGMENTS.slice(0, j.currentIndex)
  const now = j.next ? ROUTE_SEGMENTS[j.currentIndex] : null
  // 인하대·송도처럼 두 도시가 붙어 있으면 라벨이 겹친다 — 다음 도시 라벨을 아래로 민다
  const tight = j.next ? Math.hypot(j.next.x - j.current.x, j.next.y - j.current.y) < 50 : false

  return (
    <section className="card journey">
      <p className="card-label">가상 종주</p>

      <svg
        className="map"
        viewBox={`0 0 ${MAP.w} ${MAP.h}`}
        role="img"
        aria-label={`${j.current.place}까지 왔어요`}
      >
        <g dangerouslySetInnerHTML={{ __html: LAND }} />

        {ROUTE_SEGMENTS.map((seg, i) => (
          <path className="route-rest" d={toPath(seg)} key={i} />
        ))}

        {done.length > 0 && (
          <path className="route-done" d={done.map(toPath).join('')} pathLength={1} />
        )}

        {now && (
          <path
            className="route-now"
            d={toPath(now)}
            pathLength={1}
            style={{ strokeDashoffset: 1 - j.progress }}
          />
        )}

        {MILESTONES.map((m, i) => (
          <circle
            className={`dot${i <= j.currentIndex ? ' done' : ''}${i === j.currentIndex ? ' here' : ''}`}
            cx={m.x}
            cy={m.y}
            r={i === j.currentIndex ? 13 : 8}
            key={m.km}
          />
        ))}

        {[j.current, j.next].map((m, i) =>
          m ? (
            <text
              className={`pin${i === 0 ? ' pin-here' : ''}`}
              x={m.x + (m.x > MAP.w * 0.6 ? -18 : 18)}
              y={m.y + (i === 1 && tight ? 32 : 8)}
              textAnchor={m.x > MAP.w * 0.6 ? 'end' : 'start'}
              key={m.km}
            >
              {m.place}
            </text>
          ) : null,
        )}
      </svg>

      {j.next ? (
        <>
          <p className="jr-note">
            {j.next.emoji} {j.next.place}까지 <b>{kmLabel(j.remainKm)}km</b> 남았어요 ·{' '}
            {Math.round(j.progress * 100)}%
          </p>
          {j.next.reward && <p className="jr-reward">다음 보상 — {j.next.reward}</p>}
        </>
      ) : (
        <p className="jr-note">🏁 루트를 전부 돌았어요. 다음 시즌에서 만나요</p>
      )}
    </section>
  )
}
