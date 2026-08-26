import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import RunCard, { type FeedRun } from '../components/RunCard'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'

const SELECT = 'id,member_id,run_date,distance_km,duration_sec,memo,created_at,members(name,emoji)'

export default function Feed() {
  const location = useLocation()
  const [runs, setRuns] = useState<FeedRun[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [toast, setToast] = useState<string>(() => (location.state as { toast?: string } | null)?.toast ?? '')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('runs')
      .select(SELECT)
      .order('run_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)
    // 실패를 빈 목록으로 뭉개면 기록이 없는 것처럼 보인다 — 구분해서 알린다
    setFailed(Boolean(error))
    setRuns((data ?? []) as unknown as FeedRun[])
  }, [])

  useEffect(() => {
    void load()
    // 토스트는 한 번만 — 새로고침해도 다시 뜨지 않게 히스토리에서 지운다
    if (toast) window.history.replaceState({}, '')
  }, [load, toast])

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">피드</h1>
        <button className="link-btn" onClick={() => { setRuns(null); void load() }}>
          새로고침
        </button>
      </div>

      {runs === null && <div className="loading"><span className="spinner" /></div>}
      {failed && <EmptyState emoji="📡" text="기록을 불러오지 못했어요. 잠깐 뒤에 다시 열어줘요" />}
      {!failed && runs !== null && runs.length === 0 && (
        <EmptyState emoji="👟" text="아직 인증이 없어요. 첫 기록을 올려봐요" />
      )}
      {runs?.map((r) => <RunCard key={r.id} run={r} />)}

      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </>
  )
}
