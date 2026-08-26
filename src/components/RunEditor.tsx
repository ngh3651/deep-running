import { useEffect, useState } from 'react'
import { durationLabel } from '../lib/calc'
import { parseCadence, parseDistance, parseDuration } from '../lib/parse'
import { loadClub, type Caps, type FeedRun } from '../lib/store'
import { supabase } from '../lib/supabase'

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * 올린 기록을 고친다. 사진에서 잘못 읽힌 숫자를 나중에 바로잡는 자리다.
 *
 * 0003 을 적용했으면 그냥 UPDATE 한다 — 행이 그대로 남아서 남들이 눌러준 응원이 살아 있다.
 * 아직 안 했으면 runs 에 update 정책이 없어서 '새로 넣고 → 옛 걸 지운다' 로 간다.
 * 순서가 중요하다. 반대로 하면 네트워크가 끊겼을 때 기록이 증발한다 —
 * 이 순서면 최악이라도 같은 기록이 두 개 남고, 그건 말해주면 사용자가 지울 수 있다.
 */
export default function RunEditor({
  run,
  caps,
  onClose,
}: {
  run: FeedRun
  caps: Caps
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
    if (date > ymd(new Date())) return setError('아직 오지 않은 날짜예요')

    setError('')
    setBusy(true)

    const row: Record<string, unknown> = {
      run_date: date,
      distance_km: km,
      duration_sec: sec,
      memo: memo.trim() || null,
    }
    if (caps.cadence) row.cadence_spm = cad

    if (caps.suggest) {
      const { error: e } = await supabase.from('runs').update(row).eq('id', run.id)
      if (e) {
        setError('고치지 못했어요. 다시 눌러줘요')
        return setBusy(false)
      }
    } else {
      const ins = await supabase.from('runs').insert({ ...row, member_id: run.member_id })
      if (ins.error) {
        setError('고치지 못했어요. 다시 눌러줘요')
        return setBusy(false)
      }
      const del = await supabase.from('runs').delete().eq('id', run.id)
      if (del.error) {
        // 새 기록은 들어갔는데 옛 게 안 지워졌다. 모르고 넘어가면 누적이 두 배로 샌다
        await loadClub()
        setError('고쳤는데 옛 기록이 안 지워졌어요. 같은 기록이 두 개면 하나를 지워줘요')
        return setBusy(false)
      }
    }

    await loadClub()
    onClose(true)
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

        {caps.cadence && (
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
          <input
            className="input"
            type="date"
            max={ymd(new Date())}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
