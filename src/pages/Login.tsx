import { useEffect, useState } from 'react'
import { createMember, findMember, hashPw, saveMember, type Session } from '../lib/auth'

/** 받침 있으면 '으로', 없거나 ㄹ이면 '로' */
function ro(word: string) {
  const c = word.charCodeAt(word.length - 1) - 0xac00
  if (c < 0 || c > 11171) return '로'
  const jong = c % 28
  return jong === 0 || jong === 8 ? '로' : '으로'
}

export default function Login({ onLogin }: { onLogin: (m: Session) => void }) {
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [busy, setBusy] = useState(false)
  const [askNew, setAskNew] = useState('')

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
      fail('연결이 잠깐 끊겼어요. 다시 눌러줘요')
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
      </div>

      <form className={`card login-form${shake ? ' shake' : ''}`} key={shake} onSubmit={submit}>
        <label className="field">
          <span className="field-label">이름</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="규혁"
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
        <p className="login-hint">처음 친 이름과 숫자가 곧 내 계정이에요</p>
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
