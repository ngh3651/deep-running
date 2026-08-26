import { useEffect, useState } from 'react'
import Badges from '../components/Badges'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import { useApp } from '../components/Layout'
import RunEditor from '../components/RunEditor'
import Suggest from '../components/Suggest'
import { Bars, Compare, Heat, Ring, Trend } from '../components/charts'
import { dateLabel, durationLabel, kmLabel, monthKm, paceLabel, sumKm, weekStreak } from '../lib/calc'
import {
  avgPace,
  badgeList,
  daysSincePR,
  eddington,
  heatMonthLabels,
  heatWeeks,
  levelOf,
  monthGrowth,
  personalBests,
  predict5k,
  steadiness,
  weeklySeries,
} from '../lib/stats'
import { shareCard } from '../lib/card'
import { iga } from '../lib/ko'
import { loadClub, myRuns, useClub, type FeedRun } from '../lib/store'
import { supabase } from '../lib/supabase'

const FOLD = 6

export default function My() {
  const { member, logout } = useApp()
  const club = useClub()
  const [menu, setMenu] = useState('')
  const [edit, setEdit] = useState<FeedRun | null>(null)
  const [ask, setAsk] = useState<FeedRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [all, setAll] = useState(false)

  const runs = myRuns(club, member.id)
  const total = sumKm(runs)
  const level = levelOf(total)
  const streak = weekStreak(runs.map((r) => r.run_date))
  const growth = monthGrowth(runs)
  const bests = personalBests(runs)
  const edd = eddington(runs)
  const steady = steadiness(runs)
  const prAge = daysSincePR(runs)
  const p5k = predict5k(runs)
  const cols = heatWeeks(runs, 15)
  const weekly = weeklySeries(runs, 10)
  const paces = runs
    .filter((r) => r.distance_km >= 1)
    .slice(0, 20)
    .reverse()
    .map((r) => r.duration_sec / r.distance_km)

  // 나 vs 소모임 — 등수가 아니라 값을 나란히 놓는다
  const others = club.members.filter((m) => m.id !== member.id)
  const clubWeekKm = others.length
    ? others.map((m) => sumKm(myRuns(club, m.id)) / 15).reduce((a, b) => a + b, 0) / others.length
    : 0
  const myWeekKm = total / 15
  const clubPace = others.map((m) => avgPace(myRuns(club, m.id))).filter((v): v is number => v !== null)
  const clubPaceAvg = clubPace.length ? clubPace.reduce((a, b) => a + b, 0) / clubPace.length : null
  const myPace = avgPace(runs)

  useEffect(() => {
    if (!ask) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAsk(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ask])

  async function remove(run: FeedRun) {
    setBusy(true)
    try {
      // 하드 삭제 (SPEC 4.6) — 사진은 애초에 저장하지 않으니 행만 지우면 끝이다
      await supabase.from('runs').delete().eq('id', run.id)
      setAsk(null)
      setMenu('')
      await loadClub()
    } finally {
      setBusy(false)
    }
  }

  // 소모임장 = 가장 먼저 가입한 사람. 이름을 코드에 박지 않으려고 이렇게 정했다
  const isOwner = club.members[0]?.id === member.id

  const shown = all ? runs : runs.slice(0, FOLD)

  return (
    <>
      <h1 className="page-title">마이</h1>

      <section className="card card-hero profile">
        <div className="profile-emoji">{member.emoji}</div>
        <div className="profile-body">
          <p className="profile-name">{member.name}</p>
          <p className="profile-level">
            {level.emoji} {level.name}
          </p>
          <p className="sub profile-next">
            {level.to === null ? '마지막 등급이에요' : `다음 등급까지 ${kmLabel(level.remain)}km`}
          </p>
        </div>
        <Ring progress={level.progress} size={72} label={`${Math.round(level.progress * 100)}%`} />
      </section>

      <div className="card stats-row">
        <Stat value={kmLabel(monthKm(runs))} unit="km" label="이번 달" />
        <Stat value={kmLabel(total)} unit="km" label="누적" />
        <Stat value={String(runs.length)} unit="회" label="총 인증" />
      </div>

      {!club.loaded && (
        <div className="loading">
          <span className="spinner" />
        </div>
      )}
      {club.failed && <EmptyState emoji="📡" text="기록을 불러오지 못했어요. 잠깐 뒤에 다시 열어줘요" />}
      {club.loaded && !club.failed && runs.length === 0 && (
        <EmptyState emoji="👟" text="아직 기록이 없어요. 첫 인증을 올려봐요" />
      )}

      {runs.length > 0 && (
        <>
          <section className="card">
            <div className="streak-line">
              {streak.weeks > 0 ? (
                <>
                  <span className="streak-fire">🔥</span>
                  <span>
                    <span className="big-num streak-num">{streak.weeks}</span>주 연속
                  </span>
                </>
              ) : (
                <span className="streak-none">이번 주에 한 번 올리면 연속이 시작돼요</span>
              )}
              {steady !== null && <span className="chip chip-static steady">꾸준함 {steady}점</span>}
            </div>
            {streak.weeks > 0 && streak.thisWeekMissing && (
              <p className="sub streak-warn">이번 주 아직 안 달렸어요 — 불꽃이 꺼지기 전에!</p>
            )}

            <p className="sec heat-sec">최근 15주</p>
            <Heat cols={cols} months={heatMonthLabels(cols)} />
            <div className="heat-legend">
              적음
              <i className="heat-cell l0" />
              <i className="heat-cell l1" />
              <i className="heat-cell l2" />
              <i className="heat-cell l3" />
              <i className="heat-cell l4" />
              많음
            </div>
          </section>

          <section className="card">
            <p className="sec">
              <Icon name="spark" size={16} />
              이번 달 나의 변화
            </p>
            <div className="grow">
              <Delta
                label="거리"
                value={`${kmLabel(growth.cur.km)}km`}
                diff={growth.kmPct === null ? null : `${growth.kmPct > 0 ? '+' : ''}${growth.kmPct}%`}
                good={growth.kmPct !== null && growth.kmPct >= 0}
              />
              <Delta
                label="인증"
                value={`${growth.cur.count}회`}
                diff={growth.prev.count === 0 ? null : `${growth.countDiff > 0 ? '+' : ''}${growth.countDiff}회`}
                good={growth.countDiff >= 0}
              />
              <Delta
                label="평균 페이스"
                value={growth.cur.pace ? paceLabel(growth.cur.pace, 1) : '—'}
                diff={growth.paceDiff === null ? null : `${growth.paceDiff > 0 ? '+' : ''}${growth.paceDiff}초`}
                good={growth.paceDiff !== null && growth.paceDiff <= 0}
              />
            </div>
            <p className="sub grow-note">{'지난달 같은 기간(1~' + new Date().getDate() + '일)과 견줬어요. 페이스는 숫자가 작아질수록 빨라진 거예요'}</p>
          </section>

          <section className="card">
            <p className="sec">
              <Icon name="rank" size={16} />
              주마다 얼마나 달렸나
            </p>
            <div className="chart-pad">
              <Bars data={weekly.map((w) => ({ label: w.label, value: w.km }))} unit="km" />
            </div>

            {paces.length >= 3 && (
              <>
                <p className="sec chart-sec">
                  페이스 흐름 <i className="chart-hint">빠를수록 위</i>
                </p>
                <Trend values={paces} invert tone="good" />
                <p className="chart-ends">
                  <span>{paceLabel(paces[0], 1)}</span>
                  <span>{paceLabel(paces[paces.length - 1], 1)}</span>
                </p>
              </>
            )}
          </section>

          <section className="card">
            <p className="sec">
              <Icon name="target" size={16} />
              내 기록
            </p>
            <div className="bests">
              <Best label="최장 거리" value={bests.longest ? `${kmLabel(bests.longest.value)}km` : '—'} />
              <Best label="최고 페이스" value={bests.fastest ? paceLabel(bests.fastest.value, 1) : '—'} />
              <Best label="5km 예상" value={p5k ? durationLabel(p5k) : '—'} />
            </div>
            <div className="edd">
              <p className="edd-line">
                <b className="big-num">에딩턴 {edd.value}</b>
                <span className="sub">
                  {edd.value + 1}km 이상 {edd.need}번 더 달리면 {edd.value + 1}
                  {iga(edd.value + 1)} 돼요
                </span>
              </p>
              <p className="sub edd-help">
                에딩턴 수는 “n km 이상 달린 날이 n일”을 만족하는 가장 큰 수예요. 한 번 멀리 달려선 안 오르고 꾸준해야 올라요
              </p>
            </div>
            {prAge !== null && prAge >= 21 && (
              <p className="sub edd-help">최고 페이스를 세운 지 {prAge}일 됐어요. 한 번 노려볼까요?</p>
            )}
          </section>

          <Badges list={badgeList(runs, streak.weeks)} />

          {others.length > 0 && (
            <section className="card">
              <p className="sec">
                <Icon name="users" size={16} />
                나와 소모임
              </p>
              <p className="cmp-title">주 평균 거리</p>
              <Compare
                rows={[
                  { label: '나', value: myWeekKm, text: `${myWeekKm.toFixed(1)}km`, me: true },
                  { label: '우리 평균', value: clubWeekKm, text: `${clubWeekKm.toFixed(1)}km` },
                ]}
              />
              {myPace !== null && clubPaceAvg !== null && (
                <>
                  <p className="cmp-title">평균 페이스</p>
                  <Compare
                    rows={[
                      // 낮을수록 좋은 값이라 막대는 뒤집어 그린다 — 빠른 쪽이 길어야 읽힌다
                      { label: '나', value: 1 / myPace, text: paceLabel(myPace, 1), me: true },
                      { label: '우리 평균', value: 1 / clubPaceAvg, text: paceLabel(clubPaceAvg, 1) },
                    ]}
                  />
                </>
              )}
            </section>
          )}

          <h2 className="section-title">내 기록 {runs.length}건</h2>

          {shown.map((r) => (
            <div className="card card-tight rec" key={r.id}>
              <div className="rec-main">
                <p className="rec-date sub">{dateLabel(r.run_date)}</p>
                <p className="rec-nums">
                  <span className="big-num rec-km">{kmLabel(r.distance_km)}</span>
                  <span className="run-unit">km</span>
                </p>
                <p className="sub rec-meta">
                  {paceLabel(r.duration_sec, r.distance_km)} · {durationLabel(r.duration_sec)}
                  {r.cadence_spm ? ` · ${r.cadence_spm}spm` : ''}
                </p>
              </div>
              <button className="rec-more" aria-label="기록 메뉴" onClick={() => setMenu(menu === r.id ? '' : r.id)}>
                <Icon name="more" size={20} />
              </button>
              {menu === r.id && (
                <div className="rec-menu">
                  <button
                    onClick={() => {
                      setEdit(r)
                      setMenu('')
                    }}
                  >
                    <Icon name="pencil" size={15} />
                    고치기
                  </button>
                  <button
                    onClick={() => {
                      setMenu('')
                      void shareCard({
                        name: member.name,
                        emoji: member.emoji,
                        distanceKm: r.distance_km,
                        durationSec: r.duration_sec,
                        runDate: r.run_date,
                        memo: r.memo,
                        footer: `소모임 누적 ${kmLabel(sumKm(club.runs))}km`,
                      })
                    }}
                  >
                    <Icon name="share" size={15} />
                    공유
                  </button>
                  <button className="danger" onClick={() => setAsk(r)}>
                    <Icon name="trash" size={15} />
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}

          {runs.length > FOLD && (
            <button className="btn btn-ghost" onClick={() => setAll((v) => !v)}>
              {all ? '접기' : `${runs.length - FOLD}건 더 보기`}
            </button>
          )}
        </>
      )}

      <Suggest member={member} enabled={club.caps.suggest} isOwner={isOwner} />

      <button className="btn btn-ghost" onClick={logout}>
        로그아웃
      </button>

      {edit && <RunEditor run={edit} cadence={club.caps.cadence} onClose={() => setEdit(null)} />}

      {ask && (
        <div className="dialog-back">
          <div className="dialog" role="dialog" aria-modal="true">
            <p className="dialog-title">이 기록을 지울까요?</p>
            <p className="sub">
              {dateLabel(ask.run_date)} · {kmLabel(ask.distance_km)}km — 되돌릴 수 없어요.
            </p>
            <div className="dialog-row">
              <button className="btn btn-ghost" onClick={() => setAsk(null)} disabled={busy}>
                아니요
              </button>
              <button className="btn btn-danger" onClick={() => remove(ask)} disabled={busy}>
                지울게요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="stat">
      <p className="stat-value big-num">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </p>
      <p className="stat-label">{label}</p>
    </div>
  )
}

function Delta({ label, value, diff, good }: { label: string; value: string; diff: string | null; good: boolean }) {
  return (
    <div className="delta">
      <p className="delta-label">{label}</p>
      <p className="delta-value big-num">{value}</p>
      {diff ? <p className={`delta-diff ${good ? 'up' : 'down'}`}>{diff}</p> : <p className="delta-diff sub">첫 달이에요</p>}
    </div>
  )
}

function Best({ label, value }: { label: string; value: string }) {
  return (
    <div className="best">
      <p className="best-value big-num">{value}</p>
      <p className="best-label">{label}</p>
    </div>
  )
}
