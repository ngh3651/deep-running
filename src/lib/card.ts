import { dateLabel, durationLabel, kmLabel, paceLabel } from './calc'

/**
 * 톡방에 올릴 인증 카드를 브라우저에서 그린다. canvas 2D만 쓰고 의존성은 없다.
 *
 * SPEC 15장의 최대 리스크가 '톡방에도 올리고 웹에도 올리는 이중 업로드'였다.
 * 웹에 먼저 올리고 여기서 만든 카드를 톡방에 공유하면 순서가 뒤집혀서 한 번만 올리면 된다.
 */

const S = 1080
const PAD = 84

export type CardData = {
  name: string
  emoji: string
  distanceKm: number
  durationSec: number
  runDate: string
  memo?: string | null
  /** 소모임 누적 — 카드 아래 한 줄 */
  footer?: string
}

const FONT = "'Pretendard Variable', -apple-system, sans-serif"

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export async function drawCard(d: CardData): Promise<Blob | null> {
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const g = cv.getContext('2d')
  if (!g) return null

  // 웹폰트가 다 뜬 뒤에 그려야 글자가 시스템 폰트로 새지 않는다
  try {
    await document.fonts.ready
  } catch {}

  g.fillStyle = '#0B0F1A'
  g.fillRect(0, 0, S, S)

  // 왼쪽 위에서 번지는 주황 — 앱의 히어로 카드와 같은 인상
  const glow = g.createRadialGradient(S * 0.1, 0, 0, S * 0.1, 0, S * 0.95)
  glow.addColorStop(0, 'rgba(255,107,44,0.22)')
  glow.addColorStop(1, 'rgba(255,107,44,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, S, S)

  g.strokeStyle = '#26314F'
  g.lineWidth = 2
  roundRect(g, 24, 24, S - 48, S - 48, 44)
  g.stroke()

  g.textBaseline = 'alphabetic'

  // 머리 — 브랜드와 날짜
  g.fillStyle = '#93A0BC'
  g.font = `800 30px ${FONT}`
  g.letterSpacing = '4px'
  g.fillText('DEEP RUNNING', PAD, PAD + 34)
  g.letterSpacing = '0px'

  g.textAlign = 'right'
  g.font = `700 30px ${FONT}`
  g.fillText(dateLabel(d.runDate), S - PAD, PAD + 34)
  g.textAlign = 'left'

  // 누구
  g.font = `400 62px ${FONT}`
  g.fillText(d.emoji, PAD, 330)
  g.fillStyle = '#F4F6FB'
  g.font = `800 54px ${FONT}`
  g.fillText(d.name, PAD + 82, 330)

  // 거리 — 이 카드의 주인공
  const km = kmLabel(d.distanceKm)
  g.font = `800 232px ${FONT}`
  g.letterSpacing = '-8px'
  const grad = g.createLinearGradient(PAD, 0, PAD + 620, 0)
  grad.addColorStop(0, '#FF6B2C')
  grad.addColorStop(1, '#FFB020')
  g.fillStyle = grad
  g.fillText(km, PAD, 560)
  const kmW = g.measureText(km).width
  g.letterSpacing = '0px'
  g.fillStyle = '#93A0BC'
  g.font = `800 62px ${FONT}`
  g.fillText('km', PAD + kmW + 18, 560)

  // 메모
  if (d.memo) {
    g.fillStyle = '#F4F6FB'
    g.font = `600 38px ${FONT}`
    const text = d.memo.length > 26 ? d.memo.slice(0, 25) + '…' : d.memo
    g.fillText(text, PAD, 646)
  }

  // 페이스 · 시간
  const boxY = 712
  const boxH = 168
  const boxW = (S - PAD * 2 - 24) / 2
  const stats: [string, string][] = [
    ['페이스', paceLabel(d.durationSec, d.distanceKm)],
    ['시간', durationLabel(d.durationSec)],
  ]
  stats.forEach(([label, value], i) => {
    const x = PAD + i * (boxW + 24)
    g.fillStyle = '#141B2E'
    roundRect(g, x, boxY, boxW, boxH, 28)
    g.fill()
    g.strokeStyle = '#26314F'
    g.lineWidth = 2
    g.stroke()

    g.fillStyle = '#93A0BC'
    g.font = `700 28px ${FONT}`
    g.fillText(label, x + 34, boxY + 62)
    g.fillStyle = '#F4F6FB'
    g.font = `800 66px ${FONT}`
    g.fillText(value, x + 34, boxY + 132)
  })

  // 발 — 소모임 누적
  if (d.footer) {
    g.fillStyle = '#93A0BC'
    g.font = `700 30px ${FONT}`
    g.textAlign = 'center'
    g.fillText(d.footer, S / 2, S - PAD + 6)
    g.textAlign = 'left'
  }

  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'))
}

export type ShareResult = 'shared' | 'downloaded' | 'failed'

/** 공유 시트가 있으면 그걸 열고(톡방으로 바로 간다), 없으면 파일로 떨군다 */
export async function shareCard(d: CardData): Promise<ShareResult> {
  const blob = await drawCard(d)
  if (!blob) return 'failed'

  const file = new File([blob], `deep-running-${d.runDate}.png`, { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return 'shared'
    }
  } catch (e) {
    // 사용자가 공유 시트를 닫은 것도 여기로 온다 — 그때는 파일을 떨구지 않는다
    if (e instanceof Error && e.name === 'AbortError') return 'shared'
  }

  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
