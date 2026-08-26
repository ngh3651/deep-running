import { createClient } from '@supabase/supabase-js'

// anon 키는 공개 전제다 (SPEC 9장 — 7명 신뢰 기반 도구, 의도된 트레이드오프)
const SUPABASE_URL = 'https://xwrarkdiyewtidrxdkpf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ZSvF51L94mBBrr1mV7Jj1g_Sx_UL3TH'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

export const SCREENSHOT_BUCKET = 'screenshots'

export type Member = {
  id: string
  name: string
  emoji: string
  created_at: string
}

export type Run = {
  id: string
  member_id: string
  run_date: string
  distance_km: number
  duration_sec: number
  memo: string | null
  screenshot_url: string
  created_at: string
}
