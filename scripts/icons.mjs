// 홈 화면 아이콘을 그려 public/ 에 굽는다. 한 번 돌리고 결과 PNG를 커밋한다.
//   node scripts/icons.mjs
// 이모지를 쓰면 만드는 컴퓨터의 이모지 폰트가 그대로 박혀서, 대신 글자와 그라디언트로 그린다.

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const ROOT = resolve(import.meta.dirname, '..')
const SIZES = [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180],
]

const draw = (size) => {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')
  const s = size / 512

  const grad = g.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#FF6B2C')
  grad.addColorStop(1, '#FFB020')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)

  // 안쪽 어두운 원 — 앱의 히어로 카드와 같은 인상
  g.fillStyle = '#0B0F1A'
  g.beginPath()
  g.arc(size / 2, size / 2, 186 * s, 0, Math.PI * 2)
  g.fill()

  g.fillStyle = '#F4F6FB'
  g.font = `800 ${168 * s}px -apple-system, 'Segoe UI', sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.letterSpacing = `${-6 * s}px`
  g.fillText('DR', size / 2, size / 2 + 6 * s)

  return cv.toDataURL('image/png')
}

const b = await chromium.launch()
const page = await b.newPage()
await page.setContent('<body></body>')
for (const [file, size] of SIZES) {
  const url = await page.evaluate(draw, size)
  writeFileSync(resolve(ROOT, file), Buffer.from(url.split(',')[1], 'base64'))
  console.log(`${file} (${size}px)`)
}
await b.close()
