import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../interfaces/user.interface';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access to specific user roles (e.g. `@Roles('admin')`).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
