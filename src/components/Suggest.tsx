import { useEffect, useState } from 'react'
import type { Session } from '../lib/auth'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

export type SuggestRow = { id: string; member_name: string; text: string; done: boolean; created_at: string }

const MAX = 300

/**
 * 건의함. 소모임장에게 "이런 기능 있으면 좋겠어요"를 보내는 자리다.
 *
 * suggestions 테이블이 아직 없는 동안에는 조용히 클립보드로 떨어뜨린다 —
 * 톡방에 붙여넣으면 어차피 소모임장이 본다. 기능을 감추는 것보다 이 편이 낫다.
 */
export default function Suggest({
  member,
  enabled,
  isOwner,
}: {
  member: Session
  enabled: boolean
  isOwner: boolean
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'copied'>('idle')
  const [inbox, setInbox] = useState<SuggestRow[] | null>(null)

  useEffect(() => {
    if (!enabled || !isOwner) return
    void (async () => {
      const { data } = await supabase
        .from('suggestions')
        .select('id,member_name,text,done,created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      setInbox((data ?? []) as SuggestRow[])
    })()
  }, [enabled, isOwner, state])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send() {
    const body = text.trim()
    if (!body) return
    setState('busy')

    if (enabled) {
      const { error } = await supabase.from('suggestions').insert({ member_name: member.name, text: body })
      if (!error) {
        setText('')
        setOpen(false)
        return setState('sent')
      }
    }

    // 아직 건의함 테이블이 없다 — 톡방에 붙여넣을 수 있게 복사해준다
    try {
      await navigator.clipboard.writeText(`[Deep Running 건의] ${member.name}\n${body}`)
      setText('')
      setOpen(false)
      setState('copied')
    } catch {
      setState('idle')
    }
  }

  async function toggleDone(row: SuggestRow) {
    await supabase.from('suggestions').update({ done: !row.done }).eq('id', row.id)
    setInbox((list) => (list ?? []).map((r) => (r.id === row.id ? { ...r, done: !row.done } : r)))
  }

  const waiting = inbox?.filter((r) => !r.done).length ?? 0

  return (
    <>
      <section className="card suggest">
        <button className="suggest-open" onClick={() => setOpen(true)}>
          <span className="suggest-ico">
            <Icon name="send" size={18} />
          </span>
          <span className="suggest-body">
            <b>건의하기</b>
            <i>이런 기능 있으면 좋겠어요 — 소모임장에게 바로 가요</i>
          </span>
          <Icon name="right" size={16} className="suggest-arrow" />
        </button>

        {state === 'sent' && <p className="suggest-ok">보냈어요. 소모임장이 확인할게요</p>}
        {state === 'copied' && <p className="suggest-ok">복사했어요. 톡방에 붙여넣어 줘요</p>}

        {isOwner && inbox && inbox.length > 0 && (
          <div className="inbox">
            <p className="sec inbox-head">받은 건의 {waiting > 0 ? `· 확인 안 한 ${waiting}건` : ''}</p>
            {inbox.map((r) => (
              <button
                className={`inbox-row${r.done ? ' done' : ''}`}
                key={r.id}
                onClick={() => void toggleDone(r)}
                title="누르면 확인 표시가 바뀌어요"
              >
                <span className="inbox-check">{r.done ? <Icon name="check" size={14} /> : null}</span>
                <span className="inbox-text">
                  <b>{r.member_name}</b>
                  {r.text}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {open && (
        <div className="dialog-back">
          <div className="dialog dialog-form" role="dialog" aria-modal="true" aria-label="건의하기">
            <p className="dialog-title">어떤 게 있으면 좋겠어요?</p>
            <p className="sub">기능 제안, 불편한 점, 루트·보상 아이디어 뭐든 좋아요.</p>
            <textarea
              className="input suggest-text"
              value={text}
              maxLength={MAX}
              rows={5}
              autoFocus
              placeholder="예: 달린 코스 사진을 같이 올릴 수 있으면 좋겠어요"
              onChange={(e) => setText(e.target.value)}
            />
            <p className="sub suggest-count">
              {text.length} / {MAX}
            </p>
            <div className="dialog-row">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={state === 'busy'}>
                그만둘게요
              </button>
              <button className="btn" onClick={send} disabled={state === 'busy' || !text.trim()}>
                {state === 'busy' ? '보내는 중이에요…' : '보낼게요'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
