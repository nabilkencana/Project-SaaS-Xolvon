import { ApiProperty } from '@nestjs/swagger';
import type { EnrollmentStatus } from '../interfaces/enrollment.interface';

export class EnrollmentResponseDto {
  @ApiProperty({ description: 'Enrollment id (UUID v4).' })
  readonly id: string;

  @ApiProperty({ description: 'Enrolled course id (UUID v4).' })
  readonly courseId: string;

  @ApiProperty({ type: String, nullable: true, description: 'Originating order id.' })
  readonly orderId: string | null;

  @ApiProperty({ enum: ['active', 'revoked', 'expired'] satisfies [EnrollmentStatus, ...EnrollmentStatus[]] })
  readonly status: EnrollmentStatus;

  @ApiProperty({ description: 'ISO 8601 timestamp.' })
  readonly grantedAt: string;

  @ApiProperty({ type: String, nullable: true, description: 'ISO 8601 timestamp.' })
  readonly expiresAt: string | null;

  @ApiProperty({ description: 'ISO 8601 timestamp.' })
  readonly createdAt: string;

  @ApiProperty({ type: String, nullable: true, required: false })
  readonly courseTitle?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  readonly courseSlug?: string | null;

  constructor(partial: Partial<EnrollmentResponseDto>) {
    Object.assign(this, partial);
  }
}
