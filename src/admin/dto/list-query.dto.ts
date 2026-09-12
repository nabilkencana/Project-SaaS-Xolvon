import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Admin user list query. Pagination follows the locked contract DL-011:
 * `?page=` 1-based, `?limit=` default 20 max 100, response
 * `{items, page, limit, total}`. `?q=` contains-search over email/name.
 */
export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsString({ message: 'q harus berupa teks string.' })
  @MaxLength(200, { message: 'q maksimal 200 karakter.' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus berupa integer.' })
  @Min(1, { message: 'page minimal 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus berupa integer.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number;
}

/**
 * Admin order list query. Same DL-011 pagination; `?status=` filters the
 * final order status (DL-002: pending | paid | cancelled); `?q=` contains-
 * search over the buyer email.
 */
export class ListAdminOrdersQueryDto {
  @IsOptional()
  @IsIn(['pending', 'paid', 'cancelled'], {
    message: 'status hanya menerima nilai pending, paid, atau cancelled.',
  })
  status?: 'pending' | 'paid' | 'cancelled';

  @IsOptional()
  @IsString({ message: 'q harus berupa teks string.' })
  @MaxLength(200, { message: 'q maksimal 200 karakter.' })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus berupa integer.' })
  @Min(1, { message: 'page minimal 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus berupa integer.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number;
}
