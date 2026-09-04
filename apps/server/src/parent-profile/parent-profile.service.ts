import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { calcAge, formatRegion } from '../common/privacy';
import {
  MAX_RELATIONSHIP_GOALS,
  MIN_PROFILE_PHOTOS,
  PARENT_MIN_AGE,
  RelationshipGoal,
} from '../common/types';
import { SupabaseService } from '../supabase/supabase.service';
import { ConsentService } from './consent.service';
import {
  AddPhotoDto,
  ConsentDto,
  CreateParentProfileDto,
  ParentProfileDto,
  UpdateParentProfileDto,
} from './dto/parent-profile.dto';
import { PhotosService } from './photos.service';
import { ReviewService } from './review.service';

const PROFILE_COLUMNS = '*';

@Injectable()
export class ParentProfileService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly photos: PhotosService,
    private readonly consent: ConsentService,
    private readonly review: ReviewService
  ) {}

  // --- 조회 -------------------------------------------------------------------

  async findByUser(userId: string): Promise<ParentProfileDto | null> {
    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();

    return data ? this.toDto(data) : null;
  }

  private async requireOwn(userId: string) {
    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException(domainError(ERROR_CODES.PROFILE_NOT_FOUND));
    return data;
  }

  // --- 생성·수정 ---------------------------------------------------------------

  async create(userId: string, dto: CreateParentProfileDto): Promise<ParentProfileDto> {
    const existing = await this.findByUser(userId);
    if (existing) throw new BadRequestException(domainError(ERROR_CODES.PROFILE_EXISTS));

    if (calcAge(dto.birthDate) < PARENT_MIN_AGE) {
      throw new BadRequestException(domainError(ERROR_CODES.PARENT_MIN_AGE));
    }
    await this.assertRegionExists(dto.regionCode);
    this.assertGoals(dto.goals);

    const { data, error } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .insert({
        user_id: userId,
        display_name: dto.displayName,
        nickname: dto.nickname,
        gender: dto.gender,
        birth_date: dto.birthDate,
        region_code: dto.regionCode,
        marital_status: dto.maritalStatus,
        marital_since: dto.maritalSince ?? null,
        status: 'draft',
      })
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw this.translate(error);

    await this.replaceGoals(data.id, dto.goals);
    return this.toDto(data);
  }

  async update(userId: string, dto: UpdateParentProfileDto): Promise<ParentProfileDto> {
    const profile = await this.requireOwn(userId);

    if (dto.regionCode) await this.assertRegionExists(dto.regionCode);
    if (dto.goals) this.assertGoals(dto.goals);

    const patch: Record<string, unknown> = {};
    const map: Record<string, string> = {
      displayName: 'display_name',
      nickname: 'nickname',
      regionCode: 'region_code',
      maritalSince: 'marital_since',
      heightCm: 'height_cm',
      childrenCount: 'children_count',
      livingWith: 'living_with',
      religion: 'religion',
      occupation: 'occupation',
      retiredOccupation: 'retired_occupation',
      economicallyActive: 'economically_active',
      drinking: 'drinking',
      smoking: 'smoking',
      hobbies: 'hobbies',
      motto: 'motto',
      introByChild: 'intro_by_child',
      desiredPartner: 'desired_partner',
      parentMessage: 'parent_message',
    };
    for (const [key, column] of Object.entries(map)) {
      const value = (dto as Record<string, unknown>)[key];
      if (value !== undefined) patch[column] = value;
    }

    if (Object.keys(patch).length) {
      const { error } = await this.supabase
        .getClient()
        .from('parent_profiles')
        .update(patch)
        .eq('id', profile.id)
        .eq('user_id', userId); // IDOR 방어
      if (error) throw this.translate(error);
    }

    if (dto.goals) await this.replaceGoals(profile.id, dto.goals);
    if (dto.saju) await this.upsertSaju(profile.id, dto.saju);

    return (await this.findByUser(userId))!;
  }

  // --- 사진 -------------------------------------------------------------------

  async addPhoto(userId: string, dto: AddPhotoDto) {
    const profile = await this.requireOwn(userId);
    return this.photos.add(profile.id, userId, dto.storagePath, dto.isPrimary ?? false);
  }

  async removePhoto(userId: string, photoId: string) {
    const profile = await this.requireOwn(userId);
    return this.photos.remove(profile.id, photoId);
  }

  // --- 동의 -------------------------------------------------------------------

  /**
   * 부모님께 보낼 동의 링크.
   *
   * 링크가 가리키는 곳은 이 서버가 직접 그리는 웹 페이지다 (`/consent/:token`).
   * 부모님은 앱을 설치하지 않으시므로 카카오톡에서 눌러 바로 읽으실 수 있어야 한다.
   */
  async createConsentLink(userId: string, dto: ConsentDto) {
    const profile = await this.requireOwn(userId);
    const consent = await this.consent.createLink(profile.id, dto);
    return {
      url: `${this.publicBaseUrl()}/consent/${consent.token}`,
      parentName: consent.parent_name as string,
      expiresAt: consent.expires_at as string,
    };
  }

  /**
   * 부모님이 여실 링크의 주소.
   *
   * 카카오톡으로 나가는 링크라 **바깥에서 닿는 주소**여야 한다 — localhost 나
   * 10.0.2.2 를 보내면 부모님 폰에서 열리지 않는다. 그래서 서버 환경변수로
   * 받는다 (개발 중에는 터널 주소).
   */
  private publicBaseUrl(): string {
    const url = process.env.PUBLIC_BASE_URL;
    if (!url) {
      throw new BadRequestException({
        code: 'public_url_missing',
        message: '동의 링크 주소가 설정되지 않았습니다',
      });
    }
    return url.replace(/\/$/, '');
  }

  async revokeConsent(userId: string): Promise<ParentProfileDto> {
    const profile = await this.requireOwn(userId);
    await this.consent.revoke(profile.id);
    return (await this.findByUser(userId))!;
  }

  // --- 제출·공개 ---------------------------------------------------------------

  async submit(userId: string): Promise<ParentProfileDto> {
    const profile = await this.requireOwn(userId);
    const dto = await this.toDto(profile);

    if (!dto.badges.consent) {
      throw new BadRequestException(domainError(ERROR_CODES.CONSENT_REQUIRED));
    }
    if (!dto.submittable) {
      throw new BadRequestException({
        ...domainError(ERROR_CODES.PROFILE_INCOMPLETE),
        missing: dto.missing,
      });
    }

    await this.review.submitAndAutoApprove(profile.id);
    return (await this.findByUser(userId))!;
  }

  /**
   * 공개/중단. 동의가 없으면 공개로 올릴 수 없다 —
   * 철회 후 다시 켜지는 경로를 막는 마지막 잠금이다.
   */
  async setVisibility(userId: string, visible: boolean): Promise<ParentProfileDto> {
    const profile = await this.requireOwn(userId);

    if (visible) {
      if (!(await this.consent.hasConsent(profile.id))) {
        throw new BadRequestException(domainError(ERROR_CODES.CONSENT_REQUIRED));
      }
      const latestReview = await this.review.getLatest(profile.id);
      if (latestReview?.status !== 'approved') {
        throw new BadRequestException(domainError(ERROR_CODES.REVIEW_IN_PROGRESS));
      }
    }

    await this.supabase
      .getClient()
      .from('parent_profiles')
      .update({
        status: visible ? 'published' : 'hidden',
        published_at: visible ? new Date().toISOString() : null,
        ...(visible ? { last_active_at: new Date().toISOString() } : {}),
      })
      .eq('id', profile.id)
      .eq('user_id', userId);

    return (await this.findByUser(userId))!;
  }

  /** 활동 갱신 — 60일 미활동 자동 비공개(TODO-11)의 기준값 */
  async touchActivity(userId: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('parent_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  // --- 내부 -------------------------------------------------------------------

  private assertGoals(goals: RelationshipGoal[]) {
    if (goals.length > MAX_RELATIONSHIP_GOALS) {
      throw new BadRequestException(domainError(ERROR_CODES.GOALS_MAX));
    }
    if (goals.includes('undecided') && goals.length > 1) {
      throw new BadRequestException(domainError(ERROR_CODES.GOALS_UNDECIDED_ALONE));
    }
  }

  private async assertRegionExists(code: string) {
    const { data } = await this.supabase
      .getClient()
      .from('regions')
      .select('code')
      .eq('code', code)
      .maybeSingle();
    if (!data) throw new BadRequestException(domainError(ERROR_CODES.INVALID_REGION));
  }

  private async replaceGoals(profileId: string, goals: RelationshipGoal[]) {
    const client = this.supabase.getClient();
    await client.from('relationship_goals').delete().eq('parent_profile_id', profileId);
    if (!goals.length) return;
    const { error } = await client
      .from('relationship_goals')
      .insert(goals.map((goal) => ({ parent_profile_id: profileId, goal })));
    if (error) throw this.translate(error);
  }

  private async upsertSaju(profileId: string, saju: NonNullable<UpdateParentProfileDto['saju']>) {
    await this.supabase
      .getClient()
      .from('saju_infos')
      .upsert(
        {
          parent_profile_id: profileId,
          birth_date: saju.birthDate,
          calendar_type: saju.calendarType,
          birth_time: saju.birthTimeUnknown ? null : saju.birthTime ?? null,
          birth_time_unknown: saju.birthTimeUnknown,
          is_public: saju.isPublic,
        },
        { onConflict: 'parent_profile_id' }
      );
  }

  private async toDto(row: Record<string, any>): Promise<ParentProfileDto> {
    const client = this.supabase.getClient();

    // 인증 상태는 더 이상 배지에 쓰지 않는다 — 프로필을 만들 수 있었다는 것이
    // 이미 본인인증을 마쳤다는 뜻이라 늘 같은 값이었다
    const [goalsRes, photoRows, sajuRes, regionRes, consent, review] =
      await Promise.all([
        client.from('relationship_goals').select('goal').eq('parent_profile_id', row.id),
        client
          .from('parent_photos')
          .select('*')
          .eq('parent_profile_id', row.id)
          .order('sort_order', { ascending: true }),
        client.from('saju_infos').select('*').eq('parent_profile_id', row.id).maybeSingle(),
        client.from('regions').select('sido, sigungu').eq('code', row.region_code).maybeSingle(),
        this.consent.getActive(row.id),
        this.review.getLatest(row.id),
      ]);

    const goals = (goalsRes.data ?? []).map((g: { goal: RelationshipGoal }) => g.goal);
    const photos = await this.photos.toDtos(photoRows.data ?? []);
    const saju = sajuRes.data;
    const region = regionRes.data
      ? formatRegion(regionRes.data.sido, regionRes.data.sigungu)
      : '';

    const badges = {
      consent: !!consent?.consented_at && !consent?.revoked_at,
      review: review?.status === 'approved',
    };

    // 제출 필수 항목. 화면 검증과 같은 목록이지만 여기가 진짜 관문이다 —
    // 클라이언트를 우회해 PATCH → submit 을 직접 부르는 경로도 여기서 막힌다.
    const missing: string[] = [];
    if (!row.nickname) missing.push('nickname');
    if (photos.length < MIN_PROFILE_PHOTOS) missing.push('photos');
    if (!row.intro_by_child) missing.push('introByChild');
    if (!row.desired_partner) missing.push('desiredPartner');
    if (!goals.length) missing.push('goals');
    if (!row.height_cm) missing.push('heightCm');
    if (!row.children_count) missing.push('childrenCount');
    if (!row.living_with) missing.push('livingWith');
    if (!row.religion) missing.push('religion');
    if (!row.occupation && !row.retired_occupation) missing.push('occupation');
    if (!row.drinking) missing.push('drinking');
    if (!row.smoking) missing.push('smoking');
    if (!row.hobbies?.length) missing.push('hobbies');
    if (!badges.consent) missing.push('consent');

    return {
      id: row.id,
      displayName: row.display_name,
      nickname: row.nickname ?? '',
      gender: row.gender,
      birthDate: row.birth_date,
      age: calcAge(row.birth_date),
      regionCode: row.region_code,
      region,
      maritalStatus: row.marital_status,
      maritalSince: row.marital_since,
      heightCm: row.height_cm,
      childrenCount: row.children_count,
      livingWith: row.living_with,
      religion: row.religion,
      occupation: row.occupation,
      retiredOccupation: row.retired_occupation,
      economicallyActive: row.economically_active,
      drinking: row.drinking,
      smoking: row.smoking,
      hobbies: row.hobbies ?? [],
      motto: row.motto,
      introByChild: row.intro_by_child,
      desiredPartner: row.desired_partner,
      parentMessage: row.parent_message,
      goals,
      photos,
      saju: saju
        ? {
            birthDate: saju.birth_date,
            calendarType: saju.calendar_type,
            birthTime: saju.birth_time,
            birthTimeUnknown: saju.birth_time_unknown,
            isPublic: saju.is_public,
          }
        : null,
      status: row.status,
      publishedAt: row.published_at,
      // 공개 전에는 코드를 숨긴다 — 넣어도 안 들어가는 코드를 알려주면 문의만 는다
      accessCode: row.status === 'published' ? (row.access_code ?? null) : null,
      consent: consent
        ? {
            method: consent.method,
            parentName: consent.parent_name,
            consentedAt: consent.consented_at,
            revokedAt: consent.revoked_at,
          }
        : null,
      review: review
        ? {
            status: review.status,
            rejectReason: review.reject_reason,
            reviewedAt: review.reviewed_at,
          }
        : null,
      badges,
      submittable: missing.length === 0,
      missing,
    };
  }

  /** Postgres 트리거가 올린 도메인 규칙 위반을 클라이언트가 아는 코드로 바꾼다 */
  private translate(error: { message: string }) {
    const message = error.message ?? '';
    if (message.includes('PARENT_MIN_AGE')) {
      return new BadRequestException(domainError(ERROR_CODES.PARENT_MIN_AGE));
    }
    if (message.includes('GOALS_MAX_2')) {
      return new BadRequestException(domainError(ERROR_CODES.GOALS_MAX));
    }
    if (message.includes('GOALS_UNDECIDED_ALONE')) {
      return new BadRequestException(domainError(ERROR_CODES.GOALS_UNDECIDED_ALONE));
    }
    return new BadRequestException({ code: 'profile_write_failed', message });
  }
}
