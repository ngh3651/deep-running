import { supabase } from './supabase'

export type Session = { id: string; name: string; emoji: string }

const KEY = 'dr_member'
const EMOJIS = ['🏃', '🐢', '🔥', '⚡', '🌙', '🍀', '🦊', '🐻', '🐰', '🦁']

/** 만료 없음 — 직접 로그아웃하기 전까지 유지 (SPEC 4.1) */
export function readMember(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const m = JSON.parse(raw) as Session
    return m && typeof m.id === 'string' && typeof m.name === 'string' ? m : null
  } catch {
    return null
  }
}

export function saveMember(m: Session) {
  localStorage.setItem(KEY, JSON.stringify(m))
}

export function clearMember() {
  localStorage.removeItem(KEY)
}

/** pw_hash = SHA-256(name + ':' + pw) hex — 평문은 저장하지 않는다 (SPEC 9장) */
export async function hashPw(name: string, pw: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${name}:${pw}`)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function findMember(name: string) {
  const { data, error } = await supabase
    .from('members')
    .select('id,name,emoji,pw_hash')
    .eq('name', name)
    .maybeSingle()
  if (error) throw error
  return data as (Session & { pw_hash: string }) | null
}

/** 가입 시 이모지 자동 배정 — 아직 안 쓰인 것 우선 */
async function pickEmoji(): Promise<string> {
  const { data } = await supabase.from('members').select('emoji')
  const used = new Set((data ?? []).map((r) => r.emoji as string))
  const free = EMOJIS.filter((e) => !used.has(e))
  const pool = free.length ? free : EMOJIS
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function createMember(name: string, pw: string): Promise<Session> {
  const pw_hash = await hashPw(name, pw)
  const emoji = await pickEmoji()
  const { data, error } = await supabase
    .from('members')
    .insert({ name, pw_hash, emoji })
    .select('id,name,emoji')
    .single()
  if (error) throw error
  return data as Session
}
