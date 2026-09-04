/**
 * Raw row shape stored in Cloudflare D1 `sessions` table.
 */
export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
