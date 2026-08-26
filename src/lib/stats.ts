import { parseISO } from 'date-fns'
import { weekStart } from './calc'

/**
 * 재미·성장 지표. calc.ts 가 스펙에 박힌 핵심 계산이라면 여기는 그 위에 얹는 층이다.
 * 전부 저장하지 않고 계산한다 — 기록을 지워도 숫자가 어긋나지 않는다.
 */

export type RunLike = { run_date: string; distance_km: number; duration_sec: number }

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const round2 = (n: number) => Math.round(n * 100) / 100

/** 평균 페이스(초/km). 기록이 없으면 null */
export function avgPace(runs: RunLike[]): number | null {
  const km = runs.reduce((s, r) => s + r.distance_km, 0)
  if (km <= 0) return null
  return runs.reduce((s, r) => s + r.duration_sec, 0) / km
}

/* ---------- 주간 시계열 (막대 그래프용) ---------- */

export type WeekPoint = { start: string; label: string; km: number; count: number }

/** 최근 n주를 오래된 주 → 이번 주 순서로. 인증이 없는 주도 0으로 채운다 */
export function weeklySeries(runs: RunLike[], weeks = 8, today: Date = new Date()): WeekPoint[] {
  const bucket = new Map<string, { km: number; count: number }>()
  for (const r of runs) {
    const k = iso(weekStart(parseISO(r.run_date)))
    const cur = bucket.get(k) ?? { km: 0, count: 0 }
    bucket.set(k, { km: cur.km + r.distance_km, count: cur.count + 1 })
  }

  const out: WeekPoint[] = []
  const cursor = weekStart(today)
  cursor.setDate(cursor.getDate() - (weeks - 1) * 7)
  for (let i = 0; i < weeks; i++) {
    const k = iso(cursor)
    const b = bucket.get(k) ?? { km: 0, count: 0 }
    out.push({ start: k, label: `${cursor.getMonth() + 1}/${cursor.getDate()}`, km: round2(b.km), count: b.count })
    cursor.setDate(cursor.getDate() + 7)
  }
  return out
}

/* ---------- 잔디 (일별 히트맵) ---------- */

export type HeatCell = { date: string; km: number; level: 0 | 1 | 2 | 3 | 4; future: boolean }

/** 거리 → 진하기 4단계. 3km 미만은 옅게, 10km 이상은 가장 진하게 */
function heatLevel(km: number): 0 | 1 | 2 | 3 | 4 {
  if (km <= 0) return 0
  if (km < 3) return 1
  if (km < 6) return 2
  if (km < 10) return 3
  return 4
}

/**
 * 최근 n주 × 7일. 바깥 배열이 주(열), 안쪽이 월~일(행)이다.
 * 이번 주의 아직 오지 않은 날은 future 로 표시해 빈칸과 구분한다.
 */
export function heatWeeks(runs: RunLike[], weeks = 15, today: Date = new Date()): HeatCell[][] {
  const byDay = new Map<string, number>()
  for (const r of runs) byDay.set(r.run_date, (byDay.get(r.run_date) ?? 0) + r.distance_km)

  const todayKey = iso(today)
  const start = weekStart(today)
  start.setDate(start.getDate() - (weeks - 1) * 7)

  const cols: HeatCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(day.getDate() + w * 7 + d)
      const key = iso(day)
      const km = round2(byDay.get(key) ?? 0)
      col.push({ date: key, km, level: heatLevel(km), future: key > todayKey })
    }
    cols.push(col)
  }
  return cols
}

/** 히트맵 위에 붙일 월 라벨 — 그 달이 처음 나타나는 열에만 */
export function heatMonthLabels(cols: HeatCell[][]): (string | null)[] {
  let last = ''
  return cols.map((col) => {
    const m = col[0].date.slice(5, 7)
    if (m === last) return null
    last = m
    return `${Number(m)}월`
  })
}

/* ---------- 개인 최고 기록 ---------- */

export type Best = { run: RunLike; value: number } | null
export type Bests = { longest: Best; fastest: Best; longestTime: Best }

/** 최고 페이스는 1km 미만 기록을 빼고 고른다 — 짧은 전력질주가 대표 기록이 되면 안 된다 */
export function personalBests(runs: RunLike[]): Bests {
  const pick = (list: RunLike[], score: (r: RunLike) => number, best: (a: number, b: number) => boolean): Best => {
    let out: Best = null
    for (const r of list) {
      const v = score(r)
      if (!out || best(v, out.value)) out = { run: r, value: v }
    }
    return out
  }
  return {
    longest: pick(runs, (r) => r.distance_km, (a, b) => a > b),
    fastest: pick(
      runs.filter((r) => r.distance_km >= 1),
      (r) => r.duration_sec / r.distance_km,
      (a, b) => a < b,
    ),
    longestTime: pick(runs, (r) => r.duration_sec, (a, b) => a > b),
  }
}

/* ---------- 이번 달 vs 지난달 ---------- */

export type MonthStat = { km: number; count: number; pace: number | null }
export type Growth = {
  cur: MonthStat
  prev: MonthStat
  kmPct: number | null
  countDiff: number
  /** 초/km. 음수면 빨라진 것 */
  paceDiff: number | null
}

/** 그 달의 1일부터 untilDay 까지만 */
function monthStat(runs: RunLike[], y: number, m: number, untilDay: number): MonthStat {
  const mine = runs.filter((r) => {
    const d = parseISO(r.run_date)
    return d.getFullYear() === y && d.getMonth() === m && d.getDate() <= untilDay
  })
  return { km: round2(mine.reduce((s, r) => s + r.distance_km, 0)), count: mine.length, pace: avgPace(mine) }
}

/**
 * 지난달 대비 얼마나 늘었나 / 빨라졌나.
 * 이번 달은 아직 안 끝났으니 지난달도 '같은 날짜까지'만 잘라서 견준다 —
 * 27일에 이번 달 27일치를 지난달 31일치와 비교하면 매달 초에 전원이 퇴보한 것처럼 보인다.
 */
export function monthGrowth(runs: RunLike[], today: Date = new Date()): Growth {
  const y = today.getFullYear()
  const m = today.getMonth()
  const day = today.getDate()
  const cur = monthStat(runs, y, m, day)
  const prevDate = new Date(y, m - 1, 1)
  const prev = monthStat(runs, prevDate.getFullYear(), prevDate.getMonth(), day)
  return {
    cur,
    prev,
    kmPct: prev.km > 0 ? Math.round(((cur.km - prev.km) / prev.km) * 100) : null,
    countDiff: cur.count - prev.count,
    paceDiff: cur.pace !== null && prev.pace !== null ? Math.round(cur.pace - prev.pace) : null,
  }
}

/* ---------- 등급 ---------- */

export type Level = { idx: number; name: string; emoji: string; from: number; to: number | null; progress: number; remain: number }

const LEVELS: { km: number; name: string; emoji: string }[] = [
  { km: 0, name: '새싹 러너', emoji: '🌱' },
  { km: 10, name: '동네 한 바퀴', emoji: '👟' },
  { km: 30, name: '페이스메이커', emoji: '🏃' },
  { km: 70, name: '바람돌이', emoji: '💨' },
  { km: 150, name: '불꽃 심장', emoji: '🔥' },
  { km: 300, name: '번개 다리', emoji: '⚡' },
  { km: 600, name: '철인', emoji: '🦅' },
  { km: 1000, name: '전설', emoji: '👑' },
]

export function levelOf(totalKm: number): Level {
  let i = 0
  while (i + 1 < LEVELS.length && totalKm >= LEVELS[i + 1].km) i += 1
  const cur = LEVELS[i]
  const next = i + 1 < LEVELS.length ? LEVELS[i + 1] : null
  if (!next) return { idx: i, name: cur.name, emoji: cur.emoji, from: cur.km, to: null, progress: 1, remain: 0 }
  return {
    idx: i,
    name: cur.name,
    emoji: cur.emoji,
    from: cur.km,
    to: next.km,
    progress: Math.min(1, Math.max(0, (totalKm - cur.km) / (next.km - cur.km))),
    remain: round2(next.km - totalKm),
  }
}

/* ---------- 뱃지 ---------- */

export type Badge = { id: string; emoji: string; name: string; desc: string; done: boolean; cur: number; goal: number }

/** 한 주에 가장 많이 달린 횟수 */
function bestWeekCount(runs: RunLike[]): number {
  const c = new Map<string, number>()
  for (const r of runs) {
    const k = iso(weekStart(parseISO(r.run_date)))
    c.set(k, (c.get(k) ?? 0) + 1)
  }
  return Math.max(0, ...c.values())
}

/** 한 달에 가장 많이 달린 거리 */
function bestMonthKm(runs: RunLike[]): number {
  const c = new Map<string, number>()
  for (const r of runs) {
    const k = r.run_date.slice(0, 7)
    c.set(k, (c.get(k) ?? 0) + r.distance_km)
  }
  return Math.max(0, ...c.values())
}

/**
 * 전부 계산값이다. 저장하지 않으니 기록을 지우면 뱃지도 정확히 되돌아간다.
 * 목표를 향한 진행률을 같이 담아서 "다음 뱃지까지 3회" 같은 걸 보여줄 수 있게 한다.
 */
export function badgeList(runs: RunLike[], streakWeeks = 0): Badge[] {
  const count = runs.length
  const total = runs.reduce((s, r) => s + r.distance_km, 0)
  const maxKm = Math.max(0, ...runs.map((r) => r.distance_km))
  const bestPace = personalBests(runs).fastest?.value ?? Infinity
  const wk = bestWeekCount(runs)
  const mo = bestMonthKm(runs)

  const b = (id: string, emoji: string, name: string, desc: string, cur: number, goal: number): Badge => ({
    id, emoji, name, desc, cur: Math.min(cur, goal), goal, done: cur >= goal,
  })

  return [
    b('first', '🌅', '첫 걸음', '첫 인증을 올려요', count, 1),
    b('ten', '🔟', '열 번', '인증 10회를 채워요', count, 10),
    b('fifty', '🏆', '쉰 번', '인증 50회를 채워요', count, 50),
    b('km10', '🏔️', '두 자리', '한 번에 10km를 달려요', maxKm, 10),
    b('half', '🎽', '하프', '한 번에 21.1km를 달려요', maxKm, 21.1),
    b('sub5', '⏱️', '5분 벽', "페이스 5'00\" 안쪽으로 달려요", bestPace <= 300 ? 1 : 0, 1),
    b('total100', '💯', '누적 100', '누적 100km를 넘겨요', total, 100),
    b('total500', '🚀', '누적 500', '누적 500km를 넘겨요', total, 500),
    b('week3', '📅', '주 3회', '한 주에 세 번 달려요', wk, 3),
    b('month50', '🌊', '한 달 50', '한 달에 50km를 채워요', mo, 50),
    b('streak4', '🔥', '4주 연속', '네 주 내리 인증해요', streakWeeks, 4),
    b('streak12', '💎', '12주 연속', '열두 주 내리 인증해요', streakWeeks, 12),
  ]
}

/* ---------- 에딩턴 수 ---------- */

export type Eddington = { value: number; need: number }

/**
 * E = 'E km 이상 달린 날이 E일 이상' 을 만족하는 가장 큰 수.
 * 거리와 꾸준함을 동시에 요구해서 한 번의 장거리로는 올릴 수 없고,
 * "다음 숫자까지 n번" 이 저절로 퀘스트가 된다. 러닝앱들이 안 쓰는 지표라 골랐다.
 */
export function eddington(runs: RunLike[]): Eddington {
  const byDay = new Map<string, number>()
  for (const r of runs) byDay.set(r.run_date, (byDay.get(r.run_date) ?? 0) + r.distance_km)

  const days = [...byDay.values()].sort((a, b) => b - a)
  let e = 0
  while (e < days.length && days[e] >= e + 1) e += 1

  const have = days.filter((d) => d >= e + 1).length
  return { value: e, need: e + 1 - have }
}

/* ---------- 꾸준함 점수 ---------- */

/**
 * 최근 n주 인증 횟수의 변동계수로 낸다 — 매주 비슷하게 달릴수록 100점.
 * 평균이 주 1회 미만이면 null. 안 그러면 '아예 안 달린 사람'이 편차 0으로 만점을 받는다.
 */
export function steadiness(runs: RunLike[], weeks = 8, today: Date = new Date()): number | null {
  const counts = weeklySeries(runs, weeks, today).map((w) => w.count)
  const mu = counts.reduce((a, b) => a + b, 0) / weeks
  if (mu < 1) return null
  const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mu) ** 2, 0) / weeks)
  return Math.round(100 * (1 - Math.min(sd / mu, 1)))
}

/* ---------- 최고 기록이 며칠째 그대로인가 ---------- */

/** 페이스 최고 기록을 세운 날로부터 며칠 지났나. "35일째 기록 그대로"가 가장 자연스러운 도전 신호다 */
export function daysSincePR(runs: RunLike[], today: Date = new Date()): number | null {
  const best = personalBests(runs).fastest
  if (!best) return null
  const d = parseISO(best.run.run_date)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.round((t.getTime() - d.getTime()) / 86400000))
}

/* ---------- 같이 달린 날 ---------- */

/** 두 명 이상이 같은 날 달린 날의 수. 7명짜리 소모임에서만 의미가 있는 숫자다 */
export function togetherDays(
  runs: { run_date: string; member_id: string }[],
  days = 30,
  today: Date = new Date(),
): { together: number; active: number } {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  from.setDate(from.getDate() - days + 1)
  const key = iso(from)

  const byDay = new Map<string, Set<string>>()
  for (const r of runs) {
    if (r.run_date < key) continue
    if (!byDay.has(r.run_date)) byDay.set(r.run_date, new Set())
    byDay.get(r.run_date)!.add(r.member_id)
  }
  return {
    together: [...byDay.values()].filter((s) => s.size >= 2).length,
    active: byDay.size,
  }
}

/* ---------- 기록 하나에 붙는 한마디 ---------- */

export type Highlight = { tone: 'gold' | 'good'; text: string } | null

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const h = Math.floor(s.length / 2)
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}

/**
 * 피드 카드에 붙일 한마디. 남과 비교하지 않고 '이 사람의 평소'와만 비교한다.
 * 느렸다는 말은 하지 않는다 — 나쁜 소식을 알리는 게 목적이 아니라 계속 올리게 하는 게 목적이다.
 */
export function highlight(run: RunLike, mine: RunLike[]): Highlight {
  if (mine.length < 3) return null

  const long = mine.filter((r) => r.distance_km >= 1)
  const pace = run.duration_sec / run.distance_km

  if (run.distance_km >= 1 && long.length >= 3 && pace <= Math.min(...long.map((r) => r.duration_sec / r.distance_km)))
    return { tone: 'gold', text: '개인 최고 페이스' }

  if (run.distance_km >= Math.max(...mine.map((r) => r.distance_km))) return { tone: 'gold', text: '최장 거리' }

  const others = mine.filter((r) => r !== run && r.distance_km >= 1)
  if (!others.length) return null

  const gap = Math.round(median(others.map((r) => r.duration_sec / r.distance_km)) - pace)
  if (run.distance_km >= 1 && gap >= 8) return { tone: 'good', text: `평소보다 ${gap}초 빨랐어요` }

  const far = run.distance_km / median(others.map((r) => r.distance_km))
  if (far >= 1.4) return { tone: 'good', text: '평소보다 멀리 달렸어요' }

  return null
}

/* ---------- 기록 예측 (Riegel) ---------- */

/**
 * Riegel 공식 T2 = T1 × (D2/D1)^1.06 — 한 기록에서 다른 거리의 예상 기록을 낸다.
 * 러닝앱들이 잘 안 보여주는 숫자라 '내 5km 예상 기록'으로 쓴다.
 */
export function riegel(distKm: number, sec: number, targetKm: number): number {
  return Math.round(sec * Math.pow(targetKm / distKm, 1.06))
}

/** 가장 좋은 기록 하나로 5km 예상 기록을 낸다. 3km 미만 기록만 있으면 신뢰도가 낮아 null */
export function predict5k(runs: RunLike[]): number | null {
  const usable = runs.filter((r) => r.distance_km >= 3)
  if (!usable.length) return null
  return Math.min(...usable.map((r) => riegel(r.distance_km, r.duration_sec, 5)))
}

