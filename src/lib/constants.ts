export type Milestone = { km: number; place: string; reward: string; emoji: string }

/** 가상 종주 루트 (SPEC 6장). 거리는 도로 기준 대략값 — 멤버 투표로 바꾸려면 여기만 고치면 된다. */
export const MILESTONES: Milestone[] = [
  { km: 0, place: '인하대 출발', reward: '', emoji: '🏫' },
  { km: 10, place: '송도', reward: '단체 프사 갱신', emoji: '🌉' },
  { km: 50, place: '서울 한강', reward: '첫 도장 기념 러닝', emoji: '🌊' },
  { km: 130, place: '춘천', reward: '닭갈비 회식', emoji: '🐔' },
  { km: 290, place: '강릉', reward: '물회·바다 커피', emoji: '☕' },
  { km: 610, place: '부산', reward: '돼지국밥·밀면', emoji: '🌃' },
  { km: 900, place: '여수', reward: '밤바다 회식', emoji: '🌙' },
  { km: 1200, place: '전주', reward: '비빔밥', emoji: '🍚' },
  { km: 1500, place: '인천 복귀 — 전국일주 완주', reward: '시즌 피날레 파티', emoji: '🏁' },
  // 부산에서 직선 200km 건너 후쿠오카
  { km: 1700, place: '후쿠오카', reward: '인하대 앞 일식집', emoji: '🍣' },
]

/** 소모임 정원 — 홈 '참여 m/7명'에 쓴다 */
export const CLUB_SIZE = 7
