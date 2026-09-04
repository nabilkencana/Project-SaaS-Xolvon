import type { EnrollmentStatus } from '../interfaces/enrollment.interface';

export class EnrollmentResponseDto {
  readonly id: string;
  readonly courseId: string;
  readonly orderId: string | null;
  readonly status: EnrollmentStatus;
  readonly grantedAt: string;
  readonly expiresAt: string | null;
  readonly createdAt: string;
  readonly courseTitle?: string | null;
  readonly courseSlug?: string | null;

  constructor(partial: Partial<EnrollmentResponseDto>) {
    Object.assign(this, partial);
  }
}
