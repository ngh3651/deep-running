import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: '홈', d: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z' },
  { to: '/feed', label: '피드', d: 'M4 6h.01M4 12h.01M4 18h.01M8.5 6H20M8.5 12H20M8.5 18H20' },
  { to: '/ranking', label: '랭킹', d: 'M6 20v-6M12 20V5M18 20v-9' },
  { to: '/my', label: '마이', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 20c1.6-3.3 4.5-5 8-5s6.4 1.7 8 5' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.slice(0, 2).map((t) => (
        <Tab key={t.to} {...t} />
      ))}
      <NavLink to="/upload" className="tab-up" aria-label="인증 올리기">
        ＋
      </NavLink>
      {TABS.slice(2).map((t) => (
        <Tab key={t.to} {...t} />
      ))}
    </nav>
  )
}

function Tab({ to, label, d }: { to: string; label: string; d: string }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={d} />
      </svg>
      {label}
    </NavLink>
  )
}
