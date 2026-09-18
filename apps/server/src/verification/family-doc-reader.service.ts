import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';

/**
 * 가족관계증명서에서 **읽어낸 것**. 판정은 여기 없다 — 대조는 `FamilyDocService` 가 한다.
 *
 * 왜 나누나: AI 에게 "이 사람이 자녀가 맞나" 를 통째로 물으면 결과를 설명할 수
 * 없다. 읽기만 시키고 이름·생년월일 대조는 코드가 하면, 반려됐을 때 어느 줄이
 * 안 맞았는지 사용자에게 그대로 말해 줄 수 있다.
 */
export const FamilyDocExtraction = z.object({
  /** 대한민국 가족관계증명서(또는 그 상세본)로 보이는가 */
  isFamilyCertificate: z.boolean(),
  /** '본인' 란 — 증명서를 발급받은 사람 */
  subject: z.object({
    name: z.string().describe('한글 이름. 한자·괄호는 뺀다'),
    birthDate: z.string().describe('YYYY-MM-DD. 못 읽었으면 빈 문자열'),
  }),
  /** 가족 사항 표의 각 줄 */
  members: z.array(
    z.object({
      relation: z.string().describe('표의 구분 칸 그대로 (부, 모, 배우자, 자녀 등)'),
      name: z.string().describe('한글 이름. 한자·괄호는 뺀다'),
      birthDate: z.string().describe('YYYY-MM-DD. 못 읽었으면 빈 문자열'),
    })
  ),
  /** 사진이 흐리거나 잘려 못 읽은 부분이 있으면 한 줄로 */
  readingProblem: z.string().describe('없으면 빈 문자열'),
});
export type FamilyDocExtraction = z.infer<typeof FamilyDocExtraction>;

export type FamilyDocMime = 'image/jpeg' | 'image/png' | 'image/webp';

const SYSTEM = `당신은 대한민국 가족관계증명서 사진을 읽어 표의 내용을 그대로 옮겨 적는 판독기입니다.
읽은 것만 적고, 추측으로 채우지 않습니다. 이름의 한자 표기와 괄호는 뺍니다.
주민등록번호는 출력하지 않습니다 — 생년월일(YYYY-MM-DD)만 적습니다.
'본인' 란은 subject 에, '가족사항' 표의 각 줄은 members 에 구분(부·모·배우자·자녀 등)과 함께 적습니다.
가족관계증명서가 아니거나 표를 읽을 수 없으면 isFamilyCertificate 를 false 로 두고 readingProblem 에 이유를 적습니다.`;

/**
 * Claude 비전으로 증명서를 읽는다 — **선택 기능**.
 *
 * `ANTHROPIC_API_KEY` 가 없으면 `configured` 가 false 이고, `FamilyDocService` 는
 * 대조 없이 승인한다 (소유자 결정: 올리면 통과, 적발되면 제한). 키를 넣는 순간
 * 코드 수정 없이 대조가 켜진다.
 */
@Injectable()
export class FamilyDocReaderService {
  private readonly logger = new Logger(FamilyDocReaderService.name);
  private readonly client: Anthropic | null;

  constructor() {
    this.client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
    this.logger.log(
      this.client
        ? '가족관계 AI 대조 켜짐'
        : '가족관계 AI 대조 꺼짐 (ANTHROPIC_API_KEY 없음) — 증명서를 올리면 바로 승인한다'
    );
  }

  get configured(): boolean {
    return this.client !== null;
  }

  async read(imageBase64: string, mediaType: FamilyDocMime): Promise<FamilyDocExtraction> {
    if (!this.client) {
      throw new ServiceUnavailableException({
        code: 'family_review_unavailable',
        message: '가족관계 자동 심사를 준비 중입니다. 잠시 후 다시 시도해주세요.',
      });
    }

    const response = await this.client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4096,
      system: SYSTEM,
      output_config: { effort: 'medium', format: zodOutputFormat(FamilyDocExtraction) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: '이 증명서의 본인 란과 가족사항 표를 읽어 주세요.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      this.logger.warn(`family doc read failed: stop_reason=${response.stop_reason}`);
      throw new ServiceUnavailableException({
        code: 'family_review_failed',
        message: '증명서를 읽지 못했습니다. 사진을 다시 찍어 올려주세요.',
      });
    }
    return response.parsed_output;
  }
}
