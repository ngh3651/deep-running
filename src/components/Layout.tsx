import { Outlet, useOutletContext } from 'react-router-dom'
import type { Session } from '../lib/auth'
import TabBar from './TabBar'

export type Ctx = { member: Session; logout: () => void }

export const useApp = () => useOutletContext<Ctx>()

export default function Layout({ member, onLogout }: { member: Session; onLogout: () => void }) {
  return (
    <div className="shell">
      <main className="main">
        <Outlet context={{ member, logout: onLogout } satisfies Ctx} />
      </main>
      <TabBar />
    </div>
  )
}
