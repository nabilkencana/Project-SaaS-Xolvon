import type { UserRow } from '../interfaces/user.interface';
import type { SafeUserDto } from '../dto/user-response.dto';

/**
 * Pure mapping function that strips `password_hash` and converts SQLite integer
 * boolean flags (0/1) to JavaScript booleans.
 */
export function toSafeUser(row: UserRow): SafeUserDto {
  const { password_hash: _excludedPasswordHash, ...safeFields } = row;

  return {
    ...safeFields,
    email_verified: Boolean(safeFields.email_verified),
    phone_verified: Boolean(safeFields.phone_verified),
  };
}
