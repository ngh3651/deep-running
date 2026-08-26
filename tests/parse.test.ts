import { describe, expect, it } from 'vitest'
import { parseDistance, parseDuration } from '../src/lib/parse'

describe('parseDuration', () => {
  it('mm:ss', () => expect(parseDuration('16:49')).toBe(1009))
  it('h:mm:ss', () => expect(parseDuration('1:05:55')).toBe(3955))
  it('숫자만이면 분으로 읽는다', () => expect(parseDuration('28')).toBe(1680))
  it('0은 거부', () => expect(parseDuration('0')).toBeNull())
  it('글자는 거부', () => expect(parseDuration('abc')).toBeNull())

  it('앞뒤 공백은 무시', () => expect(parseDuration(' 16:49 ')).toBe(1009))
  it('초가 60 이상이면 거부', () => expect(parseDuration('16:70')).toBeNull())
  it('1분 미만은 거부', () => expect(parseDuration('0:45')).toBeNull())
  it('6시간 초과는 거부', () => expect(parseDuration('6:00:01')).toBeNull())
  it('빈 값은 거부', () => expect(parseDuration('')).toBeNull())
})

describe('parseDistance', () => {
  it('소수 둘째 자리까지', () => expect(parseDistance('3.01')).toBe(3.01))
  it('정수', () => expect(parseDistance('5')).toBe(5))
  it('0.1 미만은 거부', () => expect(parseDistance('0.05')).toBeNull())
  it('60 초과는 거부', () => expect(parseDistance('60.5')).toBeNull())
  it('글자는 거부', () => expect(parseDistance('5km')).toBeNull())
})
