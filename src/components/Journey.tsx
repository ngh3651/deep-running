import koreaSvg from '../assets/korea.svg?raw'
import { journey, kmLabel } from '../lib/calc'
import { MAP, MILESTONES, ROUTE_SEGMENTS, toPath } from '../lib/constants'
import Icon from './Icon'

// 저장소에 든 정적 SVG의 <path>만 꺼내 쓴다 (뷰박스는 우리가 그린다)
const LAND = koreaSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')

/** '인천 복귀 — 전국일주 완주' 처럼 긴 이름은 앞부분만 쓴다 */
const short = (place: string) => place.split(' — ')[0]

export default function Journey({ totalKm }: { totalKm: number }) {
  const j = journey(totalKm)
  const done = ROUTE_SEGMENTS.slice(0, j.currentIndex)
  const now = j.next ? ROUTE_SEGMENTS[j.currentIndex] : null
  const pct = Math.round(j.progress * 100)

  return (
    <section className="card journey">
      <div className="jr-head">
        <p className="sec">
          <Icon name="route" size={16} />
          가상 종주
        </p>
        <span className="jr-pct big-num">{pct}%</span>
      </div>

      {/* 지도에는 이름을 얹지 않는다 — 390px에서 라벨이 겹치고, 어차피 아래 줄에서 읽힌다 */}
      <svg
        className="map"
        viewBox={`0 0 ${MAP.w} ${MAP.h}`}
        role="img"
        aria-label={`${short(j.current.place)}까지 왔어요. 다음은 ${j.next ? short(j.next.place) : '없어요'}`}
      >
        <g dangerouslySetInnerHTML={{ __html: LAND }} />

        {ROUTE_SEGMENTS.map((seg, i) => (
          <path className="route-rest" d={toPath(seg)} key={i} />
        ))}

        {done.length > 0 && <path className="route-done" d={done.map(toPath).join('')} pathLength={1} />}

        {now && (
          <path className="route-now" d={toPath(now)} pathLength={1} style={{ strokeDashoffset: 1 - j.progress }} />
        )}

        {MILESTONES.map((m, i) => (
          <circle
            className={`dot${i <= j.currentIndex ? ' done' : ''}${i === j.currentIndex ? ' here' : ''}`}
            cx={m.x}
            cy={m.y}
            r={i === j.currentIndex ? 12 : 7}
            key={m.km}
          />
        ))}
      </svg>

      {j.next ? (
        <>
          <div className="jr-line">
            <span className="jr-from">{short(j.current.place)}</span>
            <span className="jr-track">
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="jr-to">
              {j.next.emoji} {short(j.next.place)}
            </span>
          </div>
          <p className="jr-note">
            <b>{kmLabel(j.remainKm)}km</b> 남았어요
            {j.next.reward && <span className="jr-reward">다음 보상 · {j.next.reward}</span>}
          </p>
        </>
      ) : (
        <p className="jr-note">🏁 루트를 전부 돌았어요. 다음 시즌에서 만나요</p>
      )}
    </section>
  )
}
