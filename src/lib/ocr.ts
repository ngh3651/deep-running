export type OcrResult = { distanceKm: number | null; durationSec: number | null }

// 상식적인 페이스 범위 — 시간과 페이스를 가르는 데 쓴다 (SPEC 4.4)
const MIN_PACE = 150 // 2'30"
const MAX_PACE = 900 // 15'00"

/** OCR 텍스트에서 거리·시간을 뽑는다. 순수 함수 — 유닛 테스트 대상 */
export function readRun(text: string): OcrResult {
  const distanceKm = pickDistance(text)
  return { distanceKm, durationSec: pickDuration(text, distanceKm) }
}

function pickDistance(text: string): number | null {
  const found = [...text.matchAll(/\d{1,2}[.,]\d{1,2}/g)]
    .map((m) => Number(m[0].replace(',', '.')))
    .filter((v) => v >= 0.1 && v <= 60)
  return found.length ? Math.max(...found) : null
}

function pickDuration(text: string, km: number | null): number | null {
  // 단어 경계를 쓰지 않는다 — OCR이 통계 줄을 30:125'35"412 처럼 붙여 읽는 일이 잦다
  const found = [...text.matchAll(/\d{1,2}:\d{2}(?::\d{2})?/g)]
    .map((m) => toSec(m[0]))
    .filter((v): v is number => v !== null && v >= 60 && v <= 21600)
  if (!found.length) return null

  // 거리를 알면 '페이스가 말이 되는' 후보만 남긴다 — 상단 시계·페이스 표기를 걸러낸다
  // 하나도 안 남으면 비워둔다 (SPEC 4.4 4번). 아무 값이나 채우면
  // 3km를 1분 23초에 달린 기록이 폼에 채워지고 그대로 저장된다
  if (km !== null) {
    const sane = found.filter((sec) => sec / km >= MIN_PACE && sec / km <= MAX_PACE)
    return sane.length ? Math.max(...sane) : null
  }
  return Math.max(...found)
}

function toSec(s: string): number | null {
  const p = s.split(':').map(Number)
  if (p.length === 2) return p[1] < 60 ? p[0] * 60 + p[1] : null
  if (p.length === 3) return p[1] < 60 && p[2] < 60 ? p[0] * 3600 + p[1] * 60 + p[2] : null
  return null
}

/**
 * 사진에서 숫자를 읽는다. 실패하면 조용히 빈 결과를 돌려준다 (SPEC 4.4 — 에러 문구 금지).
 * tesseract.js와 압축 모듈은 이 함수를 부를 때만 받아온다 (초기 번들에서 제외).
 */
export async function readRunFromImage(file: File): Promise<OcrResult> {
  try {
    const [{ createWorker }, { default: compress }] = await Promise.all([
      import('tesseract.js'),
      import('browser-image-compression'),
    ])
    const small = await compress(file, {
      maxWidthOrHeight: 1280,
      initialQuality: 0.9,
      fileType: 'image/jpeg',
      useWebWorker: true,
    })
    const worker = await createWorker('eng')
    try {
      await worker.setParameters({ tessedit_char_whitelist: `0123456789:.'"` })
      const { data } = await worker.recognize(small)
      return readRun(data.text)
    } finally {
      await worker.terminate()
    }
  } catch {
    return { distanceKm: null, durationSec: null }
  }
}
