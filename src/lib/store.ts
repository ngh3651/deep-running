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

export type Club = {
  runs: FeedRun[]
  members: Member[]
  caps: Caps
  loading: boolean
  failed: boolean
  loaded: boolean
}

// 7명 × 주 4회 × 2년 ≈ 3000행. 그보다 커지면 잘라 받되 화면에서 티가 나게 둔다
const CAP = 3000

const NO_CAPS: Caps = { cadence: false, suggest: false, cheer: false }
const CAPS_KEY = 'dr_caps'

let state: Club = { runs: [], members: [], caps: NO_CAPS, loading: false, failed: false, loaded: false }
const subs = new Set<() => void>()
let started = false

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
    if (cached === '1') return { cadence: true, suggest: true, cheer: true }
    if (cached === '0') return NO_CAPS
  } catch {}

  const { error } = await supabase.from('suggestions').select('id').limit(1)
  const ok = !error
  try {
    sessionStorage.setItem(CAPS_KEY, ok ? '1' : '0')
  } catch {}
  return ok ? { cadence: true, suggest: true, cheer: true } : NO_CAPS
}

export async function loadClub() {
  set({ loading: true })
  const caps = state.loaded ? state.caps : await probeCaps()

  const cols = `id,member_id,run_date,distance_km,duration_sec,memo,created_at${caps.cadence ? ',cadence_spm' : ''},members(name,emoji)`
  const [r, m] = await Promise.all([
    supabase
      .from('runs')
      .select(cols)
      .order('run_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(CAP),
    supabase.from('members').select('id,name,emoji,created_at').order('created_at'),
  ])
  // 실패를 빈 배열로 뭉개면 '기록이 없다'로 보여서 거짓말이 된다
  set({
    runs: (r.data ?? []) as unknown as FeedRun[],
    members: (m.data ?? []) as Member[],
    caps,
    loading: false,
    failed: Boolean(r.error || m.error),
    loaded: true,
  })
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
    void loadClub()
  }, [])
  return s
}

/** 내 기록만 최신순으로 */
export function myRuns(club: Club, memberId: string): FeedRun[] {
  return club.runs.filter((r) => r.member_id === memberId)
}
