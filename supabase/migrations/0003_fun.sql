-- 0003 — 케이던스 · 건의함 · 응원
--
-- Supabase SQL Editor 에 통째로 붙여넣고 한 번에 실행한다.
-- 앱은 suggestions 테이블 하나만 물어보고 셋 다 있다고 판단하니 (src/lib/store.ts probeCaps)
-- 쪼개서 일부만 적용하지 말 것. 여러 번 돌려도 안전하다.

-- 케이던스(분당 걸음 수). 러닝앱이 다 주는 숫자인데 어느 앱도 순위를 매기지 않아서 골랐다
alter table runs add column if not exists cadence_spm smallint;

do $$ begin
  alter table runs add constraint runs_cadence_range
    check (cadence_spm is null or cadence_spm between 100 and 250);
exception when duplicate_object then null; end $$;

-- 건의함 — 소모임원이 보내고 소모임장(가장 먼저 가입한 사람)이 읽는다
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  text text not null check (char_length(text) between 1 and 300),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 응원 — 기록 하나에 사람 하나가 한 번
create table if not exists cheers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (run_id, member_id)
);

alter table suggestions enable row level security;
alter table cheers enable row level security;

-- RLS 수준은 기존과 같다 — 7명 신뢰 기반, 링크는 톡방에만 (SPEC 9장의 의도된 트레이드오프)
drop policy if exists suggestions_select on suggestions;
drop policy if exists suggestions_insert on suggestions;
drop policy if exists suggestions_update on suggestions;
create policy suggestions_select on suggestions for select using (true);
create policy suggestions_insert on suggestions for insert with check (true);
create policy suggestions_update on suggestions for update using (true) with check (true);

drop policy if exists cheers_select on cheers;
drop policy if exists cheers_insert on cheers;
drop policy if exists cheers_delete on cheers;
create policy cheers_select on cheers for select using (true);
create policy cheers_insert on cheers for insert with check (true);
create policy cheers_delete on cheers for delete using (true);

create index if not exists cheers_run_idx on cheers (run_id);
create index if not exists runs_member_date_idx on runs (member_id, run_date desc);
