import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Reorder payload — order_index drives lesson sequence (SCHEMA.md §167). */
export class ReorderLessonDto {
  @Type(() => Number)
  @IsInt({ message: 'orderIndex harus berupa integer.' })
  @Min(0, { message: 'orderIndex minimal 0.' })
  @Max(1000000, { message: 'orderIndex terlalu besar.' })
  orderIndex: number;
}
