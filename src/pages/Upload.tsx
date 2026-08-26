import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../components/Layout'
import { durationLabel } from '../lib/calc'
import { readRunFromImage } from '../lib/ocr'
import { parseDistance, parseDuration } from '../lib/parse'
import { supabase } from '../lib/supabase'

function today() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function Upload() {
  const { member } = useApp()
  const navigate = useNavigate()

  const [preview, setPreview] = useState('')
  const [reading, setReading] = useState(false)
  const [distance, setDistance] = useState('')
  const [time, setTime] = useState('')
  const [date, setDate] = useState(today)
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
    // 고른 사진 기준으로 다시 채운다
    setDistance('')
    setTime('')
    setError('')
    setReading(true)

    // 실패해도 조용히 넘어간다 — 빈 칸으로 두고 직접 입력하게 (SPEC 4.4)
    const { distanceKm, durationSec } = await readRunFromImage(file)
    if (distanceKm !== null) setDistance(String(distanceKm))
    if (durationSec !== null) setTime(durationLabel(durationSec))
    setReading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    const km = parseDistance(distance)
    if (km === null) return setError('거리는 0.1~60km 사이로 적어줘요')

    const sec = parseDuration(time)
    if (sec === null) return setError('시간 형식을 확인해줘요 (예: 16:49)')

    setError('')
    setBusy(true)
    try {
      const ins = await supabase.from('runs').insert({
        member_id: member.id,
        run_date: date,
        distance_km: km,
        duration_sec: sec,
        memo: memo.trim() || null,
      })
      if (ins.error) throw ins.error
      navigate('/feed', { state: { toast: '인증 완료! 🔥' } })
    } catch {
      setError('올리다가 실패했어요. 다시 눌러줘요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="page-title">인증 올리기</h1>

      <form className="card upload-form" noValidate onSubmit={submit}>
        <label className="field">
          <span className="field-label">사진 (선택)</span>
          {preview ? (
            <img className="upload-preview" src={preview} alt="고른 사진 미리보기" />
          ) : (
            <span className="upload-drop">러닝앱 기록 화면을 고르면 숫자를 읽어와요</span>
          )}
          <input className="file-input" type="file" accept="image/*" onChange={pick} />
        </label>

        {reading ? (
          <p className="ocr-note">
            <span className="spinner spinner-sm" />
            숫자 읽는 중이에요
          </p>
        ) : (
          preview && <p className="ocr-note">사진은 저장되지 않아요. 숫자만 읽고 버려요</p>
        )}

        <label className="field">
          <span className="field-label">거리 (km)</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.1"
            max="60"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="3.01"
          />
        </label>

        <label className="field">
          <span className="field-label">시간</span>
          <input
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="16:49"
          />
        </label>

        <label className="field">
          <span className="field-label">날짜</span>
          <input
            className="input"
            type="date"
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">메모 (선택)</span>
          <input
            className="input"
            value={memo}
            maxLength={60}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 컨디션 어땠어요?"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {busy ? '올리는 중이에요…' : '인증 올리기'}
        </button>
      </form>
    </>
  )
}
