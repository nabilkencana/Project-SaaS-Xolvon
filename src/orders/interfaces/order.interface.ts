export type OrderStatus =
  | 'pending'
  | 'awaiting_verification'
  | 'paid'
  | 'cancelled';

export interface OrderRow {
  readonly id: string;
  readonly user_id: string;
  readonly status: OrderStatus;
  readonly amount: number;
  readonly notes: string;
  readonly verified_by: string | null;
  readonly verified_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
