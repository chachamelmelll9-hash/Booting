/**
 * 개인정보 가공 — **서버에서만** 한다.
 *
 * PRD 비공개 규칙: 실명 대신 사용자가 정한 별명을, 생년월일 대신 나이만,
 * 정확한 주소 대신 시·군·구만 내려간다. 클라이언트 가공은 API 를 직접 부르면
 * 우회되므로 원본을 아예 DTO 에 담지 않는다.
 *
 * `maskName` 은 별명 도입 전 데이터의 폴백으로만 남아 있다 (nickname is null).
 */

/**
 * 별명에 실명을 넣는 건 **막지 않는다.**
 *
 * 실명 비공개는 서비스가 기본값으로 지켜주는 것이지, 본인이 밝히겠다는 걸
 * 대신 금지할 성질이 아니다. 자녀가 부모님 동의를 받아 등록하는 프로필이고,
 * 실명으로 알리고 싶은 경우가 실제로 있다. 대신 **실수로** 공개되는 건
 * 막아야 하므로, 실명과 같은 별명을 쓰면 화면에서 경고하고 한 번 확인받는다
 * (`apps/mobile/.../profileValidation.ts` 의 `leaksRealName`).
 *
 * 서버가 보장하는 건 그대로다 — `display_name`(실명)은 어떤 공개 DTO 에도
 * 담기지 않는다. 공개되는 값은 사용자가 별명 칸에 직접 적은 문자열뿐이다.
 */

/** "김철수" → "김OO", "남궁민수" → "남OOO", "김수" → "김O" */
export function maskName(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '';
  const [first, ...rest] = Array.from(trimmed);
  return first + 'O'.repeat(Math.max(rest.length, 1));
}

/** 생년월일 → 만 나이 */
export function calcAge(birthDate: string | Date, now = new Date()): number {
  const b = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

/** 소개글 미리보기 — 카드에는 앞부분만 */
export function excerpt(text: string | null | undefined, length = 60): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= length ? t : `${t.slice(0, length)}…`;
}

/** "서울특별시 송파구" → "서울 송파구" (카드 표기) */
export function formatRegion(sido: string, sigungu: string): string {
  const short = sido
    .replace('특별자치도', '')
    .replace('특별자치시', '')
    .replace('특별시', '')
    .replace('광역시', '')
    .replace('도', '');
  return `${short} ${sigungu}`.trim();
}
