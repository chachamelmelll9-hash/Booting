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

/** 개발용 앨범에 표시할 샘플 항목 */
export interface SampleImage {
  id: string;
  label: string;
  /** 시트에서 구분되게 보여줄 색 (업로드되는 바이트와는 무관하다) */
  tint: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  { id: 'doc-1', label: '가족관계증명서', tint: '#CCFBF1' },
  { id: 'doc-2', label: '주민등록등본', tint: '#E0F2FE' },
  { id: 'photo-1', label: '부모님 사진', tint: '#FEF3C7' },
];

/**
 * 이미지 선택.
 *
 * TODO: `expo-image-picker` 가 붙으면 이 함수 **하나만** 갈아끼우면 된다
 * (네이티브 모듈이라 설치 시 앱 재빌드가 필요해 지금은 보류했다).
 *
 * 지금은 로컬에서 자리표시자 파일을 만들어 넘긴다. 업로드·Storage 정책·서버
 * 기록은 전부 진짜로 동작하고, 바뀌는 건 이미지 출처뿐이다.
 */
export async function pickImage(sample?: SampleImage): Promise<PickedImage | null> {
  const base64 = PLACEHOLDER_PNG_BASE64;
  const prefix = sample?.id ?? 'photo';
  const fileName = `${prefix}-${Date.now()}.png`;
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
