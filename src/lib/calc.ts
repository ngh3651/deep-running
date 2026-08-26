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
