// 규칙이 슬금슬금 무너지는 걸 잡는다. CLAUDE.md 의 규율 중 기계가 볼 수 있는 것만 본다.
//   node scripts/guard.mjs
// 깨지면 exit 1. CI 에서도 돈다.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const fails = []
const rel = (p) => relative(ROOT, p).split(sep).join('/')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', '.shots'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const files = walk(ROOT)
const read = (p) => readFileSync(p, 'utf8')

/* ---------- 1. 파일 구조 (SPEC 10장) ---------- */

const ALLOWED = [
  /^(SPEC|CLAUDE|README)\.md$/,
  /^\.git(ignore|attributes)$/,
  /^(index\.html|package\.json|package-lock\.json|vite\.config\.ts|tsconfig\.json)$/,
  /^\.github\/workflows\/(ci|deploy)\.yml$/,
  /^\.claude\//,
  /^docs\/.+\.png$/,
  /^public\//,
  /^scripts\/.+\.mjs$/,
  /^supabase\/(migrations\/.+\.sql|seed_demo\.sql)$/,
  /^src\/(main\.tsx|App\.tsx|styles\.css)$/,
  /^src\/(assets|lib|components|pages)\/.+$/,
  /^tests\/.+\.test\.ts$/,
]

for (const f of files) {
  const r = rel(f)
  if (!ALLOWED.some((re) => re.test(r))) fails.push(`구조 밖 파일: ${r} — SPEC 10장의 폴더 구조에 넣거나 SPEC 을 고쳐라`)
}

/* ---------- 2. 색 (SPEC 7장 — 토큰 밖 색 금지) ---------- */

const HEX = /#[0-9a-fA-F]{3,8}\b/g

for (const f of files.filter((f) => /\.(tsx?|css)$/.test(f))) {
  const r = rel(f)
  let body = read(f)
  // styles.css 의 :root 선언과 아이콘/이미지 데이터 URI 는 색 정의 자리라 봐준다
  if (r === 'src/styles.css') body = body.replace(/:root \{[\s\S]*?\n\}/, '')
  // 공유 카드는 canvas 라 CSS 변수를 못 읽는다 — 토큰과 같은 값을 쓰는지 따로 본다
  if (r === 'src/lib/card.ts') continue
  const hits = [...body.matchAll(HEX)]
  if (hits.length) fails.push(`토큰 밖 색: ${r} → ${[...new Set(hits.map((h) => h[0]))].join(', ')}`)
}

// card.ts 는 토큰과 같은 값만 써야 한다
const TOKENS = ['#0B0F1A', '#141B2E', '#1D2740', '#26314F', '#F4F6FB', '#93A0BC', '#FF6B2C', '#3DDC97', '#FF5D73', '#FFC24B', '#FFB020']
for (const hit of new Set([...read(join(ROOT, 'src/lib/card.ts')).matchAll(HEX)].map((h) => h[0].toUpperCase()))) {
  if (!TOKENS.includes(hit)) fails.push(`공유 카드에 토큰 밖 색: ${hit}`)
}

/* ---------- 3. 영어 문구 (CLAUDE.md 기본값 규칙) ---------- */

// 고유명사·단위·기술 용어는 봐준다
const OK_WORDS = new Set([
  'deep', 'running', 'dr', 'km', 'spm', 'ocr', 'svg', 'png', 'sql', 'esc', 'id', 'ui',
])

for (const f of files.filter((f) => /\.tsx$/.test(f))) {
  const r = rel(f)
  const body = read(f)
  const strings = []
  // JSX 사이의 글자. '=>' 와 '>=' 뒤는 타입·비교식이라 건너뛴다
  for (const m of body.matchAll(/(?<![=\-*])>([^<>{}\n]{2,})</g)) strings.push(m[1])
  // 사람에게 읽히는 속성
  for (const m of body.matchAll(/(?:placeholder|aria-label|alt|title)="([^"]+)"/g)) strings.push(m[1])

  for (const s of strings) {
    const t = s.trim()
    if (!t) continue
    const hangul = /[가-힣]/.test(t)
    // 한글이 섞인 문구에 영어 단어가 끼어 있나
    if (hangul) {
      const bad = [...t.matchAll(/[A-Za-z]{2,}/g)].map((m) => m[0].toLowerCase()).filter((w) => !OK_WORDS.has(w))
      if (bad.length) fails.push(`영어 문구: ${r} → "${t}" (${[...new Set(bad)].join(', ')})`)
      continue
    }
    // 한글이 없으면 '문장처럼 생긴 것'만 잡는다 — 코드 조각은 괄호·연산자 때문에 걸러진다
    if (!/^[A-Za-z][A-Za-z .,!?'-]*$/.test(t)) continue
    const words = t.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && !words.every((w) => OK_WORDS.has(w.toLowerCase().replace(/[.,!?']/g, ''))))
      fails.push(`영어 문구: ${r} → "${t}"`)
  }
}

/* ---------- 4. 의존성 화이트리스트 (SPEC 8장) ---------- */

const pkg = JSON.parse(read(join(ROOT, 'package.json')))
const OK_DEPS = ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'browser-image-compression', 'date-fns', 'tesseract.js']
const OK_DEV = ['typescript', 'vite', '@vitejs/plugin-react', 'vitest', 'playwright', '@types/react', '@types/react-dom']

for (const d of Object.keys(pkg.dependencies ?? {})) if (!OK_DEPS.includes(d)) fails.push(`허용 목록 밖 의존성: ${d}`)
for (const d of Object.keys(pkg.devDependencies ?? {})) if (!OK_DEV.includes(d)) fails.push(`허용 목록 밖 개발 의존성: ${d}`)

/* ---------- 5. 남겨두면 안 되는 것 ---------- */

for (const f of files.filter((f) => /^src[\\/]/.test(relative(ROOT, f)) && /\.tsx?$/.test(f))) {
  const body = read(f)
  if (/console\.(log|debug)\(/.test(body)) fails.push(`디버그 출력이 남았다: ${rel(f)}`)
  if (/:\s*any\b/.test(body)) fails.push(`any 타입: ${rel(f)} — 타입 검사를 공짜로 못 받게 된다`)
}

/* ---------- 결과 ---------- */

if (fails.length) {
  console.error(`규율 위반 ${fails.length}건\n`)
  for (const f of fails) console.error(`  · ${f}`)
  process.exit(1)
}
console.log('규율 통과 — 구조·색·문구·의존성 이상 없음')
