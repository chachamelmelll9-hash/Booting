/**
 * 사진 업로드 — 클라이언트가 자기 JWT 로 Supabase Storage 에 직접 올린다.
 *
 * 서버를 거치지 않는 이유:
 *  - 이미지 바이트가 API 서버를 통과할 이유가 없다 (메모리·대역폭)
 *  - Storage RLS 정책이 `{userId}/...` 폴더만 허용하므로 소유권이 이미 강제된다
 *  - 가족관계증명서도 같은 방식이라 경로가 하나로 유지된다
 * 서버에는 업로드된 **경로만** POST 한다.
 */
import { getAccessToken } from '@features/auth/lib/tokenStorage';
import * as FileSystem from 'expo-file-system/legacy';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
}

/**
 * 이미지 선택.
 *
 * TODO: `expo-image-picker` 가 설치되면 이 함수 **하나만** 갈아끼우면 된다.
 * 지금은 의존성을 추가할 수 없어(pnpm virtual store 불일치) 로컬에서
 * 자리표시자 이미지를 만들어 업로드까지의 경로 전체를 실제로 태운다.
 * 업로드·정책·서버 기록은 전부 진짜로 동작하고, 바뀌는 건 이미지 출처뿐이다.
 */
export async function pickImage(): Promise<PickedImage | null> {
  const base64 = PLACEHOLDER_PNG_BASE64;
  const fileName = `photo-${Date.now()}.png`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
  return { uri, mimeType: 'image/png', fileName };
}

/**
 * Storage 업로드. RN 에서는 multipart/form-data + file URI 가 가장 안정적이다
 * (ArrayBuffer 본문은 런타임마다 동작이 갈린다).
 * @returns 버킷 내 오브젝트 경로
 */
export async function uploadToStorage(
  bucket: 'parent-photos' | 'family-docs',
  userId: string,
  image: PickedImage
): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('로그인이 필요합니다');

  const objectPath = `${userId}/${image.fileName}`;
  const form = new FormData();
  form.append('file', {
    uri: image.uri,
    name: image.fileName,
    type: image.mimeType,
  } as unknown as Blob);

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(objectPath)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_KEY,
        'x-upsert': 'true',
      },
      body: form,
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`사진 업로드에 실패했습니다 (${response.status}) ${detail}`);
  }

  return objectPath;
}

/** 1x1 회색 PNG — 자리표시자 */
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAWklEQVR4nO3BAQ0AAADCoPdPbQ8H' +
  'FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAvAYtAAABAKuVvQAAAABJRU5ErkJggg==';
