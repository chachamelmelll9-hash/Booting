import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { MAX_PROFILE_PHOTOS } from '../common/types';
import { SupabaseService } from '../supabase/supabase.service';
import { PhotoDto } from './dto/parent-profile.dto';

const BUCKET = 'parent-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

@Injectable()
export class PhotosService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * 사진 행 → 서명 URL 이 붙은 DTO.
   * 버킷이 비공개라 경로만으로는 아무도 열 수 없다 — 노출은 항상 서명 URL 을 거친다.
   */
  async toDtos(rows: Record<string, any>[]): Promise<PhotoDto[]> {
    if (!rows.length) return [];

    const paths = rows.map((r) => r.storage_path);
    const { data } = await this.supabase
      .getClient()
      .storage.from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    const urlByPath = new Map<string, string>();
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    }

    return rows
      .map((r) => ({
        id: r.id,
        url: urlByPath.get(r.storage_path) ?? '',
        isPrimary: r.is_primary,
        sortOrder: r.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listByProfile(parentProfileId: string): Promise<PhotoDto[]> {
    const { data } = await this.supabase
      .getClient()
      .from('parent_photos')
      .select('*')
      .eq('parent_profile_id', parentProfileId)
      .order('sort_order', { ascending: true });

    return this.toDtos(data ?? []);
  }

  async add(
    parentProfileId: string,
    userId: string,
    storagePath: string,
    isPrimary: boolean
  ): Promise<PhotoDto[]> {
    // 업로드 경로는 반드시 본인 폴더여야 한다. Storage RLS 와 같은 규칙을
    // 서버에서도 한 번 더 확인한다 (service-role 은 RLS 를 우회하므로).
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new ForbiddenException(domainError(ERROR_CODES.FORBIDDEN));
    }

    const client = this.supabase.getClient();
    const { data: existing } = await client
      .from('parent_photos')
      .select('id, is_primary, sort_order')
      .eq('parent_profile_id', parentProfileId);

    const rows = existing ?? [];
    if (rows.length >= MAX_PROFILE_PHOTOS) {
      throw new BadRequestException(domainError(ERROR_CODES.PHOTOS_MAX));
    }

    const first = rows.length === 0;
    const primary = isPrimary || first;

    if (primary && rows.length) {
      // 대표 사진은 프로필당 한 장 (부분 유니크 인덱스와 짝을 이룬다)
      await client
        .from('parent_photos')
        .update({ is_primary: false })
        .eq('parent_profile_id', parentProfileId);
    }

    const nextOrder = rows.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;

    const { error } = await client.from('parent_photos').insert({
      parent_profile_id: parentProfileId,
      storage_path: storagePath,
      is_primary: primary,
      sort_order: nextOrder,
    });
    if (error) throw new BadRequestException({ code: 'photo_insert_failed', message: error.message });

    return this.listByProfile(parentProfileId);
  }

  async remove(parentProfileId: string, photoId: string): Promise<PhotoDto[]> {
    const client = this.supabase.getClient();

    const { data: photo } = await client
      .from('parent_photos')
      .select('id, storage_path, is_primary')
      .eq('id', photoId)
      .eq('parent_profile_id', parentProfileId) // 소유권 스코프
      .maybeSingle();

    if (!photo) throw new NotFoundException(domainError(ERROR_CODES.NOT_FOUND));

    await client.from('parent_photos').delete().eq('id', photoId);
    await client.storage.from(BUCKET).remove([photo.storage_path]);

    if (photo.is_primary) {
      // 대표를 지웠으면 남은 것 중 첫 장을 승격시킨다 — 대표 없는 프로필이 되면
      // 추천 카드가 빈 이미지로 뜬다
      const { data: rest } = await client
        .from('parent_photos')
        .select('id')
        .eq('parent_profile_id', parentProfileId)
        .order('sort_order', { ascending: true })
        .limit(1);
      if (rest?.length) {
        await client
          .from('parent_photos')
          .update({ is_primary: true })
          .eq('id', rest[0].id);
      }
    }

    return this.listByProfile(parentProfileId);
  }

  /** 추천 카드용 대표 사진 서명 URL (프로필 id → URL) */
  async primaryUrls(profileIds: string[]): Promise<Map<string, string>> {
    if (!profileIds.length) return new Map();

    const { data } = await this.supabase
      .getClient()
      .from('parent_photos')
      .select('parent_profile_id, storage_path')
      .in('parent_profile_id', profileIds)
      .eq('is_primary', true);

    const rows = data ?? [];
    if (!rows.length) return new Map();

    const { data: signed } = await this.supabase
      .getClient()
      .storage.from(BUCKET)
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        SIGNED_URL_TTL_SECONDS
      );

    const urlByPath = new Map<string, string>();
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
    }

    const result = new Map<string, string>();
    for (const r of rows) {
      const url = urlByPath.get(r.storage_path);
      if (url) result.set(r.parent_profile_id, url);
    }
    return result;
  }
}
