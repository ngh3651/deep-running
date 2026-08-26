import { useEffect, useSyncExternalStore } from 'react'
import { supabase, type Member, type Run } from './supabase'

/**
 * 소모임 데이터 한 벌을 한 번만 받아서 모든 화면이 나눠 쓴다.
 * 상태관리 라이브러리가 아니라 모듈 변수 + useSyncExternalStore 40줄이다.
 * 화면마다 따로 받으면 탭을 옮길 때마다 스피너가 돌고, '나 vs 소모임' 같은 걸 못 만든다.
 */

export type FeedRun = Run & { members: { name: string; emoji: string } | null }

/**
 * DB에 아직 없는 칸·테이블이 있는지 본다.
 * 스키마 변경 SQL은 소모임장이 Supabase 콘솔에서 직접 돌려야 해서(SPEC 13장),
 * 그 전까지는 해당 기능을 조용히 감춘다 — '준비 중' 딱지를 붙여 어지럽히지 않는다.
 */
export type Caps = { cadence: boolean; suggest: boolean; cheer: boolean }

export type Cheer = { run_id: string; member_id: string }

export type Club = {
  runs: FeedRun[]
  members: Member[]
  cheers: Cheer[]
  caps: Caps
  loading: boolean
  failed: boolean
  loaded: boolean
  /** 새로 못 받아서 마지막으로 받아둔 걸 보여주는 중 */
  stale: boolean
}

// 7명 × 주 4회 × 2년 ≈ 3000행. 그보다 커지면 잘라 받되 화면에서 티가 나게 둔다
const CAP = 3000

const NO_CAPS: Caps = { cadence: false, suggest: false, cheer: false }
const CAPS_KEY = 'dr_caps'
const CACHE_KEY = 'dr_cache'

let state: Club = {
  runs: [],
  members: [],
  cheers: [],
  caps: NO_CAPS,
  loading: false,
  failed: false,
  loaded: false,
  stale: false,
}

/**
 * 마지막으로 받아둔 걸 먼저 그린다. 달리고 나서 데이터가 느린 곳에서 앱을 열어도
 * 스피너 대신 어제까지의 기록이 바로 뜬다. 네트워크 결과가 오면 덮어쓴다.
 */
function hydrate() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const c = JSON.parse(raw) as Partial<Club>
    if (!Array.isArray(c.runs) || !Array.isArray(c.members)) return
    state = { ...state, runs: c.runs, members: c.members, cheers: c.cheers ?? [], caps: c.caps ?? NO_CAPS, loaded: true }
  } catch {}
}

function remember() {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ runs: state.runs, members: state.members, cheers: state.cheers, caps: state.caps }),
    )
  } catch {}
}
const subs = new Set<() => void>()
let started = false
/** 기능 유무를 '확실히' 알아냈나. 네트워크 실패로 모르는 상태와 구분한다 */
let capsKnown = false
/** 응원 왕복이 겹치면 서버와 화면이 어긋난다 — 기록·사람 조합으로 잠근다 */
const cheerBusy = new Set<string>()

function set(next: Partial<Club>) {
  state = { ...state, ...next }
  subs.forEach((f) => f())
}

/**
 * 0003 마이그레이션은 케이던스 칸·건의함·응원을 한꺼번에 넣는다.
 * 그래서 suggestions 테이블 하나만 물어보면 셋 다 알 수 있다 — 없는 걸 세 번 물어 404를 세 번 찍지 않는다.
 * 한 세션에 한 번만 묻는다.
 */
async function probeCaps(): Promise<Caps> {
  try {
    const cached = sessionStorage.getItem(CAPS_KEY)
    if (cached === '1') return (capsKnown = true), { cadence: true, suggest: true, cheer: true }
    if (cached === '0') return (capsKnown = true), NO_CAPS
  } catch {}

  const { error } = await supabase.from('suggestions').select('id').limit(1)
  if (!error) {
    capsKnown = true
    try { sessionStorage.setItem(CAPS_KEY, '1') } catch {}
    return { cadence: true, suggest: true, cheer: true }
  }

  // '테이블이 없다'는 대답일 때만 없는 걸로 굳힌다.
  // 지하철에서 처음 열었다고 응원·건의함이 그 탭 내내 사라지면 안 된다
  const missing = ['42P01', 'PGRST205', 'PGRST106'].includes(error.code ?? '')
  if (missing) {
    capsKnown = true
    try { sessionStorage.setItem(CAPS_KEY, '0') } catch {}
  }
  return NO_CAPS
}

export async function loadClub() {
  set({ loading: true })
  const caps = capsKnown ? state.caps : await probeCaps()

  const cols = `id,member_id,run_date,distance_km,duration_sec,memo,created_at${caps.cadence ? ',cadence_spm' : ''},members(name,emoji)`
  const [r, m, c] = await Promise.all([
    supabase
      .from('runs')
      .select(cols)
      .order('run_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(CAP),
    supabase.from('members').select('id,name,emoji,created_at').order('created_at'),
    caps.cheer ? supabase.from('cheers').select('run_id,member_id') : Promise.resolve({ data: [], error: null }),
  ])
  const bad = Boolean(r.error || m.error)

  // 못 받았는데 예전에 받아둔 게 있으면 그걸 계속 보여주되, 낡았다고 말한다.
  // 빈 배열로 뭉개면 '기록이 없다'로 보여서 거짓말이 된다
  if (bad && state.runs.length > 0) {
    set({ loading: false, failed: false, stale: true, caps })
    return
  }

  set({
    runs: (r.data ?? []) as unknown as FeedRun[],
    members: (m.data ?? []) as Member[],
    cheers: (c.data ?? []) as Cheer[],
    caps,
    loading: false,
    failed: bad,
    loaded: true,
    stale: false,
  })
  if (!bad) remember()
}

function subscribe(f: () => void) {
  subs.add(f)
  return () => subs.delete(f)
}

export function useClub(): Club {
  const s = useSyncExternalStore(subscribe, () => state)
  useEffect(() => {
    if (started) return
    started = true
    hydrate()
    void loadClub()
  }, [])
  return s
}

/**
 * 응원 누르기. 화면을 먼저 바꾸고 서버에 보낸다 —
 * 한 번 누르는 데 왕복을 기다리게 하면 아무도 안 누른다.
 */
export async function toggleCheer(runId: string, memberId: string) {
  const key = runId + memberId
  // 빠르게 두 번 누르면 지우기가 넣기를 앞질러 서버와 화면이 어긋난다
  if (cheerBusy.has(key)) return
  cheerBusy.add(key)

  const mine = (x: Cheer) => x.run_id === runId && x.member_id === memberId
  const has = state.cheers.some(mine)
  set({ cheers: has ? state.cheers.filter((x) => !mine(x)) : [...state.cheers, { run_id: runId, member_id: memberId }] })

  try {
    const q = supabase.from('cheers')
    const { error } = has
      ? await q.delete().eq('run_id', runId).eq('member_id', memberId)
      : await q.insert({ run_id: runId, member_id: memberId })

    // 다른 기기에서 이미 눌러둔 거라 unique 에 걸린 거면 화면이 맞다 — 되돌리지 않는다
    if (error && error.code !== '23505') {
      set({ cheers: has ? [...state.cheers, { run_id: runId, member_id: memberId }] : state.cheers.filter((x) => !mine(x)) })
    }
  } finally {
    cheerBusy.delete(key)
  }
}

/** 내 기록만 최신순으로 */
export function myRuns(club: Club, memberId: string): FeedRun[] {
  return club.runs.filter((r) => r.member_id === memberId)
}
