import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { clearMember, readMember, type Session } from './lib/auth'
import { loadClub } from './lib/store'
import Login from './pages/Login'
import Home from './pages/Home'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import Ranking from './pages/Ranking'
import My from './pages/My'

export default function App() {
  const [member, setMember] = useState<Session | null>(readMember)

  // 탭을 다시 열면 조용히 새로 받는다 — 새로고침 버튼을 찾아 누르게 하지 않으려고
  useEffect(() => {
    const onShow = () => document.visibilityState === 'visible' && void loadClub()
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])

  const logout = () => {
    clearMember()
    setMember(null)
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={member ? <Navigate to="/" replace /> : <Login onLogin={setMember} />}
        />
        <Route
          element={member ? <Layout member={member} onLogout={logout} /> : <Navigate to="/login" replace />}
        >
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/my" element={<My />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
