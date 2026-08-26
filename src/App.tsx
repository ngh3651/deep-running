import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Feed from './pages/Feed'
import Upload from './pages/Upload'
import Ranking from './pages/Ranking'
import My from './pages/My'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/my" element={<My />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
