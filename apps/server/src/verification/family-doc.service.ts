import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { SubmitFamilyDocDto } from './dto/verification.dto';
import {
  type FamilyDocExtraction,
  type FamilyDocMime,
  FamilyDocReaderService,
} from './family-doc-reader.service';

const BUCKET = 'family-docs';

/** 표의 '구분' 칸에서 부모로 읽는 값 */
const PARENT_RELATIONS = new Set(['부', '모', '부친', '모친', '아버지', '어머니', '아버님', '어머님']);

export type FamilyDocStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface FamilyDocResult {
  status: 'approved' | 'rejected';
  rejectReason: string | null;
}

/**
 * 가족관계증명서 — **올리면 통과, 적발되면 제한** (2026-09-18 소유자 결정).
 *
 * 사람이 보는 심사는 없다. 증명서를 올리는 순간 승인되고 등록이 이어진다.
 * 대신 사진을 **비공개 버킷에 보관**해서, 신고가 들어오거나 사칭이 의심될 때
 * 운영자가 열어 보고 사실과 다르면 계정을 제한한다 (`family_doc_status` 를
 * `rejected` 로 두고 프로필을 `hidden` 으로). 보관은 그 확인을 위한 것이다.
 *
 * 왜 이렇게 하나: 사업자·본인인증 없이는 어떤 서류도 사칭을 완전히 못 막는다.
 * 그렇다고 등록하는 자녀 전부를 심사에 세우면 아무도 통과하지 못한 채 서비스가
 * 멈춘다. "제출은 쉽게, 거짓이면 책임" 이 지금 조건에서 가장 정직한 선이다.
 *
 * 선택 기능: 서버에 `ANTHROPIC_API_KEY` 가 있으면 Claude 로 표를 읽어 자녀 성함·
 * 부모 성함·생년월일을 프로필과 대조하고, 안 맞으면 반려한다. 키가 없으면 이
 * 단계는 건너뛰고 바로 승인한다.
 */
@Injectable()
export class FamilyDocService {
  private readonly logger = new Logger(FamilyDocService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly reader: FamilyDocReaderService
  ) {}

  /** 제출은 언제나 받는다 — AI 대조는 켜져 있을 때만 얹힌다 */
  get available(): boolean {
    return true;
  }

  async submit(userId: string, dto: SubmitFamilyDocDto): Promise<FamilyDocResult> {
    const client = this.supabase.getClient();

    // 남의 폴더를 가리키는 경로는 받지 않는다 — 버킷 RLS 와 같은 규칙을 서버도 지킨다
    if (!dto.storagePath.startsWith(`${userId}/`)) {
      throw new BadRequestException({ code: 'family_doc_path', message: '잘못된 파일 경로입니다' });
    }

    const { data: profile } = await client
      .from('parent_profiles')
      .select('display_name, birth_date')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile) {
      throw new BadRequestException({
        code: 'family_doc_profile_required',
        message: '부모님 기본 정보를 먼저 입력해주세요',
      });
    }

    const reason = this.reader.configured
      ? await this.aiReview(dto, {
          childName: dto.childName,
          parentName: profile.display_name as string,
          parentBirthDate: profile.birth_date as string,
        })
      : null;

    const now = new Date().toISOString();
    const { error } = await client.from('child_verifications').upsert(
      {
        user_id: userId,
        family_doc_status: reason ? 'rejected' : 'approved',
        // 승인된 증명서는 남긴다 — 나중에 사람이 확인하는 근거다. 반려면 바로 지운다
        family_doc_path: reason ? null : dto.storagePath,
        family_verified_at: reason ? null : now,
        reject_reason: reason,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );
    if (error) throw new BadRequestException({ code: 'family_doc_save_failed', message: error.message });

    if (reason) await this.discard(dto.storagePath);

    this.logger.log(
      `family doc ${reason ? 'rejected' : 'approved'} for ${userId} (${this.reader.configured ? 'ai' : 'auto'})`
    );
    return { status: reason ? 'rejected' : 'approved', rejectReason: reason };
  }

  /** Claude 로 표를 읽어 대조한다. 반려 사유를 돌려주고 통과면 null */
  private async aiReview(
    dto: SubmitFamilyDocDto,
    expected: { childName: string; parentName: string; parentBirthDate: string }
  ): Promise<string | null> {
    const client = this.supabase.getClient();
    const { data: file, error } = await client.storage.from(BUCKET).download(dto.storagePath);
    if (error || !file) {
      throw new BadRequestException({
        code: 'family_doc_missing',
        message: '증명서 파일을 찾지 못했습니다. 다시 올려주세요.',
      });
    }

    const mediaType = toMime(file.type);
    if (!mediaType) {
      await this.discard(dto.storagePath);
      throw new BadRequestException({
        code: 'family_doc_type',
        message: 'JPG·PNG 사진만 올릴 수 있습니다',
      });
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    const extraction = await this.reader.read(base64, mediaType);
    return judge(extraction, expected);
  }

  private async discard(path: string): Promise<void> {
    const { error } = await this.supabase.getClient().storage.from(BUCKET).remove([path]);
    if (error) this.logger.warn(`family doc remove failed: ${path} — ${error.message}`);
  }
}

/**
 * 대조. 반려 사유를 돌려주고, 통과면 null.
 *
 * 사유는 사용자가 읽고 고칠 수 있는 말로 쓴다 — "불일치" 만 돌려주면 무엇을
 * 다시 찍어야 하는지 모른다.
 */
export function judge(
  doc: FamilyDocExtraction,
  expected: { childName: string; parentName: string; parentBirthDate: string }
): string | null {
  if (!doc.isFamilyCertificate) {
    return doc.readingProblem
      ? `가족관계증명서로 확인되지 않았습니다 (${doc.readingProblem})`
      : '가족관계증명서로 확인되지 않았습니다. 증명서 전체가 나오게 다시 찍어주세요.';
  }

  if (normalizeName(doc.subject.name) !== normalizeName(expected.childName)) {
    return `증명서의 본인 성함(${doc.subject.name || '읽지 못함'})이 입력하신 성함과 다릅니다. 자녀 본인 기준으로 발급된 증명서를 올려주세요.`;
  }

  const parents = doc.members.filter((m) => PARENT_RELATIONS.has(m.relation.replace(/\s/g, '')));
  if (!parents.length) {
    return '증명서에서 부모 항목을 찾지 못했습니다. 가족사항 표가 보이게 찍어주세요.';
  }

  const byName = parents.filter((m) => normalizeName(m.name) === normalizeName(expected.parentName));
  if (!byName.length) {
    return `증명서의 부모 성함과 등록하신 부모님 성함(${expected.parentName})이 다릅니다.`;
  }

  const match = byName.some((m) => sameDate(m.birthDate, expected.parentBirthDate));
  if (!match) {
    return '증명서의 부모 생년월일이 등록하신 부모님 생년월일과 다릅니다. 생년월일을 확인해주세요.';
  }

  return null;
}

/** 공백·한자·괄호를 걷어낸 한글만 비교한다 — "홍 길 동", "홍길동(洪吉童)" 이 같은 사람이어야 한다 */
function normalizeName(name: string): string {
  return name.replace(/\(.*?\)/g, '').replace(/[^가-힣]/g, '');
}

/** "1958-04-11", "1958.04.11", "1958년 04월 11일" 을 같은 날로 본다 */
function sameDate(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '');
  const db = b.replace(/\D/g, '');
  return da.length === 8 && da === db;
}

function toMime(type: string): FamilyDocMime | null {
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/webp') return 'image/webp';
  return null;
}
