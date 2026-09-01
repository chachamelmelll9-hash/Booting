/**
 * 개인정보 가공 — **서버에서만** 한다.
 *
 * PRD 비공개 규칙: 실명은 `김OO` 형태로 마스킹하고, 생년월일 대신 나이만,
 * 정확한 주소 대신 시·군·구만 내려간다. 클라이언트 마스킹은 API 를 직접 부르면
 * 우회되므로 원본을 아예 DTO 에 담지 않는다.
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
