import { parseISO } from 'date-fns'
import { MILESTONES, type Milestone } from './constants'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 페이스: round(초/km) → 5'35" (SPEC 5장) */
export function paceLabel(durationSec: number, distanceKm: number): string {
  const total = Math.round(durationSec / distanceKm)
  return `${Math.floor(total / 60)}'${pad2(total % 60)}"`
}

/** 시간 표기: 1009 → 16:49, 3955 → 1:05:55 */
export function durationLabel(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** 날짜 표기: 2026-08-24 → 8/24 월 */
export function dateLabel(iso: string): string {
  const d = parseISO(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${DOW[d.getDay()]}`
}

/** km 표기: 6.2 → "6.2", 5 → "5.0" */
export function kmLabel(km: number): string {
  return km.toFixed(km >= 100 ? 0 : 1)
}

/** 주 경계는 월요일 00:00 (SPEC 5장) */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

const weekKey = (d: Date) => weekStart(d).toISOString().slice(0, 10)

export type Streak = { weeks: number; thisWeekMissing: boolean }

/**
 * 주간 스트릭: 이번 주 인증이 있으면 이번 주 포함해 뒤로 연속인 주 수.
 * 이번 주가 0건이면 지난주부터 뒤로 센 값 + '이번 주 아직' 플래그 (SPEC 5장)
 */
export function weekStreak(runDates: string[], today: Date = new Date()): Streak {
  const weeks = new Set(runDates.map((iso) => weekKey(parseISO(iso))))
  const cursor = weekStart(today)
  const thisWeekMissing = !weeks.has(weekKey(cursor))
  if (thisWeekMissing) cursor.setDate(cursor.getDate() - 7)

  let n = 0
  while (weeks.has(weekKey(cursor))) {
    n += 1
    cursor.setDate(cursor.getDate() - 7)
  }
  return { weeks: n, thisWeekMissing }
}

type Distanced = { distance_km: number }
type Dated = Distanced & { run_date: string }

export function sumKm(runs: Distanced[]): number {
  return Math.round(runs.reduce((s, r) => s + r.distance_km, 0) * 100) / 100
}

/** 이번 달(달력 기준) 합계 km */
export function monthKm(runs: Dated[], today: Date = new Date()): number {
  return sumKm(
    runs.filter((r) => {
      const d = parseISO(r.run_date)
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
    }),
  )
}

/** 이번 주 합계 */
export function thisWeek(runs: Dated[], today: Date = new Date()) {
  const from = weekKey(today)
  const mine = runs.filter((r) => weekKey(parseISO(r.run_date)) === from)
  return { count: mine.length, km: sumKm(mine) }
}


export type Journey = {
  total: number
  currentIndex: number
  current: Milestone
  next: Milestone | null
  progress: number
  remainKm: number
}

/**
 * 종주 진행: 마지막으로 `누적 >= 마일스톤km` 를 만족한 마일스톤이 현재 구간의 시작.
 * 누적이 정확히 마일스톤 값이면 달성으로 친다 (SPEC 5장)
 */
export function journey(totalKm: number): Journey {
  let i = 0
  while (i + 1 < MILESTONES.length && totalKm >= MILESTONES[i + 1].km) i += 1

  const current = MILESTONES[i]
  const next = i + 1 < MILESTONES.length ? MILESTONES[i + 1] : null
  if (!next) return { total: totalKm, currentIndex: i, current, next, progress: 1, remainKm: 0 }

  const span = next.km - current.km
  const progress = Math.min(1, Math.max(0, (totalKm - current.km) / span))
  return {
    total: totalKm,
    currentIndex: i,
    current,
    next,
    progress,
    remainKm: Math.round((next.km - totalKm) * 100) / 100,
  }
}

export type Period = 'week' | 'month' | 'all'

export type RankRow = { id: string; name: string; emoji: string; count: number; km: number }

export function inPeriod(iso: string, period: Period, today: Date = new Date()): boolean {
  if (period === 'all') return true
  const d = parseISO(iso)
  if (period === 'month') return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
  return weekKey(d) === weekKey(today)
}

type RunRow = { member_id: string; run_date: string; distance_km: number }
type MemberRow = { id: string; name: string; emoji: string }

/** 랭킹: 인증 횟수 ↓ → 거리 ↓ → 이름 가나다 (원칙 3 — 꾸준함 우선) */
export function rank(
  runs: RunRow[],
  members: MemberRow[],
  period: Period,
  today: Date = new Date(),
): RankRow[] {
  const acc = new Map<string, { count: number; km: number }>()
  for (const r of runs) {
    if (!inPeriod(r.run_date, period, today)) continue
    const cur = acc.get(r.member_id) ?? { count: 0, km: 0 }
    acc.set(r.member_id, { count: cur.count + 1, km: cur.km + r.distance_km })
  }

  return members
    .filter((m) => acc.has(m.id))
    .map((m) => {
      const a = acc.get(m.id)!
      return { id: m.id, name: m.name, emoji: m.emoji, count: a.count, km: Math.round(a.km * 100) / 100 }
    })
    .sort((a, b) => b.count - a.count || b.km - a.km || a.name.localeCompare(b.name, 'ko'))
}
