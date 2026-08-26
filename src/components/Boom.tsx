import type { Milestone } from '../lib/constants'

/**
 * 도장을 찍은 순간. 내 기록 하나가 소모임을 다음 도시로 넘겼을 때만 뜬다.
 * 종주가 '언젠가 도착하는 것'이 아니라 '내가 도착시킨 것'이 되는 자리라 크게 쓴다.
 */
export default function Boom({ place }: { place: Milestone }) {
  return (
    <div className="boom">
      <p className="boom-emoji">{place.emoji}</p>
      <p className="boom-title">{place.place.split(' — ')[0]} 도착!</p>
      <p className="boom-sub">내 기록이 소모임을 여기까지 데려왔어요</p>
      {place.reward && <p className="boom-reward">{place.reward}</p>}
    </div>
  )
}
