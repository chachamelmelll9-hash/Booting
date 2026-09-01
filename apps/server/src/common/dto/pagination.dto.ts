import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  /** 직전 페이지 마지막 항목의 커서 (created_at ISO 문자열) */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function toPage<T extends { cursor?: string }>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string
): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasMore && items.length ? cursorOf(items[items.length - 1]) : null,
  };
}
