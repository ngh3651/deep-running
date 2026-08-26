import { useEffect, useState } from 'react'
import { createMember, findMember, hashPw, saveMember, type Session } from '../lib/auth'
import { kmLabel } from '../lib/calc'
import { ro } from '../lib/ko'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }: { onLogin: (m: Session) => void }) {
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [askNew, setAskNew] = useState('')
  const [teaser, setTeaser] = useState<{ people: number; km: number } | null>(null)

  // 로그인 전에도 소모임이 얼마나 달렸는지 보여준다 — 빈 화면보다 들어가고 싶어진다
  useEffect(() => {
    void (async () => {
      const [r, m] = await Promise.all([
        supabase.from('runs').select('distance_km'),
        supabase.from('members').select('id'),
      ])
      if (r.error || m.error) return
      const km = (r.data ?? []).reduce((s, x) => s + Number(x.distance_km), 0)
      setTeaser({ people: (m.data ?? []).length, km: Math.round(km * 100) / 100 })
    })()
  }, [])

  // 다이얼로그는 Esc로도 닫힌다
  useEffect(() => {
    if (!askNew) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAskNew('')
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [askNew])

  const fail = (msg: string) => {
    setError(msg)
    setShake((n) => n + 1)
  }

  const enter = (m: Session) => {
    saveMember(m)
    onLogin(m)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return fail('이름을 적어줘요')
    if (!/^\d{4}$/.test(pw)) return fail('비밀번호는 숫자 4자리예요')

    setError('')
    setBusy(true)
    try {
      const found = await findMember(trimmed)
      if (!found) {
        setAskNew(trimmed)
        return
      }
      const hash = await hashPw(trimmed, pw)
      if (hash !== found.pw_hash) {
        // 이름이 이미 있으면 절대 새 계정을 만들지 않는다 (SPEC 4.1)
        return fail('비밀번호가 달라요')
      }
      enter({ id: found.id, name: found.name, emoji: found.emoji })
    } catch {
      fail('연결이 잠시 끊겼어요. 다시 눌러줘요')
    } finally {
      setBusy(false)
    }
  }

  async function confirmNew() {
    setBusy(true)
    try {
      enter(await createMember(askNew, pw))
    } catch {
      setAskNew('')
      fail('계정을 만들지 못했어요. 다시 눌러줘요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div className="login-logo">🏃</div>
        <h1 className="login-title">Deep Running</h1>
        <p className="sub">인하대 인공지능공학과 러닝 소모임</p>
        {teaser &&
          (teaser.km > 0 ? (
            <p className="login-teaser">
              지금까지 {teaser.people}명이 <b>{kmLabel(teaser.km)}km</b> 달렸어요
            </p>
          ) : (
            <p className="login-teaser">첫 발자국을 기다리고 있어요</p>
          ))}
      </div>

      <form className={`card login-form${shake ? ' shake' : ''}`} key={shake} onSubmit={submit}>
        <label className="field">
          <span className="field-label">이름</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="규혁"
            autoFocus
            autoComplete="username"
            maxLength={12}
          />
        </label>
        <label className="field">
          <span className="field-label">숫자 4자리</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            value={pw}
            onChange={(e) => setPw(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? '잠시만요…' : '시작하기'}
        </button>
        <p className="login-hint">처음 적은 이름과 숫자가 그대로 계정이 돼요</p>
      </form>

      {askNew && (
        <div className="dialog-back">
          <div className="dialog" role="dialog" aria-modal="true">
            <p className="dialog-title">
              '{askNew}'{ro(askNew)} 새로 시작할까요?
            </p>
            <p className="sub">처음 보는 이름이에요. 이 이름으로 계정을 만들게요.</p>
            <div className="dialog-row">
              <button className="btn btn-ghost" onClick={() => setAskNew('')} disabled={busy}>
                아니요
              </button>
              <button className="btn" onClick={confirmNew} disabled={busy}>
                네, 시작할게요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
