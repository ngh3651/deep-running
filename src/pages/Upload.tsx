import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useApp } from '../components/Layout'
import { durationLabel, journey, kmLabel, sumKm, weekStreak } from '../lib/calc'
import { readRunFromImage } from '../lib/ocr'
import { parseCadence, parseDistance, parseDuration } from '../lib/parse'
import { badgeList } from '../lib/stats'
import { loadClub, myRuns, useClub } from '../lib/store'
import { supabase } from '../lib/supabase'

const QUICK_KM = [3, 5, 10]

function ymd(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const today = () => ymd(new Date())
const yesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return ymd(d)
}

type Done = { km: number; streak: number; note: string; badge: string | null }

export default function Upload() {
  const { member } = useApp()
  const club = useClub()
  const navigate = useNavigate()

  const [preview, setPreview] = useState('')
  const [reading, setReading] = useState(false)
  const [read, setRead] = useState<{ km: number | null; sec: number | null } | null>(null)
  const [distance, setDistance] = useState('')
  const [time, setTime] = useState('')
  const [spm, setSpm] = useState('')
  const [date, setDate] = useState(today)
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Done | null>(null)

  const mine = myRuns(club, member.id)
  const last = mine[0]

  /** 내가 보통 뛰는 페이스(중앙값). 거리만 넣어도 시간을 짐작해 준다 */
  const usualPace = useMemo(() => {
    const paces = mine.filter((r) => r.distance_km >= 1).map((r) => r.duration_sec / r.distance_km)
    if (paces.length < 3) return null
    const s = paces.sort((a, b) => a - b)
    const h = Math.floor(s.length / 2)
    return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
  }, [mine])

  const km = parseDistance(distance)
  const guess = usualPace && km ? Math.round(km * usualPace) : null
  const guessLabel = guess && guess >= 60 && guess <= 21600 ? durationLabel(guess) : null

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(file)
    })
    setDistance('')
    setTime('')
    setRead(null)
    setError('')
    setReading(true)

    // 실패해도 조용히 넘어간다 — 빈 칸으로 두고 직접 입력하게 (SPEC 4.4)
    const { distanceKm, durationSec } = await readRunFromImage(file)
    if (distanceKm !== null) setDistance(String(distanceKm))
    if (durationSec !== null) setTime(durationLabel(durationSec))
    setRead({ km: distanceKm, sec: durationSec })
    setReading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (km === null) return setError('거리는 0.1~60km 사이로 적어줘요')
    const sec = parseDuration(time)
    if (sec === null) return setError('시간 형식을 확인해줘요 (예: 16:49)')
    const cad = spm.trim() ? parseCadence(spm) : null
    if (spm.trim() && cad === null) return setError('케이던스는 100~250 사이 숫자로 적어줘요')

    setError('')
    setBusy(true)
    try {
      const row: Record<string, unknown> = {
        member_id: member.id,
        run_date: date,
        distance_km: km,
        duration_sec: sec,
        memo: memo.trim() || null,
      }
      if (club.caps.cadence) row.cadence_spm = cad

      const ins = await supabase.from('runs').insert(row)
      if (ins.error) throw ins.error

      // 올리자마자 무엇이 달라졌는지 보여준다 — 이 순간이 다음 인증을 부른다
      const added = { run_date: date, distance_km: km, duration_sec: sec }
      const before = badgeList(mine, weekStreak(mine.map((r) => r.run_date)).weeks)
      const nextRuns = [...mine, added]
      const nextStreak = weekStreak(nextRuns.map((r) => r.run_date))
      const after = badgeList(nextRuns, nextStreak.weeks)
      const fresh = after.find((b) => b.done && !before.find((x) => x.id === b.id)?.done)

      const j = journey(sumKm(club.runs) + km)
      setDone({
        km,
        streak: nextStreak.weeks,
        note: j.next ? `${j.next.emoji} ${j.next.place.split(' — ')[0]}까지 ${kmLabel(j.remainKm)}km 남았어요` : '🏁 루트를 전부 돌았어요',
        badge: fresh ? `${fresh.emoji} ${fresh.name}` : null,
      })
      void loadClub()
    } catch {
      setError('올리다가 실패했어요. 다시 눌러줘요')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="donebox">
        <p className="done-emoji">🎉</p>
        <p className="done-title">인증 완료!</p>
        <p className="done-km big-num">
          +{kmLabel(done.km)}
          <span>km</span>
        </p>
        <div className="card done-card">
          <p className="done-line">{done.note}</p>
          {done.streak > 0 && <p className="done-line">🔥 {done.streak}주 연속이 이어졌어요</p>}
          {done.badge && <p className="done-badge">새 뱃지 · {done.badge}</p>}
        </div>
        <button className="btn" onClick={() => navigate('/feed')}>
          피드 보러 가기
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          홈으로
        </button>
      </div>
    )
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
            <span className="upload-drop">
              <Icon name="camera" size={26} />
              러닝앱 기록 화면을 고르면 숫자를 읽어와요
            </span>
          )}
          <input className="file-input" type="file" accept="image/*" onChange={pick} />
        </label>

        {reading && (
          <p className="ocr-note">
            <span className="spinner spinner-sm" />
            숫자 읽는 중이에요
          </p>
        )}

        {!reading && read && (read.km !== null || read.sec !== null) && (
          <div className="ocr-hit">
            <Icon name="check" size={16} />
            <span>
              사진에서 <b>{read.km !== null ? `${read.km}km` : '거리는 못 읽었어요'}</b>
              {read.sec !== null && (
                <>
                  {' · '}
                  <b>{durationLabel(read.sec)}</b>
                </>
              )}{' '}
              읽었어요. 다르면 아래에서 고쳐요
            </span>
          </div>
        )}

        {!reading && read && read.km === null && read.sec === null && (
          <p className="ocr-note">숫자를 못 찾았어요. 아래에 직접 적어줘요</p>
        )}

        {!reading && preview && <p className="ocr-note">사진은 저장되지 않아요. 숫자만 읽고 버려요</p>}

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
          <span className="chips">
            {QUICK_KM.map((v) => (
              <button type="button" className="chip" key={v} onClick={() => setDistance(String(v))}>
                {v}km
              </button>
            ))}
            {last && (
              <button type="button" className="chip" onClick={() => setDistance(String(last.distance_km))}>
                지난번 {kmLabel(last.distance_km)}km
              </button>
            )}
          </span>
        </label>

        <label className="field">
          <span className="field-label">시간</span>
          <input
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="16:49"
            inputMode="numeric"
          />
          {guessLabel && !time && (
            <span className="chips">
              <button type="button" className="chip" onClick={() => setTime(guessLabel)}>
                평소 페이스면 {guessLabel}
              </button>
            </span>
          )}
        </label>

        {club.caps.cadence && (
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
            max={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <span className="chips">
            <button type="button" className={`chip${date === today() ? ' on' : ''}`} onClick={() => setDate(today())}>
              오늘
            </button>
            <button
              type="button"
              className={`chip${date === yesterday() ? ' on' : ''}`}
              onClick={() => setDate(yesterday())}
            >
              어제
            </button>
          </span>
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
