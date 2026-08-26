-- 사진을 저장하지 않는다 (SPEC 4.4, 9장) — 브라우저에서 OCR로 읽고 버린다.
-- 기록(거리·시간·메모·날짜)은 그대로 남는다. 이미 올라간 사진 파일만 사라진다.
alter table runs drop column screenshot_url;

drop policy if exists screenshots_select on storage.objects;
drop policy if exists screenshots_insert on storage.objects;
drop policy if exists screenshots_delete on storage.objects;

-- 버킷은 비어 있어야 지워진다 (storage.objects → storage.buckets 외래키)
delete from storage.objects where bucket_id = 'screenshots';
delete from storage.buckets where id = 'screenshots';
