import { parseISO } from 'date-fns'

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
