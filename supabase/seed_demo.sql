-- 개발용 데모 시드 (멤버 4 + 기록 12). 배포 인수 전 삭제한다 — SPEC 9장
-- 날짜는 '이번 주 월요일' 기준 상대 오프셋이라 언제 실행해도 주 경계가 유지된다.

insert into members (name, pw_hash, emoji) values
  ('지민', 'cce64430cd69357ea94b362f6447400dc4b0b5893b7be37b61bc5c6efa973bab', '🔥'),
  ('태윤', '09051d8c06e249ecfebc2e81ce6e56f9f407a5ac7cfa0e469db2723a435d58ee', '🐢'),
  ('서연', '2df5e0827aa03d5837b8c09391ad35f3fa98e2c390d8a2624d131773dc3a955b', '🍀'),
  ('하늘', 'eced8e199dadf84cb4ef5a579ac894c3b63736ff4112268753e095281a2a8a0b', '🌙')
on conflict (name) do nothing;

with w as (select date_trunc('week', current_date)::date as monday)
insert into runs (member_id, run_date, distance_km, duration_sec, memo, screenshot_url)
select m.id, v.d, v.km, v.sec, v.memo, v.url
from (values
  ('지민', (select monday from w) + 0, 6.2, 2050, '월요일부터 시동 걸었어요', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-1.jpg'),
  ('지민', (select monday from w) + -5, 5, 1680, null, 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-2.jpg'),
  ('지민', (select monday from w) + -2, 8.1, 2730, '송도 바다 보면서 8km', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-3.jpg'),
  ('지민', (select monday from w) + -13, 4.5, 1572, null, 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-4.jpg'),
  ('지민', (select monday from w) + -18, 7, 2405, '비 와서 트랙에서', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-5.jpg'),
  ('태윤', (select monday from w) + -4, 3.01, 1009, '짧게라도 나갔다 왔습니다', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-6.jpg'),
  ('태윤', (select monday from w) + -10, 5.5, 1880, null, 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-7.jpg'),
  ('태윤', (select monday from w) + -15, 10.2, 3955, '10km 처음 찍었어요', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-8.jpg'),
  ('서연', (select monday from w) + 0, 4, 1360, '가볍게 캠퍼스 두 바퀴', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-9.jpg'),
  ('서연', (select monday from w) + -26, 3.5, 1260, null, 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-10.jpg'),
  ('하늘', (select monday from w) + -3, 6.8, 2325, '야간 러닝 최고', 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-11.jpg'),
  ('하늘', (select monday from w) + -9, 5.2, 1810, null, 'https://xwrarkdiyewtidrxdkpf.supabase.co/storage/v1/object/public/screenshots/demo/demo-12.jpg')
) as v(name, d, km, sec, memo, url)
join members m on m.name = v.name;
