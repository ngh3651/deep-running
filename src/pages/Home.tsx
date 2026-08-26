import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import InstallHint from '../components/InstallHint'
import Journey from '../components/Journey'
import Roster from '../components/Roster'
import { Bars, Ring } from '../components/charts'
import { useApp } from '../components/Layout'
import { Link } from 'react-router-dom'
import { useCountUp } from '../lib/anim'
import { kmLabel, sumKm, thisWeek } from '../lib/calc'
import { CLUB_SIZE } from '../lib/constants'
import { togetherDays, weeklySeries } from '../lib/stats'
import { useClub } from '../lib/store'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

export default function Home() {
  const { member } = useApp()
  const club = useClub()

  const total = sumKm(club.runs)
  const shown = useCountUp(total)
  const week = thisWeek(club.runs)
  const joined = new Set(club.runs.filter((r) => thisWeek([r]).count === 1).map((r) => r.member_id)).size
  const series = weeklySeries(club.runs, 8).map((w) => ({ label: w.label, value: w.km }))
  const tog = togetherDays(club.runs, 7)
  const myWeek = thisWeek(club.runs.filter((r) => r.member_id === member.id))

  const now = new Date()
  const empty = club.loaded && !club.failed && club.runs.length === 0

  return (
    <>
      <header className="home-top">
        <p className="sub">
          {now.getMonth() + 1}월 {now.getDate()}일 {DOW[now.getDay()]}요일
        </p>
        <h1 className="page-title">
          {member.name}님, <span className="home-hi">오늘도 달려요</span>
        </h1>
      </header>

      {!empty && (
      <section className="card card-hero hero">
        <p className="card-label">우리가 함께 달린 거리</p>
        <p className="hero-num big-num">
          {kmLabel(shown)}
          <span className="hero-unit">km</span>
        </p>
        <p className="hero-delta">
          {myWeek.count > 0 ? (
            <>
              이번 주 나 <b>{myWeek.count}회 · {kmLabel(myWeek.km)}km</b>
            </>
          ) : (
            <>이번 주 내 기록은 아직 없어요</>
          )}
        </p>
      </section>
      )}

      {!club.loaded && (
        <div className="loading">
          <span className="spinner" />
        </div>
      )}

      {club.failed && <EmptyState emoji="📡" text="기록을 불러오지 못했어요. 잠시 뒤에 다시 열어줘요" />}

      {empty && (
        <>
          <EmptyState emoji="🏫" text="첫 기록을 올리면 인하대에서 종주가 시작돼요" />
          {/* 빈 화면에서 다음에 뭘 해야 할지 알려주는 유일한 자리다 */}
          <Link className="btn" to="/upload">
            첫 인증 올리기
          </Link>
        </>
      )}

      {club.loaded && !club.failed && club.runs.length > 0 && (
        <>
          <Journey totalKm={total} />

          <section className="card">
            <p className="sec">
              <Icon name="spark" size={16} />
              이번 주 소모임
            </p>

            <div className="week-row">
              <Ring progress={joined / CLUB_SIZE} label={`${joined}/${CLUB_SIZE}`} sub="참여" />
              <div className="week-stats">
                <div>
                  <b className="big-num">{week.count}</b>
                  <i>인증</i>
                </div>
                <div>
                  <b className="big-num">{kmLabel(week.km)}</b>
                  <i>km</i>
                </div>
                <div>
                  <b className="big-num">{tog.together}</b>
                  <i>같이 달린 날</i>
                </div>
              </div>
            </div>

            <p className="sec week-sec">최근 8주</p>
            <Bars data={series} unit="km" />
          </section>

          <Roster members={club.members} runs={club.runs} meId={member.id} />

          <InstallHint />
        </>
      )}
    </>
  )
}
