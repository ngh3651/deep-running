// 화면 검토·스크린샷용 가짜 데이터. 배포 번들에 들어가지 않는다 (scripts/ 는 빌드 밖).
// 실제 DB를 건드리지 않고도 "기록이 가득 찬 화면"을 볼 수 있게 하는 게 목적이다.

const MEMBERS = [
  { id: 'm1', name: '남규혁', emoji: '🏃' },
  { id: 'm2', name: '서연', emoji: '🔥' },
  { id: 'm3', name: '도윤', emoji: '⚡' },
  { id: 'm4', name: '지우', emoji: '🍀' },
  { id: 'm5', name: '하준', emoji: '🦊' },
  { id: 'm6', name: '민서', emoji: '🌙' },
  { id: 'm7', name: '예린', emoji: '🐢' },
]

// 시드 고정 난수 — 매번 같은 화면이 나와야 디자인 변화만 비교할 수 있다
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 멤버별 실력·성실도를 다르게 줘서 랭킹·성장 지표가 밋밋하지 않게 만든다 */
const PROFILE = {
  m1: { base: 5.2, pace: 330, days: [1, 3, 5, 6], grow: -14 },
  m2: { base: 7.5, pace: 300, days: [0, 2, 4, 6], grow: -8 },
  m3: { base: 4.0, pace: 372, days: [1, 4], grow: -22 },
  m4: { base: 3.2, pace: 420, days: [2, 5], grow: -30 },
  m5: { base: 10.5, pace: 288, days: [0, 3, 6], grow: -4 },
  m6: { base: 5.8, pace: 348, days: [1, 2, 4, 5, 6], grow: -18 },
  m7: { base: 2.6, pace: 462, days: [3], grow: -36 },
}

const MEMOS = [
  '한강 야경 미쳤다', '다리 무거움', '오늘은 진짜 가벼웠어요', '비 와서 트랙에서',
  '마지막 1km 스퍼트', '무릎 조심', '새벽 공기 좋다', '치킨 값 벌었다', null, null, null, null,
]

/** 오늘 기준 최근 weeks 주치 기록을 만든다 */
export function makeRuns({ weeks = 14, today = new Date() } = {}) {
  const rand = rng(20260827)
  const runs = []
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  for (let back = weeks * 7; back >= 0; back--) {
    const d = new Date(t0)
    d.setDate(d.getDate() - back)
    const weekIdx = Math.floor((weeks * 7 - back) / 7)

    for (const m of MEMBERS) {
      const p = PROFILE[m.id]
      if (!p.days.includes(d.getDay())) continue
      if (rand() < 0.22) continue // 빠지는 날
      // 뒤로 갈수록 실력이 는다 — 월간 성장 지표가 실제로 움직이게
      const t = weekIdx / (weeks || 1)
      const km = Math.max(1.2, Math.min(42, p.base * (0.75 + t * 0.5) * (0.85 + rand() * 0.3)))
      const pace = p.pace + p.grow * t + (rand() - 0.5) * 26
      const sec = Math.round(km * pace)
      if (sec < 60 || sec > 21600) continue
      runs.push({
        id: `r${runs.length}`,
        member_id: m.id,
        run_date: iso(d),
        distance_km: Math.round(km * 100) / 100,
        duration_sec: sec,
        memo: MEMOS[Math.floor(rand() * MEMOS.length)],
        created_at: new Date(d.getTime() + 12 * 3600e3).toISOString(),
      })
    }
  }
  return runs
}

export function fixtures(opts) {
  return { members: MEMBERS, runs: makeRuns(opts) }
}

export const ME = MEMBERS[0]
export { MEMBERS }
