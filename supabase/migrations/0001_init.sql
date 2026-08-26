create table members (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,          -- 로그인 아이디 겸 표시 이름 (trim 후 저장)
  pw_hash text not null,              -- 숫자 4자리의 해시
  emoji text not null default '🏃',
  created_at timestamptz not null default now()
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  run_date date not null,
  distance_km numeric(5,2) not null check (distance_km between 0.1 and 60),
  duration_sec integer not null check (duration_sec between 60 and 21600),
  memo text check (char_length(memo) <= 60),
  screenshot_url text not null,
  created_at timestamptz not null default now()
);

alter table members enable row level security;
alter table runs enable row level security;
create policy members_select on members for select using (true);
create policy members_insert on members for insert with check (true);
create policy runs_select  on runs for select using (true);
create policy runs_insert  on runs for insert with check (true);
create policy runs_delete  on runs for delete using (true);

-- 스크린샷 버킷: public read + anon 업로드 허용 (기록 삭제 시 파일도 지우므로 delete 포함)
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy screenshots_select on storage.objects
  for select using (bucket_id = 'screenshots');
create policy screenshots_insert on storage.objects
  for insert with check (bucket_id = 'screenshots');
create policy screenshots_delete on storage.objects
  for delete using (bucket_id = 'screenshots');
