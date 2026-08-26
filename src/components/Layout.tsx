import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'

export default function Layout() {
  return (
    <div className="shell">
      <main className="main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
