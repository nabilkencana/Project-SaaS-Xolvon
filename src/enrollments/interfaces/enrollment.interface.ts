export type EnrollmentStatus = 'active' | 'revoked' | 'expired';

export interface EnrollmentRow {
  readonly id: string;
  readonly user_id: string;
  readonly course_id: string;
  readonly order_id: string | null;
  readonly status: EnrollmentStatus;
  readonly granted_at: string;
  readonly granted_by: string | null;
  readonly revoked_at: string | null;
  readonly expires_at: string | null;
  readonly created_at: string;
  // Optional course join fields for display
  readonly course_title?: string | null;
  readonly course_slug?: string | null;
}
