# Deep Running — 기획서 v2 (실행 스펙)

> 2026-08-26 · 소모임장 규혁 · **이 문서 하나로 Claude Code가 처음부터 배포까지 완성하는 것이 목표**
>
> v1(제품 기획)에 실행 스펙 — 화면 상세, 계산 규칙, DB, 디자인 토큰, 작업 규칙(CLAUDE.md), Phase별 완료 판정 — 을 붙였다. 스펙과 코드가 다르면 **스펙이 맞다.**

## 0. 사용법 (규혁용 — 이것만 읽어도 됨)

1. 새 폴더에 이 파일을 `SPEC.md`로 저장한다
2. Claude Code를 열고 이렇게 말한다:

```
SPEC.md 읽어. 11장의 CLAUDE.md를 먼저 만들고, 12장 Phase 0부터 순서대로 진행해.
```

3. 사람이 할 일은 13장의 4개가 전부다. 나머지는 전부 Claude Code가 스스로 결정하고 검증한다.

---

# PART A. 제품

## 1. 한 줄 정의

인하대 인공지능공학과 러닝 소모임 **Deep Running**(7명, 소모임장 규혁)의 인증 기록을 한곳에 모아, 혼자 쓰는 러닝앱이 못 주는 **"같이 달리는 재미"**를 만드는 소모임 전용 모바일 웹.

지금은 각자 나이키런클럽·삼성헬스로 달리고 톡방에 스크린샷으로 "오늘도 달렸습니다" 인증을 올린다. 이 인증이 톡방에 흘러가 버려 쌓이지 않는 게 아쉬움이고, 코딩하는 사람들이 이름까지 Deep Running인데 그냥 달리기만 하면 재미없다는 게 출발점이다.

## 2. 원칙 (판단 기준)

1. **기존 러닝앱과 경쟁하지 않는다.** 개인 기록 측정은 나이키런클럽이 잘한다. 우리는 소모임에만 있는 재미를 만든다.
2. **톡방을 대체하지 않고 보완한다.** 웹은 기록이 쌓이고 굴러가는 곳.
3. **경쟁보다 꾸준함.** 랭킹 1순위는 거리가 아니라 인증 횟수·스트릭. (기록 경쟁은 부상·초보 소외를 부른다)
4. **짜쳐도 우리만의 기능을, 예쁘게.**

## 3. 기능 범위

**MVP (이번에 만드는 것 전부):** 로그인(이름 + 숫자 4자리, 첫 입력이 곧 가입) · 인증 업로드(스크린샷+거리·시간) · 피드 · 마이 페이지(스트릭 포함) · 가상 종주(소모임 누적) · 주간 랭킹 · 내 기록 삭제

**MVP에서 뺀 것 (만들지 말 것):** 스크린샷 자동 인식, 푸시 알림, 콕 찌르기, 뱃지·퀘스트, 기록 비교, GPS 아트, 별도 회원가입·비번찾기 화면, 관리자 화면, 다크/라이트 전환(다크 고정), 지도 라이브러리, 무한 스크롤

**2차 백로그 (이번엔 안 함, 참고만):** 스크린샷 자동 인식(Tesseract.js 먼저, 부족하면 비전 API) — Deep Running의 "딥러닝" 담당 · 톡방 공유용 인증 카드 생성 · 콕 찌르기 · 기록 비교 그래프 · 뱃지 · 세계 일주 · GPS 아트 · LLM 주간 리캡

---

# PART B. 실행 스펙 (Claude Code용)

## 4. 화면 상세 (모바일 웹, 다크 고정, 하단 탭 5개)

하단 탭: **홈 · 피드 · ➕업로드(중앙, 강조 원형) · 랭킹 · 마이**. 로그인 전엔 로그인 화면만 접근 가능.

### 4.1 로그인 `/login`

**회원가입 화면은 없다.** 이름 + 숫자 4자리, 두 칸이 전부다. 처음 친 조합이 곧 내 계정이고, 다음부터 같은 조합을 치면 내 기록이 그대로 이어진다.

- 입력: 이름(텍스트, 앞뒤 공백 자동 제거) / 비밀번호(숫자 4자리, `inputmode="numeric"`, 마스킹) → [시작하기]
- 이름이 DB에 **없으면**: 확인 다이얼로그 "'규혁'으로 새로 시작할까요?" → 예 → members insert 후 로그인. 오타로 유령 계정이 생기는 걸 막는 유일한 장치라 생략 금지
- 이름이 **있고 비번 일치** → 로그인. **있고 불일치** → "비밀번호가 달라요" + 흔들림. 이 경우 절대 새 계정을 만들지 않는다
- 이모지는 가입 시 자동 배정(입력 단계 추가 금지). 후보: 🏃 🐢 🔥 ⚡ 🌙 🍀 🦊 🐻 🐰 🦁
- 성공: `localStorage.dr_member = {id, name, emoji}` → 홈. **만료 없음** — 직접 로그아웃하기 전까지 유지 (매번 다시 치게 하면 안 쓴다)
- 비번 분실: 소모임장에게 말하면 규혁이 Supabase에서 해당 행을 지워 다시 만들게 안내

### 4.2 홈 `/`
- 소모임 **누적 거리** 큰 숫자 (카운트업 애니메이션 1개 허용)
- **가상 종주 카드**: 세로 타임라인 — 지나온 도시 ✓, 현재 구간 진행바(%), 다음 도시까지 남은 km, 다음 보상 문구. 지도 라이브러리 금지 — CSS/SVG로
- **이번 주 카드**: 인증 n건 · 합계 km · 참여 m/7명
- 빈 상태: "첫 기록을 올리면 인하대에서 종주가 시작돼요"

### 4.3 피드 `/feed`
- 최신순 50건 (페이지네이션·무한스크롤 없음, 새로고침 버튼 1개)
- RunCard: 이모지+이름 · 날짜(M/D 요일) · **거리 큰 숫자** + 페이스 + 시간 · 메모 · 스크린샷 썸네일(max-height 240px, 탭하면 풀스크린 오버레이, 다시 탭으로 닫기)

### 4.4 업로드 `/upload`
- 폼 순서: 스크린샷(필수, 선택 즉시 미리보기) → 거리 km(숫자, step 0.01) → 시간(텍스트: `16:49`, `1:05:55`, `28` 전부 허용) → 날짜(기본 오늘) → 메모(선택, 60자) → [인증 올리기]
- 이미지는 업로드 전 클라이언트 압축: 최대 폭 1280px, 품질 0.8 (browser-image-compression)
- 저장 성공 → 피드로 이동 + 토스트 "인증 완료! 🔥"
- 검증 실패 문구는 구체적으로: "거리는 0.1~60km 사이로 적어줘요" / "시간 형식을 확인해줘요 (예: 16:49)"

### 4.5 랭킹 `/ranking`
- 기간 세그먼트: **이번 주 / 이번 달 / 전체**
- 행: 순위(1~3위 🥇🥈🥉) · 이모지+이름 · **인증 n회** · nn.n km. 내 행은 하이라이트
- 정렬: 인증 횟수 ↓ → 거리 ↓ → 이름 가나다 (원칙 3: 꾸준함 우선)

### 4.6 마이 `/my`
- 프로필(이모지+이름) · 스탯 3개: 이번 달 km / 누적 km / 총 인증
- **주간 스트릭 카드**: "🔥 n주 연속" + 이번 주 인증 없으면 "이번 주 아직 안 달렸어요 — 불꽃이 꺼지기 전에!"
- 내 기록 리스트: 각 행 ⋯ 메뉴 → 삭제(confirm "이 기록을 지울까요?", 하드 삭제 + 스크린샷 파일도 삭제)
- 로그아웃

## 5. 계산 규칙 (정확히 이대로 구현, 전부 저장하지 않고 계산)

- **페이스**: `total = round(duration_sec / distance_km)` → `${floor(total/60)}'${(total%60) 2자리}"` 표기. 예: 1009초/3.01km → `5'35"`
- **주 경계**: 월요일 00:00 시작(로컬 시간 = 멤버 전원 한국, `run_date` 기준). date-fns `startOfWeek(weekStartsOn: 1)`
- **주간 스트릭**: 이번 주에 인증 ≥1건이면 이번 주 포함해 뒤로 연속인 주 수. 이번 주 0건이면 지난주부터 뒤로 센 값 + "이번 주 아직" 플래그. 예: 3주 전·2주 전·지난주 인증 있고 이번 주 없음 → `3주 연속 + 아직 플래그`
- **랭킹 집계**: 기간 내 runs를 member별로 count·sum. 동률 규칙은 4.5
- **종주 진행**: `누적 = 전체 runs distance 합`. 현재 구간 = 마지막으로 `누적 ≥ 누적km` 를 만족한 마일스톤 → 다음 마일스톤. 진행률 = `(누적-이전)/(다음-이전)`. 경계값: 누적이 정확히 마일스톤 값이면 달성으로 처리

## 6. 가상 종주 데이터 (`src/lib/constants.ts`에 이 그대로)

| 누적 km | 도착지 | 보상 | 이모지 |
|---|---|---|---|
| 0 | 인하대 출발 | — | 🏫 |
| 10 | 송도 | 단체 프사 갱신 | 🌉 |
| 50 | 서울 한강 | 첫 도장 기념 러닝 | 🌊 |
| 130 | 춘천 | 닭갈비 회식 | 🐔 |
| 290 | 강릉 | 물회·바다 커피 | ☕ |
| 610 | 부산 | 돼지국밥·밀면 | 🌃 |
| 900 | 여수 | 밤바다 회식 | 🌙 |
| 1200 | 전주 | 비빔밥 | 🍚 |
| 1500 | 인천 복귀 — 전국일주 완주 | 시즌 피날레 파티 | 🏁 |
| 1700 | 후쿠오카 (부산→직선 200km) | 인하대 앞 일식집 | 🍣 |

거리는 도로 기준 대략값. 페이스 산수: 1인 월 10~15km × 7명 ≈ **월 70~100km** → 송도 첫 주, 서울 3주 차, 이후 한 달에 도장 1~2개. 루트·보상은 규혁이 나중에 멤버 투표로 조정 가능(상수만 바꾸면 됨).

## 7. 디자인 시스템 (이 토큰 밖의 색·값 사용 금지)

```css
:root {
  --bg:#0B0F1A; --surface:#141B2E; --surface2:#1D2740; --line:#26314F;
  --text:#F4F6FB; --sub:#93A0BC;
  --accent:#FF6B2C; --good:#3DDC97; --bad:#FF5D73; --gold:#FFC24B;
  --grad-run: linear-gradient(90deg,#FF6B2C,#FFB020); /* 종주 진행바·강조 전용 */
  --r-card:20px; --r-btn:12px;
}
```

- 폰트: **Pretendard Variable** (jsdelivr CDN), fallback `-apple-system, sans-serif`. 큰 숫자는 weight 800 + `font-variant-numeric: tabular-nums`
- 무드: 야간 러닝. 다크 단일 테마. 카드 기반 레이아웃, 여백 넉넉히(16/20/24px 스케일), 그림자 대신 `--line` 1px 테두리
- 하단 탭 높이 64px + `env(safe-area-inset-bottom)`. 업로드 탭은 `--grad-run` 원형 버튼으로 강조
- 이모지는 포인트로만(화면당 2~3개). 스타일링은 순수 CSS + 위 변수만 — **Tailwind·CSS 프레임워크 금지**
- 뷰포트 기준 390px. 610px 이상은 중앙 max-width 480px 컨테이너

## 8. 기술 스택 (확정 — 변경 금지)

| 구분 | 확정 | 비고 |
|---|---|---|
| 프론트 | Vite + React + **TypeScript** | 타입 에러 = 공짜 검증 |
| 라우팅 | react-router-dom **HashRouter** | GitHub Pages에서 새로고침 404 방지 |
| DB·저장소 | Supabase (무료) | 서버 코드 없음. 전부 클라이언트에서 supabase-js |
| 배포 | **GitHub Pages** (Actions) | 규혁이 이미 써본 스택, 새 계정 불필요 |
| 테스트 | vitest — **계산·파싱 함수만** | UI 테스트 금지 (Simplicity) |
| 스크린샷 검증 | Playwright (devDependency) | 각 Phase에서 390×844 캡처 자기 확인용 |

**의존성 화이트리스트 (이 외 설치 금지):** `react` `react-dom` `react-router-dom` `@supabase/supabase-js` `browser-image-compression` `date-fns` / dev: `typescript` `vite` `@vitejs/plugin-react` `vitest` `playwright`

## 9. 데이터베이스 (`supabase/migrations/0001_init.sql`)

```sql
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
```

- Storage 버킷 `screenshots`: public read + anon 업로드 허용
- **비밀번호**: 숫자 4자리. `pw_hash = SHA-256(name + ':' + pw)` hex, WebCrypto로 클라이언트에서 계산 (평문 저장 금지 — 해시는 공짜다)
- **보안 수준 명시 (그대로 받아들일 것):** 4자리는 1만 가지뿐이고 시도 횟수 제한도 없다. anon key도 공개 전제라 코드에 커밋한다. 즉 링크를 아는 사람은 이론상 남의 이름으로 들어가거나 데이터를 조작할 수 있다 — 7명 신뢰 기반 동아리 도구이고 담기는 정보가 이름과 달린 거리뿐이라 **의도된 트레이드오프**다. 링크는 톡방에만 공유. 여기에 서버 인증·이메일 인증·비번 복잡도 규칙을 붙이는 과잉 설계 금지 (2차에 필요해지면 Edge Function으로 올린다)
- 시드: 개발용 데모 시드(`seed_demo.sql`, 멤버 3~4 + 기록 12건)로 화면을 채워 개발하고 **배포 인수 전 데모 멤버·기록을 전부 삭제**해 빈 상태로 넘긴다. 실제 멤버는 각자 첫 로그인 때 스스로 생긴다 — 명단을 미리 넣지 않는다

## 10. 파일 구조 (이 구조 밖 파일 생성 금지)

```
deep-running/
├─ SPEC.md  CLAUDE.md  README.md          ← 문서는 이 셋이 전부
├─ index.html  package.json  vite.config.ts  tsconfig.json
├─ .github/workflows/deploy.yml
├─ supabase/
│  ├─ migrations/0001_init.sql
│  └─ seed_demo.sql
├─ src/
│  ├─ main.tsx  App.tsx  styles.css
│  ├─ lib/        supabase.ts  auth.ts  calc.ts  parse.ts  constants.ts
│  ├─ components/ Layout.tsx  TabBar.tsx  RunCard.tsx  Journey.tsx  StatBig.tsx  EmptyState.tsx  Toast.tsx
│  └─ pages/      Login.tsx  Home.tsx  Feed.tsx  Upload.tsx  Ranking.tsx  My.tsx
└─ tests/  calc.test.ts  parse.test.ts
```

## 11. CLAUDE.md (저장소 루트에 이 내용 그대로 저장)

```markdown
# Deep Running — 작업 규칙

이 저장소의 유일한 스펙은 SPEC.md다. 스펙과 코드가 다르면 스펙이 맞다.
사람(규혁)은 거의 개입하지 않는다. 질문으로 멈추지 말고, 아래 규칙으로 스스로 결정하라.

## 원칙 4개
1. Think Before Coding — 짐작 금지. 스펙에 없는 결정은 '기본값 규칙'으로 정하고,
   그래도 애매하면 가장 단순한 안을 골라 README 맨 아래 '결정 로그'에 한 줄 남긴다.
2. Simplicity First — 문제를 푸는 최소한의 코드만. 추상화 레이어, 상태관리 라이브러리,
   서버 코드 금지. 200줄 썼는데 50줄이면 되겠다 싶으면 다시 쓴다.
3. Surgical Changes — 시키지 않은 리팩토링·개선·포맷 정리 금지.
   이번 Phase 범위 밖의 파일은 건드리지 않는다.
4. Goal-Driven Execution — 각 Phase의 '완료 판정'을 전부 통과하기 전에는
   다음 Phase로 넘어가지 않고, 완료라고 보고하지도 않는다.

## 기본값 규칙 (스펙에 없을 때)
- UI 문구는 한국어 해요체로 짧게. 영어 문구 금지 (고유명사 제외)
- 색·간격·폰트는 SPEC.md 디자인 토큰만 사용. 새 색 추가 금지
- 저장할지 계산할지 애매하면 계산한다 (페이스·스트릭·누적·랭킹은 전부 계산값)
- 의존성 추가는 SPEC.md 허용 목록 안에서만

## 검증 (모든 Phase 공통)
- npm run build 통과, 타입 에러 0, 브라우저 콘솔 에러 0
- npx vitest run 통과 (테스트가 있는 Phase)
- Playwright로 390×844 스크린샷을 찍어 직접 본다 — 깨진 레이아웃, 안 읽히는 대비,
  빈 화면, 영어 문구가 보이면 완료가 아니다
- 완료 판정 항목별 결과를 한 줄씩 보고한다

## 파일 규율
- SPEC.md의 폴더 구조 밖에 파일을 만들지 않는다
- 문서는 SPEC.md, CLAUDE.md, README.md 셋뿐. 작업 요약·보고용 .md 생성 금지 (보고는 대화로)
- 커밋은 Phase 단위로 잘게, 메시지는 한국어 한 줄. force push 금지

## 보고
- 결론부터, 짧은 산문으로. 목록 남발 금지
- 못 한 것과 불확실한 것은 그렇다고 말한다. 추측을 사실처럼 쓰지 않는다
```

## 12. 실행 계획 — Phase 게이트 (순서 고정, 판정 전부 통과 후 다음으로)

### Phase 0 — 셋업·배포 파이프라인
Vite+React+TS 스캐폴드, styles.css에 7장 토큰, HashRouter + 탭 5개 빈 페이지, GitHub 저장소 생성(gh CLI), Pages용 Actions 워크플로(vite `base:'./'`), Pages 활성화(gh api).
**판정:** build 에러 0 · 배포 URL이 200으로 열리고 탭 이동이 됨 · 390×844 스크린샷 확인

### Phase 1 — DB
0001_init.sql 작성·적용(Supabase MCP 또는 SQL Editor), screenshots 버킷 생성, seed_demo.sql 적용, supabase.ts 클라이언트.
**판정:** 앱에서 members select가 시드 멤버를 반환 · 시드 runs가 조회됨 · 새 members insert가 RLS에 막히지 않음

### Phase 2 — 로그인
4.1 전체.
**판정 시나리오 4개(각각 스크린샷):** ① 새 이름 입력 → 확인 다이얼로그 → 계정 생성·로그인 ② 로그아웃 후 같은 이름+비번으로 재로그인했을 때 이전 기록이 그대로 보임 ③ 기존 이름 + 틀린 비번 → 에러이고 계정이 중복 생성되지 않음 ④ 이름 앞뒤에 공백을 넣어도 같은 계정으로 들어감. 새로고침해도 세션 유지

### Phase 3 — 업로드
4.4 전체 + `parse.ts`(시간 파싱).
**판정:** tests/parse.test.ts 통과 — `"16:49"→1009` `"1:05:55"→3955` `"28"→1680` `"0"→거부` `"abc"→거부` · 실제 이미지 1장 업로드→Storage 저장→runs insert→피드에 보임 · 압축 후 파일이 원본보다 작음

### Phase 4 — 피드·마이
4.3, 4.6 + `calc.ts`(페이스·스트릭·집계).
**판정:** tests/calc.test.ts 통과 — 페이스 포맷 2케이스(5장 예시 포함), 스트릭 3케이스(연속/이번주없음/공백주), 주 경계(일→월 넘어가는 케이스) · 시드 데이터의 마이 통계를 손계산과 대조해 일치 · 삭제하면 피드·통계에서 즉시 반영

### Phase 5 — 홈(종주)·랭킹
4.2, 4.5 + constants.ts(6장 표 그대로).
**판정:** 누적=마일스톤 정확 도달 경계 테스트 1케이스 통과 · 시드 누적 합이 화면 숫자와 일치 · 랭킹 동률 정렬 확인 · 스크린샷 확인

### Phase 6 — 폴리시·인수
빈 상태 전 화면, 로딩 스피너, favicon·og 태그(제목 "Deep Running"), 데모 기록 삭제(멤버는 유지), README를 포트폴리오 품질로(소개 문단, 스크린샷 3장, 스택·아키텍처 4~5문장, 실행법, 결정 로그), 최종 배포.
**판정:** 전 화면 스크린샷 세트 최종 확인 · 아래 15장 성공 기준의 "출시 조건" 전부 충족 · 규혁에게 "폰 5분 점검 목록"(로그인→업로드→피드→홈 숫자→삭제) 전달

## 13. 사람(규혁)이 할 일 — 이 4개뿐

1. Supabase 프로젝트 1개 만들고 URL + anon key 전달 (Claude에 Supabase가 연결돼 있으면 이것도 생략 — "네가 만들어" 하면 됨)
2. GitHub 로그인 상태 확인 (`gh auth status`) — 저장소 생성·배포는 Claude Code가 함
3. 완성 후 폰으로 5분 점검 → 톡방에 링크 고정 + 안내 한 줄: "이름이랑 숫자 4자리 정해서 치면 끝, 다음부터 같은 걸로 들어오면 돼요"

멤버 명단은 준비할 필요 없다. 각자 첫 로그인 때 계정이 생기고, 신입이 들어와도 링크만 주면 된다.

## 14. 폰에서 지시·확인하는 법

개발 지시·진행 확인은 **claude.ai의 Claude Code 웹(클라우드 세션)** 으로 폰 브라우저·앱에서 가능하고, PC에서 돌리던 로컬 세션을 폰에서 이어받는 **Remote Control**도 있다. 결과물 자체가 모바일 웹이라 배포 URL만 열면 폰에서 바로 확인된다. 즉 "폰으로 시키고 → 폰으로 확인"이 된다.

## 15. 리스크 · 성공 기준

| 리스크 | 대응 |
|---|---|
| 이중 업로드 귀찮음 (최대 리스크) | MVP는 루프 30초 유지로 버티고, 2차 '인증 카드'로 웹 업로드→톡방 공유 순서 역전 |
| 초반 참여 절벽 | 첫 2주 소모임장 리마인드 + 과거 톡방 인증 소급 입력으로 첫 화면 채우기 |
| 수동 입력 뻥튀기 | 스크린샷 필수 + 7명 상호 검증 (신뢰 기반) |
| 링크 유출 | 톡방에만 공유. 문제 생기면 2차에서 초대코드/Edge Function |

**출시 조건(Phase 6 판정):** 폰에서 로그인→업로드→피드 노출까지 30초 내 · 콘솔 에러 0 · 전 화면 한국어·빈 상태 존재 · README 완성
**성공 기준(운영):** 개강 2주 내 7명 중 5명 이상 업로드 ≥1회 · 4주 차 주간 인증 5건+

## 16. 이 스펙에 반영한 기법 (왜 이렇게 생겼나)

**채택:** ① Karpathy식 4원칙(Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution)을 범용 문구가 아니라 이 프로젝트 전용 규칙으로 CLAUDE.md에 내장 ② Phase 게이트 + 완료 판정 = 검증 기준을 먼저 정하고 통과해야 진행 ③ 매 Phase Playwright 스크린샷 자기 검토(디자인을 "먼저 보는" 장치) ④ 계산·파싱 함수만 유닛테스트(판단 오류가 실제로 생기는 지점만) ⑤ 의존성·파일 구조 화이트리스트(어지럽힘 원천 차단) ⑥ 결정 로그(멈추지 않되 추적 가능) ⑦ 스펙 단일 진실.

**제외:** 멀티 에이전트·그래프 오케스트레이션(이 규모엔 과함 — Phase 게이트로 같은 효과), 범용 스킬 설치기(원칙만 흡수하면 되고, 광고 경유 npx 설치는 습관적으로 피하는 게 좋음), MCP 빌더(만들 MCP 없음), 브라우저 에이전트(Playwright 스크린샷으로 충분).
