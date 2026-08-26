import { useEffect, useState } from 'react'
import { durationLabel } from '../lib/calc'
import { parseCadence, parseDistance, parseDuration } from '../lib/parse'
import { loadClub, type FeedRun } from '../lib/store'
import { supabase } from '../lib/supabase'

/**
 * 올린 기록을 고친다. 사진에서 잘못 읽힌 숫자를 나중에 바로잡는 자리다.
 *
 * runs 에 update 정책이 없어서(SPEC 9장 RLS는 select·insert·delete만) UPDATE 로는 못 고친다.
 * 그래서 '새로 넣고 → 옛 걸 지운다' 순서로 한다. 반대로 하면 네트워크가 끊겼을 때 기록이 증발한다.
 * 이 순서면 최악이라도 같은 기록이 두 개 남고, 그건 사용자가 지울 수 있다.
 */
export default function RunEditor({
  run,
  cadence,
  onClose,
}: {
  run: FeedRun
  cadence: boolean
  onClose: (saved: boolean) => void
}) {
  const [distance, setDistance] = useState(String(run.distance_km))
  const [time, setTime] = useState(durationLabel(run.duration_sec))
  const [date, setDate] = useState(run.run_date)
  const [memo, setMemo] = useState(run.memo ?? '')
  const [spm, setSpm] = useState(run.cadence_spm ? String(run.cadence_spm) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function save() {
    const km = parseDistance(distance)
    if (km === null) return setError('거리는 0.1~60km 사이로 적어줘요')
    const sec = parseDuration(time)
    if (sec === null) return setError('시간 형식을 확인해줘요 (예: 16:49)')
    const cad = spm.trim() ? parseCadence(spm) : null
    if (spm.trim() && cad === null) return setError('케이던스는 100~250 사이 숫자로 적어줘요')

    setError('')
    setBusy(true)
    try {
      const row: Record<string, unknown> = {
        member_id: run.member_id,
        run_date: date,
        distance_km: km,
        duration_sec: sec,
        memo: memo.trim() || null,
      }
      if (cadence) row.cadence_spm = cad

      const ins = await supabase.from('runs').insert(row)
      if (ins.error) throw ins.error
      await supabase.from('runs').delete().eq('id', run.id)
      await loadClub()
      onClose(true)
    } catch {
      setError('고치지 못했어요. 다시 눌러줘요')
      setBusy(false)
    }
  }

  return (
    <div className="dialog-back">
      <div className="dialog dialog-form" role="dialog" aria-modal="true" aria-label="기록 고치기">
        <p className="dialog-title">기록 고치기</p>
        <p className="sub">사진에서 잘못 읽힌 숫자를 여기서 바로잡아요.</p>

        <label className="field">
          <span className="field-label">거리 (km)</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">시간</span>
          <input className="input" value={time} onChange={(e) => setTime(e.target.value)} placeholder="16:49" />
        </label>

        {cadence && (
          <label className="field">
            <span className="field-label">케이던스 (spm, 선택)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={spm}
              onChange={(e) => setSpm(e.target.value)}
              placeholder="170"
            />
          </label>
        )}

        <label className="field">
          <span className="field-label">날짜</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">메모 (선택)</span>
          <input className="input" value={memo} maxLength={60} onChange={(e) => setMemo(e.target.value)} />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="dialog-row">
          <button className="btn btn-ghost" onClick={() => onClose(false)} disabled={busy}>
            그만둘게요
          </button>
          <button className="btn" onClick={save} disabled={busy}>
            {busy ? '고치는 중이에요…' : '고칠게요'}
          </button>
        </div>
      </div>
    </div>
  )
}
