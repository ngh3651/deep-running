// 화면 자기 검토용 스크린샷 harness.
//   node scripts/shots.mjs            전체 시나리오
//   node scripts/shots.mjs home feed  일부만
//   node scripts/shots.mjs --dev      빌드 대신 vite dev 서버 사용 (빠름)
// 결과: .shots/*.png + .shots/contact.png (한 장에 모아본다 — 토큰·시간 절약)

import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { fixtures, thin, ME } from './fixtures.mjs'
import { handle } from './rest-mock.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, '.shots')
const PORT = 4178
const DEV = process.argv.includes('--dev')
// --live 는 가짜 데이터를 물리지 않고 진짜 Supabase 를 본다. 읽기만 하는 화면 확인용이다
const LIVE = process.argv.includes('--live')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const VIEW = { width: 390, height: 844 }

/** 시나리오: 이름 · 이동할 해시 · 데이터 상태 · 추가 동작 */
const SCENES = [
  { name: '01-login', route: '#/login', data: 'rich', noSession: true },
  { name: '02-home', route: '#/', data: 'rich' },
  { name: '03-home-empty', route: '#/', data: 'empty' },
  { name: '04-feed', route: '#/feed', data: 'rich' },
  { name: '05-upload', route: '#/upload', data: 'rich' },
  { name: '05b-upload-full', route: '#/upload', data: 'rich', full: true },
  { name: '06-ranking', route: '#/ranking', data: 'rich' },
  { name: '07-my', route: '#/my', data: 'rich' },
  { name: '08-my-full', route: '#/my', data: 'rich', full: true },
  { name: '09-home-full', route: '#/', data: 'rich', full: true },
  { name: '10-feed-fail', route: '#/feed', data: 'fail' },
  { name: '20-thin-home', route: '#/', data: 'thin', full: true },
  { name: '21-thin-feed', route: '#/feed', data: 'thin' },
  { name: '22-thin-rank', route: '#/ranking', data: 'thin' },
  { name: '23-thin-my', route: '#/my', data: 'thin', full: true },
  {
    // 올리고 → 보상 화면 → 톡방 공유 카드까지 실제로 눌러본다
    name: '11-done',
    route: '#/upload',
    data: 'rich',
    act: async (page) => {
      await page.fill('input[type=number]', '5.2')
      await page.fill('input[placeholder="16:49"]', '28:40')
      await page.fill('input[placeholder="오늘 컨디션 어땠어요?"]', '한강 야경 미쳤다')
      await page.click('button[type=submit]')
      await page.waitForSelector('.donebox')
      // 공유 시트가 없는 환경이라 파일로 떨어진다 — 그걸 받아서 카드 그림을 확인한다
      const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null)
      await page.click('.donebox .btn')
      const d = await dl
      if (d) await d.saveAs(resolve(OUT, '12-share-card.png'))
    },
  },
]

async function waitServer(url, ms = 60000) {
  const t0 = Date.now()
  for (;;) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {}
    if (Date.now() - t0 > ms) throw new Error(`서버가 안 뜬다: ${url}`)
    await new Promise((r) => setTimeout(r, 300))
  }
}

function run(cmd, args) {
  return new Promise((ok, no) => {
    const p = spawn(cmd, args, { cwd: ROOT, shell: true, stdio: 'inherit' })
    p.on('exit', (c) => (c === 0 ? ok() : no(new Error(`${cmd} exit ${c}`))))
  })
}

const main = async () => {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })

  if (!DEV) await run('npx', ['vite', 'build', '--logLevel', 'error'])
  const server = spawn(
    'npx',
    DEV ? ['vite', '--port', String(PORT), '--strictPort'] : ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, shell: true, stdio: 'ignore' },
  )
  const base = `http://localhost:${PORT}/`

  try {
    await waitServer(base)
    const browser = await chromium.launch()
    const scenes = only.length ? SCENES.filter((s) => only.some((o) => s.name.includes(o))) : SCENES

    for (const scene of scenes) {
      const ctx = await browser.newContext({
        viewport: VIEW,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul',
      })

      const data =
        scene.data === 'empty' ? { members: [], runs: [] } : scene.data === 'thin' ? thin() : fixtures()

      if (!LIVE)
      await ctx.route('**://*.supabase.co/**', async (route) => {
        if (scene.data === 'fail') return route.fulfill({ status: 500, body: '{}' })
        const req = route.request()
        let body = null
        try { body = req.postDataJSON() } catch {}
        const res = handle(req.url(), req.method(), data, body)
        await route.fulfill({
          status: res.status,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(res.body ?? []),
        })
      })

      if (!scene.noSession) {
        // --live 일 때는 운영 DB에 실제로 있는 멤버로 들어간다
        const who = LIVE ? { id: '23125149-297f-4469-972a-658b859420b9', name: '남규혁', emoji: '🏃' } : ME
        await ctx.addInitScript((m) => localStorage.setItem('dr_member', JSON.stringify(m)), who)
      }

      const page = await ctx.newPage()
      const errors = []
      const EXPECTED = /suggestions|cheers/ // 아직 없는 테이블을 물어보는 기능 탐지 — 정상이다
      const expected = (m) => EXPECTED.test(m.text()) || EXPECTED.test(m.location()?.url ?? '')
      page.on('console', (m) => m.type() === 'error' && !expected(m) && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push(String(e)))

      await page.goto(base + scene.route, { waitUntil: 'networkidle' })
      if (scene.act) await scene.act(page)
      await page.waitForTimeout(1600) // 카운트업·펜 애니메이션이 끝나길 기다린다

      // 전체 스크롤을 찍을 땐 고정 탭바를 잠깐 감춘다 — 안 그러면 카드 하나를 가린다
      if (scene.full) await page.addStyleTag({ content: ".tabbar{display:none}" })
      await page.screenshot({ path: resolve(OUT, `${scene.name}.png`), fullPage: Boolean(scene.full) })
      if (errors.length) console.log(`  ⚠ ${scene.name} 콘솔 에러:\n    ${errors.join('\n    ')}`)
      else console.log(`  ✓ ${scene.name}`)
      await ctx.close()
    }

    // 한 장짜리 대지 — 화면 여러 개를 한 번에 보려고
    const files = readdirSync(OUT).filter((f) => f.endsWith('.png') && f !== 'contact.png').sort()
    const html = `<body style="margin:0;background:#0B0F1A;font:12px system-ui;color:#93A0BC">
<div style="display:flex;flex-wrap:wrap;gap:14px;padding:14px">
${files.map((f) => `<figure style="margin:0"><img src="${f}" style="width:230px;display:block;border:1px solid #26314F;border-radius:8px"><figcaption style="padding-top:6px">${f.replace('.png', '')}</figcaption></figure>`).join('\n')}
</div></body>`
    writeFileSync(resolve(OUT, 'contact.html'), html)
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await p.goto(pathToFileURL(resolve(OUT, 'contact.html')).href)
    await p.waitForTimeout(500)
    await p.screenshot({ path: resolve(OUT, 'contact.png'), fullPage: true })
    await browser.close()
    console.log(`\n대지: .shots/contact.png (${files.length}장)`)
  } finally {
    server.kill()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
