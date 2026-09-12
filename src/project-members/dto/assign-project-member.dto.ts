import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * `role` is a controlled string, NOT a final enum — SCHEMA.md §52 requires an
 * explicit role but forbids locking an exhaustive enum before Product finalizes
 * the list. Validation is intentionally limited to basic string checks.
 */
export class AssignProjectMemberDto {
  @IsUUID('4', { message: 'memberId harus berupa UUID v4 yang valid.' })
  memberId: string;

  @IsString({ message: 'role harus berupa teks string.' })
  @IsNotEmpty({ message: 'role tidak boleh kosong (SCHEMA.md §53: role attribution wajib eksplisit).' })
  @MaxLength(100, { message: 'role maksimal 100 karakter.' })
  role: string;
}
