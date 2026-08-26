import { useEffect, useState } from 'react'
import Icon from './Icon'

const KEY = 'dr_install_hidden'

type Prompt = Event & { prompt: () => Promise<void> }

/**
 * 홈 화면에 추가하라고 한 번 권한다.
 *
 * 이게 이탈률에 제일 크게 걸린다 — 주소를 매번 찾아 치게 하면 안 올린다.
 * 이미 앱처럼 열렸거나 한 번 닫았으면 다시 뜨지 않는다.
 */
export default function InstallHint() {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    let dismissed = false
    try {
      dismissed = localStorage.getItem(KEY) === '1'
    } catch {}
    if (standalone || dismissed) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (ios) setHidden(false)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as Prompt)
      setHidden(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (hidden) return null

  const close = () => {
    setHidden(true)
    try {
      localStorage.setItem(KEY, '1')
    } catch {}
  }

  return (
    <section className="card card-tight install">
      <span className="install-ico">
        <Icon name="plus" size={18} />
      </span>
      <span className="install-body">
        <b>홈 화면에 추가해요</b>
        <i>
          {prompt
            ? '앱처럼 한 번에 열려요'
            : '아래 공유 버튼 → “홈 화면에 추가”를 누르면 앱처럼 열려요'}
        </i>
      </span>
      {prompt ? (
        <button
          className="chip on install-go"
          onClick={() => {
            void prompt.prompt()
            close()
          }}
        >
          추가
        </button>
      ) : null}
      <button className="install-x" onClick={close} aria-label="닫기">
        <Icon name="close" size={16} />
      </button>
    </section>
  )
}
