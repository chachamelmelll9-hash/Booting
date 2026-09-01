import { Injectable } from '@nestjs/common';

import { formatRegion } from '../common/privacy';
import { SupabaseService } from '../supabase/supabase.service';

export interface RegionRow {
  code: string;
  sido: string;
  sigungu: string;
  lat: number;
  lng: number;
  sortOrder: number;
  label: string;
}

/**
 * 시·군·구 참조 데이터.
 *
 * 229행짜리 고정 데이터라 프로세스 메모리에 한 번만 올린다. 반경 필터는 매 추천
 * 요청마다 거리 계산이 필요한데, 그때마다 DB 를 왕복할 이유가 없다.
 */
@Injectable()
export class RegionsService {
  private cache: RegionRow[] | null = null;

  constructor(private readonly supabase: SupabaseService) {}

  async all(): Promise<RegionRow[]> {
    if (this.cache) return this.cache;

    const { data, error } = await this.supabase
      .getClient()
      .from('regions')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (error) throw new Error(error.message);

    this.cache = (data ?? []).map((r) => ({
      code: r.code as string,
      sido: r.sido as string,
      sigungu: r.sigungu as string,
      lat: r.lat as number,
      lng: r.lng as number,
      sortOrder: r.sort_order as number,
      label: formatRegion(r.sido as string, r.sigungu as string),
    }));
    return this.cache;
  }

  async byCode(code: string): Promise<RegionRow | null> {
    return (await this.all()).find((r) => r.code === code) ?? null;
  }

  async label(code: string): Promise<string> {
    return (await this.byCode(code))?.label ?? '';
  }

  /** radiusKm === 0 이면 전국 — null 을 돌려 호출자가 지역 조건을 걸지 않게 한다 */
  async codesWithin(originCode: string, radiusKm: number): Promise<string[] | null> {
    if (!radiusKm) return null;
    const origin = await this.byCode(originCode);
    if (!origin) return null;

    const regions = await this.all();
    return regions
      .filter((r) => haversineKm(origin.lat, origin.lng, r.lat, r.lng) <= radiusKm)
      .map((r) => r.code);
  }

  async distanceKm(a: string, b: string): Promise<number | null> {
    const [ra, rb] = await Promise.all([this.byCode(a), this.byCode(b)]);
    if (!ra || !rb) return null;
    return Math.round(haversineKm(ra.lat, ra.lng, rb.lat, rb.lng));
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
