// Supabase REST(PostgREST) 흉내. 스크린샷 harness가 실제 DB 대신 이걸 물린다.
// 운영 DB를 건드리지 않고, 기록이 가득 찬 화면을 결정적으로 재현하는 게 목적이다.

const parseSelect = (sel) => ({
  embedMembers: /members\s*\(/.test(sel || ''),
})

function applyFilters(rows, params) {
  let out = rows
  for (const [k, v] of params) {
    if (k === 'select' || k === 'order' || k === 'limit' || k === 'offset') continue
    const [op, ...rest] = String(v).split('.')
    const val = rest.join('.')
    if (op === 'eq') out = out.filter((r) => String(r[k]) === val)
    else if (op === 'gte') out = out.filter((r) => String(r[k]) >= val)
    else if (op === 'lte') out = out.filter((r) => String(r[k]) <= val)
  }
  return out
}

function applyOrder(rows, params) {
  const orders = params.getAll('order')
  if (!orders.length) return rows
  const keys = orders.flatMap((o) => o.split(',')).map((o) => {
    const [col, ...mods] = o.split('.')
    return { col, desc: mods.includes('desc') }
  })
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const x = a[col], y = b[col]
      if (x === y) continue
      const c = x > y ? 1 : -1
      return desc ? -c : c
    }
    return 0
  })
}

/** @returns {{status:number, body:any}} */
export function handle(url, method, data) {
  const u = new URL(url)
  const table = u.pathname.split('/rest/v1/')[1]?.split('?')[0]
  const p = u.searchParams

  if (method === 'DELETE') {
    const before = data.runs.length
    data.runs = data.runs.filter((r) => !applyFilters([r], p).length)
    return { status: 204, body: null, changed: before !== data.runs.length }
  }

  if (method === 'POST') return { status: 201, body: [] }
  if (method === 'PATCH') return { status: 200, body: [] }

  if (table === 'members') {
    let rows = applyFilters(data.members, p)
    rows = applyOrder(rows, p)
    return { status: 200, body: rows.map((m) => ({ ...m, pw_hash: 'x', created_at: '2026-08-01T00:00:00Z' })) }
  }

  if (table === 'runs') {
    let rows = applyFilters(data.runs, p)
    rows = applyOrder(rows, p)
    const lim = Number(p.get('limit') || 0)
    if (lim) rows = rows.slice(0, lim)
    const { embedMembers } = parseSelect(p.get('select'))
    if (embedMembers) {
      const by = new Map(data.members.map((m) => [m.id, m]))
      rows = rows.map((r) => {
        const m = by.get(r.member_id)
        return { ...r, members: m ? { name: m.name, emoji: m.emoji } : null }
      })
    }
    return { status: 200, body: rows }
  }

  // 아직 없는 테이블(건의함 등) — 실제 Supabase가 주는 모양 그대로 404를 준다
  return { status: 404, body: { code: '42P01', message: `relation "public.${table}" does not exist` } }
}
