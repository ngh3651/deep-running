import { describe, expect, it } from 'vitest'
import { readRun } from '../src/lib/ocr'

// char whitelist(숫자·구분자만) 때문에 OCR 결과는 한글 없이 숫자만 남는다
const NIKE = `9:41
5.40
30:12  5'35"  412`

const SAMSUNG = `10:23
3.01
16:49
5'35"
205`

describe('readRun — 나이키런클럽', () => {
  const r = readRun(NIKE)
  it('거리', () => expect(r.distanceKm).toBe(5.4))
  it('시간 — 상단 시계(9:41)가 아니라 30:12', () => expect(r.durationSec).toBe(1812))
})

describe('readRun — 삼성헬스', () => {
  const r = readRun(SAMSUNG)
  it('거리', () => expect(r.distanceKm).toBe(3.01))
  it('시간 — 상단 시계(10:23)가 아니라 16:49', () => expect(r.durationSec).toBe(1009))
})

describe('readRun — OCR이 붙여 읽은 경우 (실제 인식 결과)', () => {
  // 나이키런클럽 모사 화면의 실제 OCR 출력 — 통계 줄이 공백 없이 붙는다
  const MERGED = `9:41 10
5.40
30:125'35"412`

  it('붙어 있어도 거리·시간을 뽑는다', () => {
    expect(readRun(MERGED)).toEqual({ distanceKm: 5.4, durationSec: 1812 })
  })

  // 삼성헬스 모사 화면의 실제 OCR 출력
  const SAMSUNG_RAW = `22
3.01.
2
16:49 5'35"
2 02
205 168`

  it('잡음이 섞여도 거리·시간을 뽑는다', () => {
    expect(readRun(SAMSUNG_RAW)).toEqual({ distanceKm: 3.01, durationSec: 1009 })
  })
})

describe('readRun — 가르기 규칙', () => {
  it('페이스가 콜론으로 나와도 시간을 고른다', () => {
    expect(readRun('4.00\n5:40\n22:40').durationSec).toBe(1360)
  })

  it('거리를 못 찾으면 시간 후보 중 가장 큰 값', () => {
    expect(readRun('9:41\n30:12')).toEqual({ distanceKm: null, durationSec: 1812 })
  })

  it('한 시간 넘는 기록', () => {
    expect(readRun('10.20\n1:05:55')).toEqual({ distanceKm: 10.2, durationSec: 3955 })
  })

  it('쉼표 소수점도 읽는다', () => expect(readRun('7,25\n40:00').distanceKm).toBe(7.25))

  it('거리 후보가 여럿이면 가장 큰 값 (칼로리·고도 같은 잡음 제외)', () => {
    expect(readRun('0.85\n12.40\n1.02\n58:20').distanceKm).toBe(12.4)
  })

  it('범위 밖 거리는 버린다', () => expect(readRun('99.99\n30:00').distanceKm).toBeNull())

  it('초가 60 이상인 값은 버린다', () => expect(readRun('5.00\n30:75').durationSec).toBeNull())

  it('1분 미만은 버린다', () => expect(readRun('5.00\n0:45').durationSec).toBeNull())

  it('무관한 사진이면 둘 다 null', () => {
    expect(readRun('...')).toEqual({ distanceKm: null, durationSec: null })
  })

  it('빈 텍스트도 조용히 null', () => {
    expect(readRun('')).toEqual({ distanceKm: null, durationSec: null })
  })
})
