import { Outlet, useOutletContext } from 'react-router-dom'
import type { Session } from '../lib/auth'
import { useClub } from '../lib/store'
import Icon from './Icon'
import TabBar from './TabBar'

export type Ctx = { member: Session; logout: () => void }

export const useApp = () => useOutletContext<Ctx>()

export default function Layout({ member, onLogout }: { member: Session; onLogout: () => void }) {
  const { stale } = useClub()
  return (
    <div className="shell">
      {stale && (
        <p className="stale" role="status">
          <Icon name="info" size={14} />
          연결이 안 돼서 마지막으로 받아둔 기록을 보여주고 있어요
        </p>
      )}
      <main className="main">
        <Outlet context={{ member, logout: onLogout } satisfies Ctx} />
      </main>
      <TabBar />
    </div>
  )
}
