import type { EnrollmentRow } from '../interfaces/enrollment.interface';
import { EnrollmentResponseDto } from '../dto/enrollment-response.dto';

export function toEnrollmentResponse(row: EnrollmentRow): EnrollmentResponseDto {
  return new EnrollmentResponseDto({
    id: row.id,
    courseId: row.course_id,
    orderId: row.order_id,
    status: row.status,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    courseTitle: row.course_title ?? null,
    courseSlug: row.course_slug ?? null,
  });
}
