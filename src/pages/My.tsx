import { useApp } from '../components/Layout'

export default function My() {
  const { member, logout } = useApp()

  return (
    <>
      <h1 className="page-title">마이</h1>

      <div className="card profile">
        <div className="profile-emoji">{member.emoji}</div>
        <div>
          <p className="profile-name">{member.name}</p>
          <p className="sub">Deep Running</p>
        </div>
      </div>

      <button className="btn btn-ghost" onClick={logout}>
        로그아웃
      </button>
    </>
  )
}
