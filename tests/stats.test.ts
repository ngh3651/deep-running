import { describe, expect, it } from 'vitest'
import {
  avgPace,
  badgeList,
  daysSincePR,
  eddington,
  heatMonthLabels,
  heatWeeks,
  levelOf,
  monthGrowth,
  steadiness,
  togetherDays,
  personalBests,
  predict5k,
  riegel,
  weeklySeries,
} from '../src/lib/stats'

const TODAY = new Date('2026-08-26T12:00:00') // 수요일
const run = (date: string, km: number, sec: number) => ({ run_date: date, distance_km: km, duration_sec: sec })

describe('avgPace', () => {
  it('총 시간 / 총 거리', () => expect(avgPace([run('2026-08-24', 5, 1500), run('2026-08-25', 5, 1700)])).toBe(320))
  it('기록이 없으면 null', () => expect(avgPace([])).toBeNull())
})

describe('weeklySeries', () => {
  const s = weeklySeries([run('2026-08-25', 5, 1500), run('2026-08-26', 3, 900), run('2026-08-11', 4, 1200)], 4, TODAY)

  it('요청한 주 수만큼, 오래된 주가 앞', () => {
    expect(s).toHaveLength(4)
    expect(s.map((w) => w.start)).toEqual(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24'])
  })
  it('인증이 없는 주도 0으로 채운다', () => expect(s[0]).toMatchObject({ km: 0, count: 0 }))
  it('같은 주 기록은 합친다', () => expect(s[3]).toMatchObject({ km: 8, count: 2 }))
  it('빈 주가 중간에 있어도 자리를 지킨다', () => expect(s[2]).toMatchObject({ km: 0, count: 0 }))
})

describe('heatWeeks', () => {
  const cols = heatWeeks([run('2026-08-25', 12, 3600), run('2026-08-24', 2, 700)], 3, TODAY)

  it('주 × 7일 격자', () => {
    expect(cols).toHaveLength(3)
    expect(cols[0]).toHaveLength(7)
  })
  it('월요일이 첫 칸', () => expect(cols[2][0].date).toBe('2026-08-24'))
  it('거리로 진하기가 갈린다', () => {
    expect(cols[2][0].level).toBe(1) // 2km
    expect(cols[2][1].level).toBe(4) // 12km
    expect(cols[2][2].level).toBe(0) // 안 달림
  })
  it('아직 오지 않은 날은 future', () => {
    expect(cols[2][2].future).toBe(false) // 8/26 오늘
    expect(cols[2][3].future).toBe(true) // 8/27
  })
  it('월 라벨은 달이 바뀌는 열에만', () =>
    expect(heatMonthLabels(cols).filter(Boolean)).toEqual(['8월']))
})

describe('personalBests', () => {
  const runs = [run('2026-08-01', 10, 3000), run('2026-08-02', 0.5, 100), run('2026-08-03', 5, 1400)]

  it('최장 거리', () => expect(personalBests(runs).longest?.run.distance_km).toBe(10))
  it('최고 페이스는 1km 미만을 빼고 고른다', () => {
    // 0.5km/100초 = 200초/km 가 가장 빠르지만 대표 기록이 되면 안 된다
    expect(personalBests(runs).fastest?.run.distance_km).toBe(5)
    expect(personalBests(runs).fastest?.value).toBe(280)
  })
  it('기록이 없으면 null', () => expect(personalBests([]).longest).toBeNull())
})

describe('monthGrowth', () => {
  const runs = [
    run('2026-08-10', 10, 3000), // 이번 달 300초/km
    run('2026-07-10', 5, 1750), // 지난달 350초/km
    run('2026-07-20', 5, 1750),
  ]
  const g = monthGrowth(runs, TODAY)

  it('거리 증감 %', () => expect(g.kmPct).toBe(0)) // 10 → 10
  it('횟수 증감', () => expect(g.countDiff).toBe(-1))
  it('페이스는 음수가 빨라진 것', () => expect(g.paceDiff).toBe(-50))
  it('지난달이 없으면 % 는 null', () =>
    expect(monthGrowth([run('2026-08-10', 5, 1500)], TODAY).kmPct).toBeNull())
})

describe('levelOf', () => {
  it('0km 는 새싹', () => expect(levelOf(0)).toMatchObject({ idx: 0, name: '새싹 러너', progress: 0 }))
  it('경계값은 달성으로 친다', () => expect(levelOf(10).name).toBe('동네 한 바퀴'))
  it('구간 중간 진행률', () => expect(levelOf(20).progress).toBeCloseTo(0.5))
  it('마지막 등급은 진행률 1', () => expect(levelOf(2000)).toMatchObject({ name: '전설', progress: 1, to: null }))
})

describe('badgeList', () => {
  const runs = [run('2026-08-24', 12, 3000), run('2026-08-25', 5, 1400), run('2026-08-26', 5, 1400)]
  const by = (id: string) => badgeList(runs, 5).find((b) => b.id === id)!

  it('첫 인증', () => expect(by('first').done).toBe(true))
  it('두 자리 — 한 번에 10km', () => expect(by('km10').done).toBe(true))
  it('하프는 아직', () => expect(by('half')).toMatchObject({ done: false, cur: 12, goal: 21.1 }))
  it('주 3회', () => expect(by('week3').done).toBe(true))
  it('스트릭은 인자로 받은 값을 쓴다', () => {
    expect(by('streak4').done).toBe(true)
    expect(by('streak12')).toMatchObject({ done: false, cur: 5 })
  })
  it('진행률은 목표를 넘지 않는다', () => expect(by('first').cur).toBe(1))
})

describe('eddington', () => {
  const e = (list: [string, number][]) => eddington(list.map(([d, km]) => run(d, km, 1800)))

  it('12·5·5·3km 를 달렸으면 E=3', () =>
    expect(e([['2026-08-01', 12], ['2026-08-02', 5], ['2026-08-03', 5], ['2026-08-04', 3]]))
      .toEqual({ value: 3, need: 1 }))
  it('같은 날 두 번 달리면 합쳐서 하루로 센다', () =>
    expect(e([['2026-08-01', 3], ['2026-08-01', 3]]).value).toBe(1))
  it('기록이 없으면 0', () => expect(eddington([])).toEqual({ value: 0, need: 1 }))
  it('5km 를 다섯 번이면 E=5', () =>
    expect(e([1, 2, 3, 4, 5].map((d) => [`2026-08-0${d}`, 5] as [string, number])).value).toBe(5))
})

describe('steadiness', () => {
  const every = ['2026-08-24', '2026-08-17', '2026-08-10', '2026-08-03']
  it('매주 같은 횟수면 100점', () =>
    expect(steadiness(every.map((d) => run(d, 5, 1500)), 4, TODAY)).toBe(100))
  it('들쭉날쭉하면 점수가 깎인다', () => {
    const s = steadiness([run('2026-08-24', 5, 1500), run('2026-08-25', 5, 1500), run('2026-08-26', 5, 1500), run('2026-08-10', 5, 1500)], 4, TODAY)
    expect(s).toBeLessThan(60)
  })
  it('주 1회도 안 되면 점수를 매기지 않는다 — 안 달린 사람이 만점을 받으면 안 된다', () =>
    expect(steadiness([run('2026-08-24', 5, 1500)], 8, TODAY)).toBeNull())
})

describe('daysSincePR · togetherDays', () => {
  it('최고 페이스를 세운 날로부터 며칠', () =>
    expect(daysSincePR([run('2026-08-20', 5, 1400), run('2026-08-25', 5, 1600)], TODAY)).toBe(6))
  it('기록이 없으면 null', () => expect(daysSincePR([], TODAY)).toBeNull())

  it('두 명 이상이 같은 날 달린 날만 센다', () => {
    const rows = [
      { run_date: '2026-08-25', member_id: 'a' },
      { run_date: '2026-08-25', member_id: 'b' },
      { run_date: '2026-08-24', member_id: 'a' },
    ]
    expect(togetherDays(rows, 30, TODAY)).toEqual({ together: 1, active: 2 })
  })
  it('같은 사람이 두 번 달린 건 같이 달린 게 아니다', () => {
    const rows = [
      { run_date: '2026-08-25', member_id: 'a' },
      { run_date: '2026-08-25', member_id: 'a' },
    ]
    expect(togetherDays(rows, 30, TODAY).together).toBe(0)
  })
  it('기간 밖은 세지 않는다', () =>
    expect(togetherDays([{ run_date: '2026-01-01', member_id: 'a' }], 30, TODAY).active).toBe(0))
})

describe('riegel · predict5k', () => {
  it('10km 50분 → 5km 예상', () => expect(riegel(10, 3000, 5)).toBe(1439))
  it('3km 미만만 있으면 예측하지 않는다', () => expect(predict5k([run('2026-08-01', 2, 600)])).toBeNull())
  it('가장 좋은 기록으로 예측한다', () =>
    expect(predict5k([run('2026-08-01', 10, 3600), run('2026-08-02', 10, 3000)])).toBe(1439))
})

