import { randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { domainError, ERROR_CODES } from '../common/constants/errors';
import { maskName } from '../common/privacy';
import { ConnectionsService } from '../connections/connections.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ParentInboxItemDto,
  ParentInterestResponse,
  ParentLoginResponse,
  ParentProfileDetailDto,
} from './dto/parent.dto';

const publicName = (row: { nickname?: string | null; display_name: string }) =>
  row.nickname || maskName(row.display_name);

@Injectable()
export class ParentService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly discovery: DiscoveryService,
    private readonly connections: ConnectionsService
  ) {}

  /**
   * 코드로 로그인.
   *
   * 공개된 프로필만 받는다 — 검수 전이거나 공개를 내린 프로필의 코드로는
   * 들어올 수 없다. 코드가 틀렸는지 프로필이 안 열렸는지는 구분해서 알려주지
   * 않는다 (남의 코드를 넣어보며 상태를 알아내는 걸 막는다).
   */
  async login(code: string): Promise<ParentLoginResponse> {
    const client = this.supabase.getClient();

    const { data: profile } = await client
      .from('parent_profiles')
      .select('id, status, display_name, nickname')
      .eq('access_code', code.toUpperCase())
      .maybeSingle();

    if (!profile || profile.status !== 'published') {
      throw new NotFoundException({
        code: 'parent_code_invalid',
        message: '코드를 확인해 주세요. 자녀분께 다시 여쭤보시면 됩니다.',
      });
    }

    const token = randomBytes(32).toString('base64url');
    const { error } = await client
      .from('parent_sessions')
      .insert({ token, parent_profile_id: profile.id });
    if (error) {
      throw new BadRequestException({ code: 'parent_login_failed', message: error.message });
    }

    return { token, nickname: publicName(profile) };
  }

  async logout(token: string): Promise<void> {
    await this.supabase.getClient().from('parent_sessions').delete().eq('token', token);
  }

  /**
   * 자녀가 보내준 프로필 목록.
   *
   * 부모님 화면의 전부다. 여기 없는 건 부모님이 볼 수 없다 — 추천 피드도,
   * 대화도, 다른 사람의 프로필도. 자녀가 골라서 건넨 것만 본다.
   */
  async inbox(parentProfileId: string): Promise<ParentInboxItemDto[]> {
    const client = this.supabase.getClient();

    const { data: me } = await client
      .from('parent_profiles')
      .select('id, user_id, region_code')
      .eq('id', parentProfileId)
      .maybeSingle();
    if (!me) throw new NotFoundException(domainError(ERROR_CODES.PROFILE_NOT_FOUND));

    // 내 자녀가 나에게 공유한 인연들
    const { data: shares } = await client
      .from('parent_shares')
      .select('connection_id, shared_at, parent_viewed_at')
      .eq('user_id', me.user_id)
      .order('shared_at', { ascending: false });
    if (!shares?.length) return [];

    const connectionIds = shares.map((s) => s.connection_id as string);
    const { data: connections } = await client
      .from('connections')
      .select('id, status, user_a_id, user_b_id, parent_profile_a_id, parent_profile_b_id')
      .in('id', connectionIds)
      .neq('status', 'ended');
    if (!connections?.length) return [];

    const partnerProfileIdBy = new Map(
      connections.map((c) => [
        c.id as string,
        (c.parent_profile_a_id === parentProfileId
          ? c.parent_profile_b_id
          : c.parent_profile_a_id) as string,
      ])
    );

    const { data: profiles } = await client
      .from('parent_profiles')
      .select('*')
      .in('id', [...new Set(partnerProfileIdBy.values())])
      .eq('status', 'published');
    if (!profiles?.length) return [];

    const items = await this.discovery.toItems(profiles, me.region_code ?? '');
    const itemById = new Map(profiles.map((p, i) => [p.id as string, items[i]]));

    // 양쪽 부모님의 결정 + 상대 연락처를 한 번에 모은다
    const { data: interests } = await client
      .from('parent_interests')
      .select('connection_id, parent_profile_id, kind')
      .in('connection_id', connectionIds);

    const contacts = await this.contactsByProfileId([...partnerProfileIdBy.values()]);

    return shares
      .filter((s) => partnerProfileIdBy.has(s.connection_id as string))
      .map((share) => {
        const connectionId = share.connection_id as string;
        const partnerProfileId = partnerProfileIdBy.get(connectionId)!;
        const profile = itemById.get(partnerProfileId);
        if (!profile) return null;

        const mine = (interests ?? []).find(
          (i) => i.connection_id === connectionId && i.parent_profile_id === parentProfileId
        );
        const theirs = (interests ?? []).find(
          (i) => i.connection_id === connectionId && i.parent_profile_id === partnerProfileId
        );
        const matched = mine?.kind === 'interested' && theirs?.kind === 'interested';
        const contact = contacts.get(partnerProfileId);

        return {
          connectionId,
          profile,
          sharedAt: share.shared_at as string,
          unseen: !share.parent_viewed_at,
          interested: mine?.kind === 'interested',
          matched,
          // 매칭 전에는 연락처를 응답에 싣지도 않는다
          partnerPhone: matched ? (contact?.phone ?? null) : null,
          partnerName: matched ? (contact?.name ?? null) : null,
        } satisfies ParentInboxItemDto;
      })
      .filter((item): item is ParentInboxItemDto => item !== null);
  }

  /**
   * 한 장 상세 — 목록 카드보다 훨씬 많이 담는다.
   *
   * 부모님은 이 화면 하나로 판단하신다. 자녀처럼 여러 사람을 빠르게 훑는
   * 화면이 아니라 아낄 이유가 없다. 사진 전부, 소개글 전부, 생활 정보까지 준다.
   *
   * `getPublicProfile` 을 그대로 재사용한다 — 자녀가 보는 것과 다른 내용이
   * 부모님께 가면 두 분이 다른 사람을 두고 이야기하게 된다.
   */
  async detail(
    parentProfileId: string,
    connectionId: string
  ): Promise<ParentProfileDetailDto> {
    const { partnerProfileId } = await this.requireShared(parentProfileId, connectionId);
    const childUserId = await this.childUserId(parentProfileId);

    const [profile, items] = await Promise.all([
      this.discovery.getPublicProfile(childUserId, parentProfileId, partnerProfileId),
      this.inbox(parentProfileId),
    ]);

    const card = items.find((i) => i.connectionId === connectionId);
    if (!card) throw new NotFoundException(domainError(ERROR_CODES.CONNECTION_NOT_FOUND));

    return { ...card, profile };
  }

  /** 부모님이 카드를 열었다 — 초록 강조를 끈다 */
  async markViewed(parentProfileId: string, connectionId: string): Promise<void> {
    const client = this.supabase.getClient();
    const userId = await this.childUserId(parentProfileId);

    await client
      .from('parent_shares')
      .update({ parent_viewed_at: new Date().toISOString() })
      .eq('connection_id', connectionId)
      .eq('user_id', userId)
      .is('parent_viewed_at', null);
  }

  /**
   * "대화해보고 싶어요".
   *
   * 양쪽 부모님이 모두 누른 순간 매칭이 성립하고 그때 **처음으로** 서로의
   * 연락처가 열린다. 한쪽만 눌렀을 때는 상대에게 알리지도 않는다 — 거절이
   * 드러나지 않아야 두 분 다 편하게 결정한다.
   */
  async express(parentProfileId: string, connectionId: string): Promise<ParentInterestResponse> {
    const client = this.supabase.getClient();
    const { partnerProfileId } = await this.requireShared(parentProfileId, connectionId);

    const { error } = await client.from('parent_interests').upsert(
      { connection_id: connectionId, parent_profile_id: parentProfileId, kind: 'interested' },
      { onConflict: 'connection_id,parent_profile_id' }
    );
    if (error) {
      throw new BadRequestException({ code: 'parent_interest_failed', message: error.message });
    }

    const { data: theirs } = await client
      .from('parent_interests')
      .select('kind')
      .eq('connection_id', connectionId)
      .eq('parent_profile_id', partnerProfileId)
      .maybeSingle();

    if (theirs?.kind !== 'interested') {
      return { matched: false, partnerPhone: null, partnerName: null, partnerNickname: null };
    }

    // 양쪽이 원했다 — 여기가 이 서비스의 목적지다
    await this.connections.setStatus(connectionId, 'matched');

    const contacts = await this.contactsByProfileId([partnerProfileId]);
    const contact = contacts.get(partnerProfileId);
    return {
      matched: true,
      partnerPhone: contact?.phone ?? null,
      partnerName: contact?.name ?? null,
      partnerNickname: contact?.nickname ?? null,
    };
  }

  /**
   * "다른 프로필 볼래요" — 영구 삭제.
   *
   * 인연을 끝낸다. 부모님이 아니라고 하신 관계를 자녀 화면에 남겨 두면 자녀가
   * 계속 붙들고 있게 된다. 되돌릴 수 없다고 화면에서 먼저 확인받는다.
   */
  async decline(parentProfileId: string, connectionId: string): Promise<void> {
    const client = this.supabase.getClient();
    await this.requireShared(parentProfileId, connectionId);

    await client.from('parent_interests').upsert(
      { connection_id: connectionId, parent_profile_id: parentProfileId, kind: 'declined' },
      { onConflict: 'connection_id,parent_profile_id' }
    );

    await client
      .from('connections')
      .update({
        status: 'ended',
        ended_reason: 'parent_declined',
        ended_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .neq('status', 'ended');
  }

  // --- 내부 --------------------------------------------------------------------

  private async childUserId(parentProfileId: string): Promise<string> {
    const { data } = await this.supabase
      .getClient()
      .from('parent_profiles')
      .select('user_id')
      .eq('id', parentProfileId)
      .maybeSingle();
    if (!data) throw new NotFoundException(domainError(ERROR_CODES.PROFILE_NOT_FOUND));
    return data.user_id as string;
  }

  /**
   * 이 인연이 **내 자녀가 나에게 공유한 것**인지 확인한다.
   *
   * connectionId 만 알면 남의 인연에 결정을 남길 수 있는 IDOR 를 여기서 막는다.
   */
  private async requireShared(
    parentProfileId: string,
    connectionId: string
  ): Promise<{ partnerProfileId: string }> {
    const client = this.supabase.getClient();
    const userId = await this.childUserId(parentProfileId);

    const { data: share } = await client
      .from('parent_shares')
      .select('connection_id')
      .eq('connection_id', connectionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!share) throw new NotFoundException(domainError(ERROR_CODES.CONNECTION_NOT_FOUND));

    const { data: connection } = await client
      .from('connections')
      .select('parent_profile_a_id, parent_profile_b_id')
      .eq('id', connectionId)
      .maybeSingle();
    if (!connection) throw new NotFoundException(domainError(ERROR_CODES.CONNECTION_NOT_FOUND));

    return {
      partnerProfileId: (connection.parent_profile_a_id === parentProfileId
        ? connection.parent_profile_b_id
        : connection.parent_profile_a_id) as string,
    };
  }

  /**
   * 부모님 연락처 — `parent_consents.phone`.
   *
   * 자녀 인증 전화번호가 아니다. 동의를 받을 때 적은 **부모님 본인 번호**여야
   * 두 분이 직접 통화하실 수 있다.
   */
  private async contactsByProfileId(
    profileIds: string[]
  ): Promise<Map<string, { phone: string | null; name: string; nickname: string }>> {
    if (!profileIds.length) return new Map();
    const client = this.supabase.getClient();

    const [{ data: profiles }, { data: consents }] = await Promise.all([
      client.from('parent_profiles').select('id, display_name, nickname').in('id', profileIds),
      client
        .from('parent_consents')
        .select('parent_profile_id, parent_name, phone, consented_at')
        .in('parent_profile_id', profileIds)
        .not('consented_at', 'is', null)
        .is('revoked_at', null),
    ]);

    const consentBy = new Map(
      (consents ?? []).map((c) => [c.parent_profile_id as string, c])
    );

    return new Map(
      (profiles ?? []).map((p) => {
        const consent = consentBy.get(p.id as string);
        return [
          p.id as string,
          {
            phone: (consent?.phone as string | undefined) ?? null,
            name: (consent?.parent_name as string | undefined) ?? p.display_name,
            nickname: publicName(p),
          },
        ];
      })
    );
  }
}
