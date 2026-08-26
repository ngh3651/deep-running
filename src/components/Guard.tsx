import { Component, type ReactNode } from 'react'

/**
 * 렌더링 중 예외가 나면 흰 화면이 뜬다. 폰에서 흰 화면을 만난 사람은 그냥 앱을 닫는다.
 * 무슨 일이 났는지 말해주고 다시 열 길을 준다.
 */
export default class Guard extends Component<{ children: ReactNode }, { dead: boolean }> {
  state = { dead: false }

  static getDerivedStateFromError() {
    return { dead: true }
  }

  render() {
    if (!this.state.dead) return this.props.children
    return (
      <div className="dead">
        <p className="dead-emoji">🙈</p>
        <p className="dead-title">화면을 그리다가 멈췄어요</p>
        <p className="sub">다시 열면 대부분 괜찮아져요. 계속 이러면 소모임장에게 알려줘요</p>
        <button className="btn" onClick={() => window.location.reload()}>
          다시 열기
        </button>
      </div>
    )
  }
}
