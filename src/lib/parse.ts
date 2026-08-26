/** 시간 입력 파싱: "16:49"→1009, "1:05:55"→3955, "28"→1680(분). 못 읽으면 null */
export function parseDuration(input: string): number | null {
  const s = input.trim()
  let sec: number

  if (/^\d{1,3}$/.test(s)) {
    sec = Number(s) * 60
  } else if (/^\d{1,3}:\d{1,2}$/.test(s)) {
    const [m, ss] = s.split(':').map(Number)
    if (ss > 59) return null
    sec = m * 60 + ss
  } else if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(s)) {
    const [h, m, ss] = s.split(':').map(Number)
    if (m > 59 || ss > 59) return null
    sec = h * 3600 + m * 60 + ss
  } else {
    return null
  }

  // DB 제약과 동일한 범위 (1분 ~ 6시간)
  return sec >= 60 && sec <= 21600 ? sec : null
}

/** 거리 입력 파싱: 0.1~60km, 소수 둘째 자리까지. 벗어나면 null */
export function parseDistance(input: string): number | null {
  const s = input.trim()
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null
  const km = Number(s)
  return km >= 0.1 && km <= 60 ? km : null
}

/**
 * 케이던스(분당 걸음 수) 파싱. 100~250 밖은 거른다 —
 * 사람이 1분에 250보 넘게 구르지 않고, 100보 미만이면 걷는 것에 가깝다.
 */
export function parseCadence(input: string): number | null {
  const s = input.trim()
  if (!/^\d{2,3}$/.test(s)) return null
  const spm = Number(s)
  return spm >= 100 && spm <= 250 ? spm : null
}
