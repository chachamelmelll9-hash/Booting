/**
 * 사진 업로드 — 클라이언트가 자기 JWT 로 Supabase Storage 에 직접 올린다.
 *
 * 서버를 거치지 않는 이유:
 *  - 이미지 바이트가 API 서버를 통과할 이유가 없다 (메모리·대역폭)
 *  - Storage RLS 정책이 `{userId}/...` 폴더만 허용하므로 소유권이 이미 강제된다
 * 서버에는 업로드된 **경로만** POST 한다.
 */
import { getAccessToken } from '@features/auth/lib/tokenStorage';
import * as ImagePicker from 'expo-image-picker';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
}

/**
 * 앨범이 돌려주는 형식은 기기마다 다르다 (아이폰은 heic 가 흔하다).
 * 확장자를 mime 에서 되짚어야 Storage 에 올라간 파일이 브라우저에서 열린다.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * 기기 앨범에서 사진을 **여러 장** 고른다 (최대 `limit` 장).
 *
 * 권한을 먼저 묻는다. 거부되면 던져서 호출부가 토스트로 알리게 한다 — 조용히
 * 빈 배열을 돌려주면 사용자는 버튼이 고장난 줄 안다. 다시 물을 수 없는 상태
 * (`canAskAgain === false`)면 설정으로 가야 한다는 걸 문장으로 알려준다.
 *
 * 취소는 실패가 아니다. `canceled` 는 빈 배열로 돌려보내 아무 일도 일어나지 않게 한다.
 *
 * 정사각 자르기(`allowsEditing`)는 쓰지 않는다. expo-image-picker 에서 자르기와
 * 다중 선택은 서로 배타적이라, 3~5장을 한 장씩 자르며 올리게 하면 등록이 가장
 * 자주 중단되는 자리가 됐다. 대신 화면 쪽이 `resizeMode="cover"` 로 가운데를
 * 보여준다. `quality` 로 다시 인코딩되므로 촬영 위치 같은 EXIF 는 여전히 떨어진다.
 */
export async function pickImages(limit: number): Promise<PickedImage[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      permission.canAskAgain
        ? '사진을 올리려면 앨범 접근을 허용해 주세요'
        : '설정에서 부팅의 사진 접근을 허용해 주세요'
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: Math.max(1, limit),
    orderedSelection: true,
    quality: 0.8,
  });

  if (result.canceled) return [];

  /**
   * 파일명은 새로 짓는다. 앨범 원본 이름에는 공백·한글·중복이 섞여 있고,
   * 그대로 쓰면 Storage 경로에서 충돌하거나 인코딩 문제가 된다.
   * 같은 밀리초에 여러 장이 들어오므로 인덱스를 붙여 서로 겹치지 않게 한다.
   */
  const stamp = Date.now();
  return (result.assets ?? []).slice(0, limit).map((asset, index) => {
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const extension = EXTENSION_BY_MIME[mimeType] ?? 'jpg';
    return { uri: asset.uri, mimeType, fileName: `photo-${stamp}-${index}.${extension}` };
  });
}

/**
 * Storage 업로드. RN 에서는 multipart/form-data + file URI 가 가장 안정적이다
 * (ArrayBuffer 본문은 런타임마다 동작이 갈린다).
 * @returns 버킷 내 오브젝트 경로
 */
export async function uploadToStorage(
  /** `family-docs` 는 비공개 버킷 — 서버가 읽어 심사한 뒤 바로 지운다 */
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
