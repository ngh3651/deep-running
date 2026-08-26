import { describe, expect, it } from 'vitest'
import {
  dateLabel,
  durationLabel,
  journey,
  monthKm,
  paceLabel,
  rank,
  sumKm,
  weekStart,
  weekStreak,
} from '../src/lib/calc'

const D = (iso: string) => new Date(iso + 'T12:00:00')

describe('paceLabel', () => {
  it('SPEC 5장 예시 — 1009초 / 3.01km', () => expect(paceLabel(1009, 3.01)).toBe("5'35\"")) 
  it('초가 한 자리면 0을 채운다 — 1812초 / 5.4km', () => expect(paceLabel(1812, 5.4)).toBe("5'36\""))
  it('10분 넘는 페이스', () => expect(paceLabel(3600, 5)).toBe("12'00\""))
})

describe('durationLabel', () => {
  it('한 시간 미만', () => expect(durationLabel(1009)).toBe('16:49'))
  it('한 시간 이상', () => expect(durationLabel(3955)).toBe('1:05:55'))
})

describe('weekStart — 월요일 00:00 경계', () => {
  it('일요일은 그 주 월요일에 붙는다', () =>
    expect(weekStart(D('2026-08-23')).toDateString()).toBe(D('2026-08-17').toDateString()))
  it('월요일은 새 주의 시작', () =>
    expect(weekStart(D('2026-08-24')).toDateString()).toBe(D('2026-08-24').toDateString()))
})

describe('weekStreak', () => {
  const today = D('2026-08-26') // 수요일

  it('이번 주 포함 연속 3주', () => {
    expect(weekStreak(['2026-08-25', '2026-08-19', '2026-08-12'], today)).toEqual({
      weeks: 3,
      thisWeekMissing: false,
    })
  })

  it('이번 주만 없으면 지난주부터 세고 플래그를 세운다 (SPEC 5장 예시)', () => {
    expect(weekStreak(['2026-08-20', '2026-08-13', '2026-08-06'], today)).toEqual({
      weeks: 3,
      thisWeekMissing: true,
    })
  })

  it('중간에 빈 주가 있으면 거기서 끊긴다', () => {
    expect(weekStreak(['2026-08-25', '2026-08-19', '2026-08-05'], today)).toEqual({
      weeks: 2,
      thisWeekMissing: false,
    })
  })

  it('기록이 없으면 0주', () => expect(weekStreak([], today)).toEqual({ weeks: 0, thisWeekMissing: true }))

  it('주 경계 — 일요일 기록은 지난주로 센다', () => {
    expect(weekStreak(['2026-08-23'], today)).toEqual({ weeks: 1, thisWeekMissing: true })
  })

  it('주 경계 — 월요일 기록은 이번 주로 센다', () => {
    expect(weekStreak(['2026-08-24'], today)).toEqual({ weeks: 1, thisWeekMissing: false })
  })
})

describe('집계', () => {
  const runs = [
    { run_date: '2026-08-24', distance_km: 6.2 },
    { run_date: '2026-08-19', distance_km: 8.1 },
    { run_date: '2026-07-29', distance_km: 3.5 },
  ]
  it('누적 합', () => expect(sumKm(runs)).toBe(17.8))
  it('이번 달만 합산', () => expect(monthKm(runs, D('2026-08-26'))).toBe(14.3))
  it('부동소수 오차 없이 반올림', () => expect(sumKm([{ distance_km: 3.01 }, { distance_km: 0.1 }])).toBe(3.11))
})

describe('dateLabel', () => {
  it('M/D 요일', () => expect(dateLabel('2026-08-24')).toBe('8/24 월'))
})

describe('journey — 종주 진행', () => {
  it('시작 전', () => {
    const j = journey(0)
    expect([j.current.place, j.next?.place, j.progress, j.remainKm]).toEqual(['인하대 출발', '송도', 0, 10])
  })

  it('마일스톤에 정확히 도달하면 달성으로 친다 (경계값)', () => {
    const j = journey(50)
    expect(j.current.place).toBe('서울 한강')
    expect(j.next?.place).toBe('춘천')
    expect(j.progress).toBe(0)
  })

  it('마일스톤 직전은 아직 이전 구간', () => {
    const j = journey(49.99)
    expect(j.current.place).toBe('송도')
    expect(j.next?.place).toBe('서울 한강')
  })

  it('구간 중간 진행률', () => {
    const j = journey(69.01)
    expect(j.current.place).toBe('서울 한강')
    expect(Math.round(j.progress * 1000) / 10).toBe(23.8)
    expect(j.remainKm).toBe(60.99)
  })

  it('마지막 도착지를 넘으면 완주', () => {
    const j = journey(1700)
    expect(j.current.place).toBe('후쿠오카')
    expect(j.next).toBeNull()
    expect(j.progress).toBe(1)
  })
})

describe('rank — 랭킹 정렬', () => {
  const members = [
    { id: 'a', name: '하늘', emoji: '🌙' },
    { id: 'b', name: '가온', emoji: '🍀' },
    { id: 'c', name: '지민', emoji: '🔥' },
  ]
  const runs = [
    { member_id: 'a', run_date: '2026-08-24', distance_km: 5 },
    { member_id: 'a', run_date: '2026-08-25', distance_km: 5 },
    { member_id: 'b', run_date: '2026-08-24', distance_km: 5 },
    { member_id: 'b', run_date: '2026-08-25', distance_km: 5 },
    { member_id: 'c', run_date: '2026-08-24', distance_km: 30 },
  ]
  const today = D('2026-08-26')

  it('횟수가 많은 쪽이 먼저 — 거리가 많아도 밀린다', () => {
    expect(rank(runs, members, 'all', today).map((r) => r.name)).toEqual(['가온', '하늘', '지민'])
  })

  it('횟수·거리가 같으면 이름 가나다순', () => {
    const r = rank(runs, members, 'all', today)
    expect([r[0].name, r[1].name]).toEqual(['가온', '하늘'])
  })

  it('기간 밖 기록은 빼고 센다', () => {
    const older = [...runs, { member_id: 'c', run_date: '2026-07-01', distance_km: 40 }]
    expect(rank(older, members, 'month', today).find((r) => r.name === '지민')!.km).toBe(30)
  })

  it('기간 내 기록이 없는 멤버는 빠진다', () => {
    expect(rank(runs, members, 'week', D('2026-09-10'))).toEqual([])
  })
})
