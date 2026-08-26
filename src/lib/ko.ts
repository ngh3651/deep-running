/** 한국어 조사 고르기. 받침에 따라 갈리는 걸 화면에서 매번 손으로 쓰면 틀린다 */

const JONG = (word: string): number | null => {
  const c = word.charCodeAt(word.length - 1) - 0xac00
  return c < 0 || c > 11171 ? null : c % 28
}

/** '규혁으로' / '새친구로' — 받침이 없거나 ㄹ이면 '로' */
export function ro(word: string): string {
  const j = JONG(word)
  if (j === null) return '로'
  return j === 0 || j === 8 ? '로' : '으로'
}

// 숫자를 한국어로 읽었을 때 받침이 있는지 — 0 영/십, 1 일, 3 삼, 6 육, 7 칠, 8 팔 은 받침이 있다
const DIGIT_HAS_JONG = [true, true, false, true, false, false, true, true, true, false]

/** '2가' / '3이' — 숫자 뒤에 붙는 이/가 */
export function iga(n: number): string {
  return DIGIT_HAS_JONG[Math.abs(n) % 10] ? '이' : '가'
}
