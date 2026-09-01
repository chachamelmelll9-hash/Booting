import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { maskName } from '../common/privacy';
import { SupabaseService } from '../supabase/supabase.service';
import { BlockDto, CreateReportDto, ReportDto } from './dto/safety.dto';

/** 공개 표기는 별명을 쓰고, 별명이 없는 옛 데이터만 마스킹으로 폴백한다 */
const publicName = (row: { nickname?: string | null; display_name: string }) =>
  row.nickname || maskName(row.display_name);

@Injectable()
export class SafetyService {
  constructor(private readonly supabase: SupabaseService) {}

  private async profileOwner(profileId: string) {
    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select('id, user_id, display_name, nickname')
      .eq('id', profileId)
      .maybeSingle();
    if (!data) throw new NotFoundException(domainError(ERROR_CODES.PROFILE_NOT_FOUND));
    return data;
  }

  // --- 신고 -------------------------------------------------------------------

  async report(userId: string, dto: CreateReportDto): Promise<ReportDto> {
    const target = await this.profileOwner(dto.targetProfileId);

    const { data, error } = await this.supabase
      .getClient()
      .from('reports')
      .insert({
        reporter_user_id: userId,
        target_user_id: target.user_id,
        target_parent_profile_id: target.id,
        reason: dto.reason,
        detail: dto.detail ?? null,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException({ code: 'report_failed', message: error.message });

    return {
      id: data.id,
      reason: data.reason,
      detail: data.detail,
      status: data.status,
      createdAt: data.created_at,
      targetNickname: publicName(target),
    };
  }

  async listReports(userId: string): Promise<ReportDto[]> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('reports')
      .select('*')
      .eq('reporter_user_id', userId) // 내가 낸 신고만
      .order('created_at', { ascending: false });

    const rows = data ?? [];
    if (!rows.length) return [];

    const profileIds = rows.map((r) => r.target_parent_profile_id).filter(Boolean);
    const { data: profiles } = await client
      .from('parent_profiles')
      .select('id, display_name, nickname')
      .in('id', profileIds.length ? profileIds : ['00000000-0000-0000-0000-000000000000']);

    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, publicName(p)])
    );

    return rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      createdAt: r.created_at,
      targetNickname: nameById.get(r.target_parent_profile_id) ?? '알 수 없음',
    }));
  }

  // --- 차단 -------------------------------------------------------------------

  /**
   * 차단하면 진행 중인 인연도 함께 종료한다.
   * 목록에서만 사라지고 대화가 살아 있으면 차단이 아니다.
   */
  async block(userId: string, targetProfileId: string): Promise<BlockDto> {
    const target = await this.profileOwner(targetProfileId);
    if (target.user_id === userId) {
      throw new BadRequestException(domainError(ERROR_CODES.FORBIDDEN));
    }

    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('blocks')
      .upsert(
        { user_id: userId, blocked_user_id: target.user_id },
        { onConflict: 'user_id,blocked_user_id' }
      )
      .select('*')
      .single();

    if (error) throw new BadRequestException({ code: 'block_failed', message: error.message });

    await client
      .from('connections')
      .update({
        status: 'ended',
        ended_reason: 'blocked',
        ended_at: new Date().toISOString(),
      })
      .or(
        `and(user_a_id.eq.${userId},user_b_id.eq.${target.user_id}),and(user_a_id.eq.${target.user_id},user_b_id.eq.${userId})`
      )
      .neq('status', 'ended');

    return {
      id: data.id,
      nickname: publicName(target),
      createdAt: data.created_at,
    };
  }

  async listBlocks(userId: string): Promise<BlockDto[]> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('blocks')
      .select('id, blocked_user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const rows = data ?? [];
    if (!rows.length) return [];

    const { data: profiles } = await client
      .from('parent_profiles')
      .select('user_id, display_name, nickname')
      .in('user_id', rows.map((r) => r.blocked_user_id));

    const nameByUser = new Map(
      (profiles ?? []).map((p) => [p.user_id, publicName(p)])
    );

    return rows.map((r) => ({
      id: r.id,
      nickname: nameByUser.get(r.blocked_user_id) ?? '알 수 없음',
      createdAt: r.created_at,
    }));
  }

  async unblock(userId: string, blockId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('blocks')
      .delete()
      .eq('id', blockId)
      .eq('user_id', userId); // 소유권 스코프
    if (error) throw new BadRequestException({ code: 'unblock_failed', message: error.message });
  }
}
