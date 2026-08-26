import { useEffect, useState } from 'react'

/** 움직임을 줄여달라고 한 사람인가. CSS 리셋은 JS 카운트업을 못 막아서 직접 본다 */
export const calm = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 0에서 목표까지 세어 올린다. 화면당 한 번만 쓴다 */
export function useCountUp(target: number, ms = 700): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target) return setV(0)
    if (calm()) return setV(target)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setV(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}
